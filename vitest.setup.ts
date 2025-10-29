import { config } from '@vue/test-utils';
import { vi } from 'vitest';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

vi.mock('mqtt', () => {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const client = {
    subscribe: vi.fn((_topic: string, _opts: unknown, callback?: (err: null) => void) => {
      callback?.(null);
    }),
    publish: vi.fn(),
    end: vi.fn((_force?: boolean, _opts?: unknown, callback?: () => void) => {
      callback?.();
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(handler);
    }),
    once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(handler);
    })
  };
  return {
    connect: vi.fn(() => {
      listeners['connect']?.forEach((fn) => fn());
      return client;
    }),
    MqttClient: {} as unknown
  };
});

config.global.mocks = {
  $dayjs: dayjs
};
