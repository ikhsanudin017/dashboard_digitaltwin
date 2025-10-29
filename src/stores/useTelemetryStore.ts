import { defineStore } from 'pinia';
import type { QoS } from 'mqtt-packet';
import { startMockStream, queryHistory } from '@/services/dataService';
import type {
  EnvPoint,
  PowerPoint,
  OccPoint,
  AlertMessage,
  MockHandle,
  HistoryResult
} from '@/services/dataService';
import { mqttService } from '@/services/mqttClient';
import type { MessageHandler } from '@/services/mqttClient';
import { useConfigStore } from '@/stores/useConfigStore';
import type { TelemetryMode } from '@/stores/useConfigStore';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface AlertItem extends AlertMessage {
  id: string;
  acknowledged: boolean;
}

type ReplayStatus = 'idle' | 'playing' | 'paused';

interface ReplayEvent {
  ts: number;
  type: 'env' | 'power' | 'occ';
  payload: EnvPoint | PowerPoint | OccPoint;
}

interface ReplayState {
  status: ReplayStatus;
  speed: number;
  progress: number;
  from: number | null;
  to: number | null;
  events: ReplayEvent[];
  cursor: number;
  startedAt: number | null;
  accumulatedMs: number;
  timerId: ReturnType<typeof setInterval> | null;
  backup: {
    env: EnvPoint[];
    power: PowerPoint[];
    occ: OccPoint[];
  } | null;
}

const MAX_POINTS = 5000;
const DROP_WINDOW_MS = 5 * 60 * 1000;

const defaultReplayState = (): ReplayState => ({
  status: 'idle',
  speed: 1,
  progress: 0,
  from: null,
  to: null,
  events: [],
  cursor: 0,
  startedAt: null,
  accumulatedMs: 0,
  timerId: null,
  backup: null
});

const normalizeTimestamp = (ts: number) => (ts < 10_000_000_000 ? ts * 1000 : ts);

const trimSeries = <T extends { ts: number }>(series: T[], limit = MAX_POINTS) => {
  if (series.length > limit) {
    series.splice(0, series.length - limit);
  }
};

const shouldDropPoint = <T extends { ts: number }>(series: T[], ts: number): boolean => {
  if (series.length === 0) return false;
  const last = series[series.length - 1];
  if (!last) return false;
  return ts < last.ts - DROP_WINDOW_MS;
};

const lastItem = <T>(series: T[]): T | null => {
  if (series.length === 0) return null;
  const value = series[series.length - 1];
  return value === undefined ? null : value;
};

const rollingWindow = <T extends { ts: number }>(
  series: T[],
  currentTs: number,
  windowMs: number
): T[] => {
  const points: T[] = [];
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const point = series[i];
    if (!point) continue;
    if (currentTs - point.ts > windowMs) break;
    points.unshift(point);
  }
  return points;
};

const quantiles = (values: number[]): { q1: number; q2: number; q3: number } => {
  if (values.length === 0) {
    return { q1: 0, q2: 0, q3: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const qIndex = (q: number): number => {
    const position = (sorted.length - 1) * q;
    const base = Math.floor(position);
    const rest = position - base;
    const lowerIndex = Math.max(Math.min(base, sorted.length - 1), 0);
    const upperIndex = Math.max(Math.min(base + 1, sorted.length - 1), 0);
    const lower = sorted[lowerIndex] ?? 0;
    const upper = sorted[upperIndex] ?? lower;
    return lower + rest * (upper - lower);
  };
  return {
    q1: qIndex(0.25),
    q2: qIndex(0.5),
    q3: qIndex(0.75)
  };
};

const makeAlertId = (payload: AlertMessage) =>
  `${payload.type}-${Math.floor(normalizeTimestamp(payload.ts))}`;

export const useTelemetryStore = defineStore('telemetry', {
  state: () => ({
    envSeries: [] as EnvPoint[],
    powerSeries: [] as PowerPoint[],
    occSeries: [] as OccPoint[],
    alerts: [] as AlertItem[],
    mode: (import.meta.env.VITE_DEFAULT_MODE as TelemetryMode) ?? 'mock',
    roomId: import.meta.env.VITE_ROOM_ID ?? 'room-101',
    connected: false,
    connectionStatus: 'disconnected' as ConnectionStatus,
    connectionError: '' as string,
    qosStatus: {
      env: 1 as QoS,
      power: 1 as QoS,
      occ: 0 as QoS
    },
    mockHandle: null as MockHandle | null,
    mqttHandler: null as MessageHandler | null,
    historyBuffer: null as (HistoryResult & { from: number; to: number }) | null,
    replay: defaultReplayState()
  }),
  getters: {
    latestEnv: (state) => lastItem(state.envSeries) ?? null,
    latestPower: (state) => lastItem(state.powerSeries) ?? null,
    latestOcc: (state) => lastItem(state.occSeries) ?? null,
    isReplaying: (state) => state.replay.status !== 'idle',
    replayProgress: (state) => state.replay.progress,
    replayStatus: (state) => state.replay.status,
    replaySpeed: (state) => state.replay.speed
  },
  actions: {
    setMode(mode: TelemetryMode) {
      if (this.mode === mode) return;
      this.mode = mode;
      this.resetSeries();
      this.stopReplay();
    },
    setRoom(roomId: string) {
      this.roomId = roomId;
      this.resetSeries();
      this.stopReplay();
    },
    resetSeries() {
      this.envSeries = [];
      this.powerSeries = [];
      this.occSeries = [];
    },
    clearAlerts() {
      this.alerts = [];
    },
    acknowledgeAlert(id: string) {
      const target = this.alerts.find((alert) => alert.id === id);
      if (target) {
        target.acknowledged = true;
      }
    },
    removeAlert(id: string) {
      this.alerts = this.alerts.filter((alert) => alert.id !== id);
    },
    ingestEnv(payload: EnvPoint, opts?: { fromReplay?: boolean }) {
      const normalized = { ...payload, ts: normalizeTimestamp(payload.ts) };
      if (shouldDropPoint(this.envSeries, normalized.ts)) return;
      this.envSeries.push(normalized);
      trimSeries(this.envSeries);

      if (!opts?.fromReplay) {
        this.evaluateTemperatureRule(normalized);
        this.evaluateHumidityRule(normalized);
      }
    },
    ingestPower(payload: PowerPoint, opts?: { fromReplay?: boolean }) {
      const normalized = { ...payload, ts: normalizeTimestamp(payload.ts) };
      if (shouldDropPoint(this.powerSeries, normalized.ts)) return;
      this.powerSeries.push(normalized);
      trimSeries(this.powerSeries);

      if (!opts?.fromReplay) {
        this.evaluatePowerRule(normalized);
      }
    },
    ingestOcc(payload: OccPoint, _opts?: { fromReplay?: boolean }) {
      const normalized = { ...payload, ts: normalizeTimestamp(payload.ts) };
      if (shouldDropPoint(this.occSeries, normalized.ts)) return;
      this.occSeries.push(normalized);
      trimSeries(this.occSeries);
    },
    ingestAlert(payload: AlertMessage) {
      const id = makeAlertId(payload);
      const exists = this.alerts.some((alert) => alert.id === id);
      if (exists) return;
      this.alerts.unshift({
        ...payload,
        ts: normalizeTimestamp(payload.ts),
        id,
        acknowledged: false
      });
      this.alerts = this.alerts.slice(0, MAX_POINTS);
    },
    evaluateTemperatureRule(point: EnvPoint) {
      const threshold = 29;
      if (point.temp_c <= threshold) return;
      const windowMs = 3 * 60 * 1000;
      const windowPoints = rollingWindow(this.envSeries, point.ts, windowMs);
      if (windowPoints.length < 3) return;
      const oldest = windowPoints[0];
      if (!oldest) return;
      if (point.ts - oldest.ts < windowMs - 10_000) return;
      const allAbove = windowPoints.every((sample) => sample.temp_c > threshold);
      if (!allAbove) return;
      this.ingestAlert({
        ts: point.ts,
        type: 'temperature_high',
        value: Number(point.temp_c.toFixed(1)),
        threshold,
        severity: point.temp_c > threshold + 2 ? 'critical' : 'warning'
      });
    },
    evaluateHumidityRule(point: EnvPoint) {
      const threshold = 75;
      if (point.rh <= threshold) return;
      const windowMs = 5 * 60 * 1000;
      const windowPoints = rollingWindow(this.envSeries, point.ts, windowMs);
      if (windowPoints.length < 5) return;
      const oldest = windowPoints[0];
      if (!oldest) return;
      if (point.ts - oldest.ts < windowMs - 10_000) return;
      const allAbove = windowPoints.every((sample) => sample.rh > threshold);
      if (!allAbove) return;
      this.ingestAlert({
        ts: point.ts,
        type: 'humidity_high',
        value: Number(point.rh.toFixed(1)),
        threshold,
        severity: 'warning'
      });
    },
    evaluatePowerRule(point: PowerPoint) {
      const fifteenMinutes = 15 * 60 * 1000;
      const twoMinutes = 2 * 60 * 1000;
      const recent = rollingWindow(this.powerSeries, point.ts, fifteenMinutes);
      if (recent.length < 6) return;
      const watts = recent.map((sample) => sample.watt);
      const { q1, q2, q3 } = quantiles(watts);
      const iqr = q3 - q1;
      const threshold = q2 + iqr * 3;
      if (point.watt > threshold && this.powerSeries.length > 0) {
        const latest = lastItem(this.powerSeries);
        if (!latest) return;
        const withinTwoMinutes = point.ts >= latest.ts - twoMinutes;
        if (!withinTwoMinutes) return;
        this.ingestAlert({
          ts: point.ts,
          type: 'power_spike',
          value: point.watt,
          threshold: Math.round(threshold),
          severity: point.watt > threshold + 150 ? 'critical' : 'warning'
        });
      }
    },
    async connect(url?: string) {
      const config = useConfigStore();
      const brokerUrl = url ?? config.brokerUrl;
      this.connectionStatus = 'connecting';
      this.connectionError = '';
      this.stopMock();
      if (this.mqttHandler) {
        mqttService.removeHandler(this.mqttHandler);
      }

      const messageHandler: MessageHandler = (topic, message) => {
        if (typeof message !== 'object' || message === null) return;
        const payload = message as Record<string, unknown>;
        if (topic.endsWith('/env')) {
          this.ingestEnv({
            ts: Number(payload.ts),
            temp_c: Number(payload.temp_c),
            rh: Number(payload.rh)
          });
        } else if (topic.endsWith('/power')) {
          this.ingestPower({
            ts: Number(payload.ts),
            watt: Number(payload.watt),
            kwh_total: Number(payload.kwh_total)
          });
        } else if (topic.endsWith('/occupancy')) {
          this.ingestOcc({
            ts: Number(payload.ts),
            count: Number(payload.count),
            confidence: Number(payload.confidence ?? 1)
          });
        } else if (topic.endsWith('/alerts')) {
          this.ingestAlert({
            ts: Number(payload.ts),
            type: String(payload.type ?? 'generic'),
            value: Number(payload.value ?? 0),
            threshold:
              typeof payload.threshold === 'number' ? Number(payload.threshold) : undefined,
            severity: (payload.severity as AlertMessage['severity']) ?? 'info'
          });
        }
      };

      mqttService.addHandler(messageHandler);
      this.mqttHandler = messageHandler;

      try {
        await mqttService.connect({
          url: brokerUrl,
          subscriptions: [
            { topic: `campus/amikom/room/${this.roomId}/env`, qos: 1 },
            { topic: `campus/amikom/room/${this.roomId}/power`, qos: 1 },
            { topic: `campus/amikom/room/${this.roomId}/occupancy`, qos: 0 },
            { topic: `campus/amikom/room/${this.roomId}/alerts`, qos: 0 }
          ]
        });
        this.connected = true;
        this.connectionStatus = 'connected';
        this.mode = 'live';
      } catch (err) {
        this.connectionStatus = 'error';
        this.connectionError = err instanceof Error ? err.message : String(err);
        mqttService.removeHandler(messageHandler);
        this.mqttHandler = null;
      }
    },
    async disconnect() {
      this.connected = false;
      this.connectionStatus = 'disconnected';
      await mqttService.disconnect();
      if (this.mqttHandler) {
        mqttService.removeHandler(this.mqttHandler);
        this.mqttHandler = null;
      }
    },
    startMock() {
      this.stopMock();
      const config = useConfigStore();
      this.mode = 'mock';
      if (this.mqttHandler) {
        mqttService.removeHandler(this.mqttHandler);
        this.mqttHandler = null;
      }
      this.mockHandle = startMockStream(
        this.roomId,
        {
          onEnv: (payload) => this.ingestEnv(payload),
          onPower: (payload) => this.ingestPower(payload),
          onOcc: (payload) => this.ingestOcc(payload),
          onAlert: (payload) => this.ingestAlert(payload)
        },
        {
          seedEnv: lastItem(this.envSeries) ?? undefined,
          seedPower: lastItem(this.powerSeries) ?? undefined,
          seedOcc: lastItem(this.occSeries) ?? undefined
        }
      );
      this.connected = false;
      this.connectionStatus = 'disconnected';
      config.setMode('mock');
    },
    stopMock() {
      this.mockHandle?.stop();
      this.mockHandle = null;
    },
    async loadHistory(from: number, to: number) {
      const result = await queryHistory(this.roomId, from, to, {
        env: lastItem(this.envSeries) ?? undefined,
        power: lastItem(this.powerSeries) ?? undefined,
        occ: lastItem(this.occSeries) ?? undefined
      });
      this.historyBuffer = { ...result, from, to };
      return result;
    },
    startReplay(speed?: number) {
      if (this.replay.status === 'paused') {
        if (speed) {
          this.replay.speed = speed;
        }
        this.resumeReplay();
        return;
      }
      if (!this.historyBuffer) return;
      const { env, power, occ, from, to } = this.historyBuffer;
      if (from >= to) return;

      if (this.replay.status === 'idle') {
        this.replay.backup = {
          env: [...this.envSeries],
          power: [...this.powerSeries],
          occ: [...this.occSeries]
        };
        this.resetSeries();
      }

      if (speed) {
        this.replay.speed = speed;
      }

      const envEvents = env.map<ReplayEvent>((point) => ({
        ts: point.ts,
        type: 'env',
        payload: point
      }));
      const powerEvents = power.map<ReplayEvent>((point) => ({
        ts: point.ts,
        type: 'power',
        payload: point
      }));
      const occEvents = occ.map<ReplayEvent>((point) => ({
        ts: point.ts,
        type: 'occ',
        payload: point
      }));

      const events: ReplayEvent[] = [...envEvents, ...powerEvents, ...occEvents].sort(
        (a, b) => a.ts - b.ts
      );

      this.replay.events = events;
      this.replay.from = from;
      this.replay.to = to;
      this.replay.cursor = 0;
      this.replay.progress = 0;
      this.replay.startedAt = Date.now();
      this.replay.accumulatedMs = 0;
      this.replay.status = 'playing';
      this.applyReplayUntil(from);
      this.startReplayTimer();
    },
    pauseReplay() {
      if (this.replay.status !== 'playing') return;
      const { from, to } = this.replay;
      if (!from || !to || this.replay.startedAt === null) return;
      const elapsed = this.replayElapsed();
      this.replay.accumulatedMs = elapsed;
      this.replay.startedAt = null;
      this.replay.status = 'paused';
      if (this.replay.timerId) {
        clearInterval(this.replay.timerId);
        this.replay.timerId = null;
      }
    },
    resumeReplay() {
      if (this.replay.status !== 'paused') {
        this.startReplay();
        return;
      }
      this.replay.startedAt = Date.now();
      this.replay.status = 'playing';
      this.startReplayTimer();
    },
    stopReplay(restore = true) {
      if (this.replay.timerId) {
        clearInterval(this.replay.timerId);
      }
      const storedBackup = this.replay.backup
        ? {
            env: [...this.replay.backup.env],
            power: [...this.replay.backup.power],
            occ: [...this.replay.backup.occ]
          }
        : null;
      this.replay = {
        ...defaultReplayState(),
        backup: null
      };

      if (restore && storedBackup) {
        this.envSeries = [...storedBackup.env];
        this.powerSeries = [...storedBackup.power];
        this.occSeries = [...storedBackup.occ];
      }
    },
    seekReplay(progress: number) {
      if (!this.historyBuffer || this.replay.status === 'idle') return;
      const { from, to, events } = this.replay;
      if (from === null || to === null) return;
      const duration = to - from;
      const target = from + Math.max(0, Math.min(1, progress)) * duration;
      this.replay.accumulatedMs = target - from;
      if (this.replay.status === 'playing') {
        this.replay.startedAt = Date.now();
      }
      this.replay.cursor = events.findIndex((event) => event.ts > target);
      if (this.replay.cursor === -1) {
        this.replay.cursor = events.length;
      }
      this.resetSeries();
      this.applyReplayUntil(target);
      this.replay.progress = Math.max(0, Math.min(1, progress));
    },
    setReplaySpeed(speed: number) {
      const currentElapsed = this.replayElapsed();
      this.replay.accumulatedMs = currentElapsed;
      this.replay.speed = speed;
      if (this.replay.status === 'playing') {
        this.replay.startedAt = Date.now();
        this.startReplayTimer();
      }
    },
    replayElapsed() {
      if (this.replay.from === null || this.replay.to === null) {
        return 0;
      }
      const duration = this.replay.to - this.replay.from;
      if (this.replay.status === 'playing' && this.replay.startedAt !== null) {
        const now = Date.now();
        return Math.min(
          duration,
          this.replay.accumulatedMs + (now - this.replay.startedAt) * this.replay.speed
        );
      }
      return Math.min(duration, this.replay.accumulatedMs);
    },
    applyReplayUntil(targetTs: number) {
      if (!this.replay.events.length) return;
      for (let i = 0; i < this.replay.events.length; i += 1) {
        const event = this.replay.events[i];
        if (!event) continue;
        if (event.ts > targetTs) {
          this.replay.cursor = i;
          break;
        }
        this.applyReplayEvent(event);
        this.replay.cursor = i + 1;
      }
    },
    applyReplayEvent(event: ReplayEvent) {
      if (event.type === 'env') {
        this.ingestEnv(event.payload as EnvPoint, { fromReplay: true });
      }
      if (event.type === 'power') {
        this.ingestPower(event.payload as PowerPoint, { fromReplay: true });
      }
      if (event.type === 'occ') {
        this.ingestOcc(event.payload as OccPoint, { fromReplay: true });
      }
    },
    startReplayTimer() {
      if (this.replay.timerId) {
        clearInterval(this.replay.timerId);
      }
      const scope: typeof globalThis =
        typeof window !== 'undefined' ? window : (globalThis as typeof globalThis);
      this.replay.timerId = scope.setInterval(() => {
        this.tickReplay();
      }, 250);
    },
    tickReplay() {
      if (this.replay.status !== 'playing' || this.replay.startedAt === null) return;
      const { from, to, events } = this.replay;
      if (from === null || to === null) return;
      const duration = to - from;
      const elapsed = this.replayElapsed();
      const currentTs = from + elapsed;
      while (this.replay.cursor < events.length) {
        const nextEvent = events[this.replay.cursor];
        if (!nextEvent || nextEvent.ts > currentTs) {
          break;
        }
        this.applyReplayEvent(nextEvent);
        this.replay.cursor += 1;
      }
      this.replay.progress = Math.min(1, elapsed / duration);
      if (this.replay.cursor >= events.length) {
        this.stopReplay(false);
        this.replay.progress = 1;
        this.replay.status = 'idle';
      }
    }
  }
});
