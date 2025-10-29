<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { useTelemetryStore } from '@/stores/useTelemetryStore';

const telemetry = useTelemetryStore();

type PresetKey = '15m' | '1h' | '24h' | 'custom';

const presets: { id: PresetKey; label: string; duration?: number }[] = [
  { id: '15m', label: '15 Menit', duration: 15 * 60 * 1000 },
  { id: '1h', label: '1 Jam', duration: 60 * 60 * 1000 },
  { id: '24h', label: '24 Jam', duration: 24 * 60 * 60 * 1000 },
  { id: 'custom', label: 'Custom' }
];

const state = reactive({
  preset: '1h' as PresetKey,
  from: dayjs().subtract(1, 'hour').startOf('minute').format('YYYY-MM-DDTHH:mm'),
  to: dayjs().format('YYYY-MM-DDTHH:mm')
});

const speedOptions = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '5×', value: 5 }
];

const loading = ref(false);

const replayStatus = computed(() => telemetry.replayStatus);
const replayProgress = computed(() => telemetry.replayProgress * 100);
const replaySpeed = computed(() => telemetry.replaySpeed);

const statusLabel = computed(() => {
  switch (replayStatus.value) {
    case 'playing':
      return 'Replaying';
    case 'paused':
      return 'Paused';
    default:
      return 'Idle';
  }
});

const computeRange = (): { from: number; to: number } => {
  const now = dayjs(state.to);
  if (state.preset !== 'custom') {
    const duration = presets.find((preset) => preset.id === state.preset)?.duration ?? 0;
    return {
      from: now.subtract(duration, 'millisecond').valueOf(),
      to: now.valueOf()
    };
  }

  return {
    from: dayjs(state.from).valueOf(),
    to: dayjs(state.to).valueOf()
  };
};

const applyPreset = async (id: PresetKey) => {
  state.preset = id;
  if (id !== 'custom') {
    const preset = presets.find((p) => p.id === id);
    if (preset?.duration) {
      state.from = dayjs(state.to)
        .subtract(preset.duration, 'millisecond')
        .format('YYYY-MM-DDTHH:mm');
    }
  }
  await loadHistory();
};

const loadHistory = async () => {
  const { from, to } = computeRange();
  if (from >= to) return;
  loading.value = true;
  try {
    await telemetry.loadHistory(from, to);
  } finally {
    loading.value = false;
  }
};

const play = async () => {
  if (!telemetry.historyBuffer) {
    await loadHistory();
  }
  telemetry.startReplay(replaySpeed.value);
};

const pause = () => {
  telemetry.pauseReplay();
};

const stop = () => {
  telemetry.stopReplay();
};

const changeSpeed = (value: number) => {
  telemetry.setReplaySpeed(value);
};

const seek = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = Number(target.value) / 100;
  telemetry.seekReplay(value);
};

const loadInitial = async () => {
  await loadHistory();
};

loadInitial();
</script>

<template>
  <article
    class="flex h-full flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-card"
  >
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-base font-semibold text-white">History &amp; Replay</h2>
        <p class="text-xs text-slate-400">
          Range {{ dayjs(computeRange().from).format('DD MMM HH:mm') }} -
          {{ dayjs(computeRange().to).format('DD MMM HH:mm') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition"
          :class="
            preset.id === state.preset
              ? 'border-brand-500 bg-brand-500/20 text-brand-100'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-brand-500/50 hover:text-brand-100'
          "
          @click="applyPreset(preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>
    </header>

    <div v-if="state.preset === 'custom'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="flex flex-col gap-1 text-xs text-slate-400">
        Dari
        <input
          v-model="state.from"
          type="datetime-local"
          class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs text-slate-400">
        Sampai
        <input
          v-model="state.to"
          type="datetime-local"
          class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <button
        type="button"
        class="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-brand-400 sm:col-span-2"
        :disabled="loading"
        @click="loadHistory"
      >
        {{ loading ? 'Loading…' : 'Load History' }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        :disabled="replayStatus === 'playing'"
        @click="play"
      >
        Play
      </button>
      <button
        type="button"
        class="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="replayStatus !== 'playing'"
        @click="pause"
      >
        Pause
      </button>
      <button
        type="button"
        class="rounded-md border border-rose-500/60 px-4 py-2 text-sm font-semibold text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="replayStatus === 'idle'"
        @click="stop"
      >
        Stop
      </button>

      <div
        class="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300"
      >
        Speed
        <select
          :value="replaySpeed"
          class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          @change="changeSpeed(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="option in speedOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <span class="ml-auto text-xs uppercase tracking-wide text-slate-400">
        Status: <span class="text-slate-200">{{ statusLabel }}</span>
      </span>
    </div>

    <div>
      <input
        :value="replayProgress"
        type="range"
        min="0"
        max="100"
        class="h-2 w-full appearance-none rounded-full bg-slate-800 accent-brand-500"
        @input="seek"
      />
      <div class="mt-1 flex justify-between text-xs text-slate-400">
        <span>{{ Math.round(replayProgress) }}%</span>
        <span>
          {{
            telemetry.historyBuffer
              ? dayjs(telemetry.historyBuffer.to).diff(
                  dayjs(telemetry.historyBuffer.from),
                  'minute'
                )
              : 0
          }}
          menit
        </span>
      </div>
    </div>
  </article>
</template>
