<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useConfigStore } from '@/stores/useConfigStore';
import { useTelemetryStore } from '@/stores/useTelemetryStore';

const configStore = useConfigStore();
const telemetryStore = useTelemetryStore();

const { mode, roomId } = storeToRefs(configStore);
const { connectionStatus, connected } = storeToRefs(telemetryStore);

const modeOptions = [
  { label: 'Mock', value: 'mock' },
  { label: 'Live', value: 'live' }
];

const modeModel = computed({
  get: () => mode.value,
  set: (value: typeof mode.value) => {
    configStore.setMode(value);
  }
});

const roomModel = computed({
  get: () => roomId.value,
  set: (value: string) => {
    configStore.setRoomId(value);
  }
});

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'bg-emerald-400';
    case 'connecting':
      return 'bg-amber-400';
    case 'error':
      return 'bg-rose-500';
    default:
      return 'bg-slate-500';
  }
});

const statusLabel = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'MQTT Connected';
    case 'connecting':
      return 'Connecting…';
    case 'error':
      return 'Connection Error';
    default:
      return 'Disconnected';
  }
});
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
    <div
      class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h1 class="text-lg font-semibold text-white md:text-xl">Amikom Room Digital Twin</h1>
        <p class="text-sm text-slate-400">
          Monitoring for <span class="font-medium text-slate-100">{{ roomId }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-slate-300">
          <span class="text-xs uppercase tracking-wide text-slate-400">Mode</span>
          <select
            v-model="modeModel"
            class="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option
              v-for="option in modeOptions"
              :key="option.value"
              :value="option.value"
              class="bg-slate-900 text-white"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-300">
          <span class="text-xs uppercase tracking-wide text-slate-400">Room</span>
          <select
            v-model="roomModel"
            class="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option
              v-for="room in configStore.rooms"
              :key="room.id"
              :value="room.id"
              class="bg-slate-900 text-white"
            >
              {{ room.label }}
            </option>
          </select>
        </label>
        <div
          class="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1"
        >
          <span :class="['h-2.5 w-2.5 rounded-full', statusColor]" />
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-200">
            {{ statusLabel }}
          </span>
        </div>
        <span
          class="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300"
        >
          {{ connected ? 'Live' : 'Idle' }}
        </span>
      </div>
    </div>
  </header>
</template>
