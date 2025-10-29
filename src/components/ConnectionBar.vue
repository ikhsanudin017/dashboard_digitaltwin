<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useConfigStore } from '@/stores/useConfigStore';

const telemetry = useTelemetryStore();
const config = useConfigStore();

const { connectionStatus, connected, qosStatus } = storeToRefs(telemetry);
const { mode } = storeToRefs(config);

const brokerModel = computed({
  get: () => config.brokerUrl,
  set: (value: string) => {
    config.setBrokerUrl(value);
  }
});

const isLiveMode = computed(() => mode.value === 'live');
const isConnecting = computed(() => connectionStatus.value === 'connecting');

const connect = async () => {
  if (!isLiveMode.value) {
    config.setMode('live');
  }
  await telemetry.connect(brokerModel.value);
};

const disconnect = async () => {
  await telemetry.disconnect();
};

const statusBadgeClass = computed(() => {
  if (connected.value) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (connectionStatus.value === 'connecting')
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (connectionStatus.value === 'error') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  return 'bg-slate-800 text-slate-300 border-slate-700';
});
</script>

<template>
  <section
    class="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-5 shadow-card backdrop-blur"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        <label class="flex w-full flex-col gap-2 text-sm text-slate-300 md:w-96">
          <span class="text-xs uppercase tracking-wide text-slate-400"> MQTT Broker URL </span>
          <input
            v-model="brokerModel"
            type="text"
            name="brokerUrl"
            placeholder="wss://broker.example/mqtt"
            class="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <div class="flex items-center gap-3 pt-1 md:pt-6">
          <button
            type="button"
            class="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            :disabled="isConnecting || connected"
            @click="connect"
          >
            {{ connected ? 'Connected' : isConnecting ? 'Connecting…' : 'Connect' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 shadow focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!connected && connectionStatus !== 'connecting'"
            @click="disconnect"
          >
            Disconnect
          </button>
        </div>
      </div>
      <div class="flex flex-col items-start gap-3 md:items-end">
        <div
          :class="[
            'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            statusBadgeClass
          ]"
        >
          <span class="inline-flex h-2 w-2 rounded-full bg-current opacity-80" />
          {{ connectionStatus }}
        </div>
        <div class="flex flex-wrap gap-2 text-xs text-slate-400">
          <span class="rounded-full border border-slate-700 px-2 py-1"
            >Env QoS {{ qosStatus.env }}</span
          >
          <span class="rounded-full border border-slate-700 px-2 py-1"
            >Power QoS {{ qosStatus.power }}</span
          >
          <span class="rounded-full border border-slate-700 px-2 py-1"
            >Occupancy QoS {{ qosStatus.occ }}</span
          >
        </div>
        <p v-if="!isLiveMode" class="text-xs text-slate-500">
          Switch to <span class="text-slate-300">Live</span> mode to enable broker connection.
        </p>
      </div>
    </div>
  </section>
</template>
