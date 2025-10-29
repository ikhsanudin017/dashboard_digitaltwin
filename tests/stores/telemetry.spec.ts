import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTelemetryStore } from '@/stores/useTelemetryStore';

describe('useTelemetryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalises environmental timestamps to milliseconds', () => {
    const store = useTelemetryStore();
    store.ingestEnv({ ts: 1730175600, temp_c: 24.6, rh: 58.2 });
    expect(store.envSeries[0].ts).toBe(1730175600 * 1000);
  });

  it('raises temperature alert after sustained high readings', () => {
    const store = useTelemetryStore();
    const base = Date.now();
    for (let i = 0; i < 5; i += 1) {
      store.ingestEnv({
        ts: (base + i * 60_000) / 1000,
        temp_c: 30.5,
        rh: 62
      });
    }
    const hasTempAlert = store.alerts.some((alert) => alert.type === 'temperature_high');
    expect(hasTempAlert).toBe(true);
  });

  it('plays history replay stream and populates series', () => {
    vi.useFakeTimers();
    const store = useTelemetryStore();
    const now = Date.now();
    store.historyBuffer = {
      env: [
        { ts: now - 4000, temp_c: 25.1, rh: 55 },
        { ts: now - 2000, temp_c: 25.8, rh: 56 }
      ],
      power: [
        { ts: now - 3500, watt: 820, kwh_total: 12.4 },
        { ts: now - 1500, watt: 900, kwh_total: 12.6 }
      ],
      occ: [
        { ts: now - 3000, count: 24, confidence: 0.9 },
        { ts: now - 1000, count: 25, confidence: 0.92 }
      ],
      alerts: [],
      from: now - 4000,
      to: now
    };
    store.startReplay();
    expect(store.replay.status).toBe('playing');
    vi.advanceTimersByTime(1000);
    expect(store.envSeries.length).toBeGreaterThan(0);
    expect(store.powerSeries.length).toBeGreaterThan(0);
    expect(store.occSeries.length).toBeGreaterThan(0);
    store.stopReplay();
  });
});
