import { defineStore } from 'pinia';

export type TelemetryMode = 'live' | 'mock';

interface ConfigState {
  mode: TelemetryMode;
  brokerUrl: string;
  roomId: string;
  historyDays: number;
  roomCapacity: number;
}

const STORAGE_KEY = 'amikom-room-config';

const envDefaults: ConfigState = {
  mode: (import.meta.env.VITE_DEFAULT_MODE as TelemetryMode) ?? 'mock',
  brokerUrl: import.meta.env.VITE_BROKER_URL ?? '',
  roomId: import.meta.env.VITE_ROOM_ID ?? 'room-101',
  historyDays: Number(import.meta.env.VITE_HISTORY_DAYS ?? 1),
  roomCapacity: 40
};

const loadPersistedState = (): Partial<ConfigState> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ConfigState>;
  } catch (err) {
    console.warn('[config] failed to load persisted state', err);
    return null;
  }
};

const persistState = (state: ConfigState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: state.mode,
        brokerUrl: state.brokerUrl,
        roomId: state.roomId,
        historyDays: state.historyDays,
        roomCapacity: state.roomCapacity
      })
    );
  } catch (err) {
    console.warn('[config] failed to persist state', err);
  }
};

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    ...envDefaults,
    ...(loadPersistedState() ?? {})
  }),
  getters: {
    isLive: (state) => state.mode === 'live',
    isMock: (state) => state.mode === 'mock',
    rooms: () => [
      { id: 'room-101', label: 'Room 101', capacity: 40 },
      { id: 'room-102', label: 'Room 102', capacity: 45 },
      { id: 'room-lab-2', label: 'Lab 2', capacity: 30 }
    ]
  },
  actions: {
    setMode(mode: TelemetryMode) {
      if (this.mode === mode) return;
      this.mode = mode;
      persistState(this.$state);
    },
    setBrokerUrl(url: string) {
      if (this.brokerUrl === url) return;
      this.brokerUrl = url;
      persistState(this.$state);
    },
    setRoomId(roomId: string) {
      if (this.roomId === roomId) return;
      this.roomId = roomId;
      const room = this.rooms.find((r) => r.id === roomId);
      if (room) {
        this.roomCapacity = room.capacity;
      }
      persistState(this.$state);
    },
    setHistoryDays(days: number) {
      this.historyDays = days;
      persistState(this.$state);
    },
    setRoomCapacity(capacity: number) {
      if (this.roomCapacity === capacity) return;
      this.roomCapacity = capacity;
      persistState(this.$state);
    }
  }
});
