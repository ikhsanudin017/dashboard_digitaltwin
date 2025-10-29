import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export type Severity = 'info' | 'warning' | 'critical';

export interface EnvPoint {
  ts: number;
  temp_c: number;
  rh: number;
}

export interface PowerPoint {
  ts: number;
  watt: number;
  kwh_total: number;
}

export interface OccPoint {
  ts: number;
  count: number;
  confidence: number;
}

export interface AlertMessage {
  ts: number;
  type: string;
  value: number;
  threshold?: number;
  severity: Severity;
}

export interface TelemetryCallbacks {
  onEnv: (payload: EnvPoint) => void;
  onPower: (payload: PowerPoint) => void;
  onOcc: (payload: OccPoint) => void;
  onAlert: (payload: AlertMessage) => void;
}

export interface MockHandle {
  stop: () => void;
}

const TEMP_BASE = 25;
const RH_BASE = 58;
const POWER_BASE = 780;
const OCC_BASE = 25;

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const MAX_HISTORY_POINTS = 5000;

export interface HistoryResult {
  env: EnvPoint[];
  power: PowerPoint[];
  occ: OccPoint[];
  alerts: AlertMessage[];
}

export function startMockStream(
  roomId: string,
  callbacks: TelemetryCallbacks,
  options?: { seedEnv?: EnvPoint; seedPower?: PowerPoint; seedOcc?: OccPoint }
): MockHandle {
  console.info(`[mock] starting mock stream for ${roomId}`);

  let tick = 0;
  let cumulativeKWh = options?.seedPower?.kwh_total ?? 12;
  const tempTrend = options?.seedEnv?.temp_c ?? TEMP_BASE;
  const rhTrend = options?.seedEnv?.rh ?? RH_BASE;
  const powerTrend = options?.seedPower?.watt ?? POWER_BASE;
  const occTrend = options?.seedOcc?.count ?? OCC_BASE;

  const interval = setInterval(() => {
    tick += 1;
    const now = Date.now();

    const tempNoise = Math.sin(tick / 15) * 0.8 + randomInRange(-0.4, 0.4);
    const temp = clamp(tempTrend + tempNoise, 23, 30);

    const rhNoise = Math.cos(tick / 20) * 1.2 + randomInRange(-1.5, 1.5);
    const rh = clamp(rhTrend + rhNoise, 48, 75);

    const powerNoise = Math.sin(tick / 18) * 120 + randomInRange(-50, 60);
    const watt = clamp(powerTrend + powerNoise + (temp - TEMP_BASE) * 12, 320, 1600);

    const occNoise = randomInRange(-2, 2);
    const occupancy =
      tick % 90 === 0
        ? clamp(occTrend + randomInRange(-5, 5), 0, 40)
        : clamp(occTrend + occNoise, 0, 40);

    cumulativeKWh += watt / 3600000;

    callbacks.onEnv({
      ts: now,
      temp_c: Number(temp.toFixed(2)),
      rh: Number(rh.toFixed(2))
    });

    callbacks.onPower({
      ts: now + 2000,
      watt: Number(watt.toFixed(0)),
      kwh_total: Number(cumulativeKWh.toFixed(3))
    });

    callbacks.onOcc({
      ts: now + 4000,
      count: Math.round(occupancy),
      confidence: Number(clamp(randomInRange(0.85, 0.99), 0, 1).toFixed(2))
    });

    // Synthetic alerts
    if (temp > 29.5 && Math.random() > 0.6) {
      callbacks.onAlert({
        ts: now + 5000,
        type: 'temperature_high',
        value: Number(temp.toFixed(1)),
        threshold: 29,
        severity: temp > 30.5 ? 'critical' : 'warning'
      });
    } else if (rh > 72 && Math.random() > 0.7) {
      callbacks.onAlert({
        ts: now + 5000,
        type: 'humidity_high',
        value: Number(rh.toFixed(1)),
        threshold: 75,
        severity: 'warning'
      });
    } else if (watt > 1300 && Math.random() > 0.75) {
      callbacks.onAlert({
        ts: now + 5000,
        type: 'power_spike',
        value: Number(watt.toFixed(0)),
        threshold: Math.round(powerTrend + 300),
        severity: 'warning'
      });
    }
  }, 1000);

  return {
    stop() {
      clearInterval(interval);
      console.info('[mock] stream stopped');
    }
  };
}

export async function queryHistory(
  roomId: string,
  from: number,
  to: number,
  seed?: { env?: EnvPoint; power?: PowerPoint; occ?: OccPoint }
): Promise<HistoryResult> {
  console.info(`[mock] query history for ${roomId}`, { from, to });
  const duration = to - from;
  const step = Math.max(60_000, Math.floor(duration / Math.min(duration / 60_000, 120)));
  const totalPoints = Math.min(MAX_HISTORY_POINTS, Math.floor(duration / step));

  const env: EnvPoint[] = [];
  const power: PowerPoint[] = [];
  const occ: OccPoint[] = [];
  const alerts: AlertMessage[] = [];

  let cumulativeKWh = seed?.power?.kwh_total ?? 10;
  const tempBase = seed?.env?.temp_c ?? TEMP_BASE;
  const rhBase = seed?.env?.rh ?? RH_BASE;
  const powerBase = seed?.power?.watt ?? POWER_BASE;
  const occBase = seed?.occ?.count ?? OCC_BASE;

  for (let i = 0; i <= totalPoints; i += 1) {
    const ts = from + i * step;
    const progress = i / Math.max(1, totalPoints);

    const temp = clamp(
      tempBase +
        Math.sin(progress * Math.PI * 4) * 1.2 +
        randomInRange(-0.6, 0.6) +
        (progress - 0.5) * 0.4,
      22.5,
      30.5
    );
    const rh = clamp(rhBase + Math.cos(progress * Math.PI * 3) * 3 + randomInRange(-2, 2), 48, 78);
    const watt = clamp(
      powerBase +
        Math.sin(progress * Math.PI * 6) * 150 +
        randomInRange(-80, 80) +
        (temp - TEMP_BASE) * 10,
      300,
      1800
    );
    const count = clamp(
      occBase +
        Math.sin(progress * Math.PI * 2.5) * 6 +
        randomInRange(-4, 4) +
        (progress > 0.6 ? -5 : 0),
      0,
      40
    );

    cumulativeKWh += (watt / 60_000) * (step / 1000);

    env.push({
      ts,
      temp_c: Number(temp.toFixed(2)),
      rh: Number(rh.toFixed(2))
    });

    power.push({
      ts: ts + 2000,
      watt: Number(watt.toFixed(0)),
      kwh_total: Number(cumulativeKWh.toFixed(3))
    });

    occ.push({
      ts: ts + 4000,
      count: Math.round(count),
      confidence: Number(clamp(randomInRange(0.8, 0.99), 0, 1).toFixed(2))
    });

    if (temp > 29.5 && Math.random() > 0.8) {
      alerts.push({
        ts: ts + 5000,
        type: 'temperature_high',
        value: Number(temp.toFixed(1)),
        threshold: 29,
        severity: temp > 31 ? 'critical' : 'warning'
      });
    }

    if (rh > 75 && Math.random() > 0.82) {
      alerts.push({
        ts: ts + 5200,
        type: 'humidity_high',
        value: Number(rh.toFixed(1)),
        threshold: 75,
        severity: 'warning'
      });
    }

    if (watt > powerBase + 350 && Math.random() > 0.85) {
      alerts.push({
        ts: ts + 5400,
        type: 'power_spike',
        value: Number(watt.toFixed(0)),
        threshold: Math.round(powerBase + 320),
        severity: 'info'
      });
    }
  }

  return Promise.resolve({ env, power, occ, alerts });
}
