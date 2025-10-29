<script setup lang="ts">
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { storeToRefs } from 'pinia';
import { useTelemetryStore } from '@/stores/useTelemetryStore';

const telemetry = useTelemetryStore();
const { alerts } = storeToRefs(telemetry);

const severityFilter = ref<'all' | 'info' | 'warning' | 'critical'>('all');
const typeFilter = ref<'all' | string>('all');

const severityClasses: Record<string, string> = {
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-200'
};

const availableTypes = computed(() => {
  const types = new Set(alerts.value.map((alert) => alert.type));
  return Array.from(types);
});

const filteredAlerts = computed(() =>
  alerts.value.filter((alert) => {
    const severityMatch = severityFilter.value === 'all' || alert.severity === severityFilter.value;
    const typeMatch = typeFilter.value === 'all' || alert.type === typeFilter.value;
    return severityMatch && typeMatch;
  })
);

const acknowledge = (id: string) => {
  telemetry.acknowledgeAlert(id);
};

const clear = (id: string) => {
  telemetry.removeAlert(id);
};

const clearAll = () => {
  telemetry.clearAlerts();
};
</script>

<template>
  <article
    class="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-card"
  >
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-base font-semibold text-white">Alerts</h2>
        <p class="text-xs text-slate-400">{{ filteredAlerts.length }} alert(s) ditampilkan</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <select
          v-model="typeFilter"
          class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Types</option>
          <option v-for="type in availableTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
        <select
          v-model="severityFilter"
          class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <button
          type="button"
          class="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-brand-500/50 hover:text-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
          @click="clearAll"
        >
          Clear All
        </button>
      </div>
    </header>

    <ul class="flex-1 space-y-3 overflow-y-auto pr-1">
      <li
        v-for="alert in filteredAlerts"
        :key="alert.id"
        :class="[
          'flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm transition',
          severityClasses[alert.severity] ?? 'border-slate-700 bg-slate-900/80 text-slate-200',
          alert.acknowledged ? 'opacity-60' : 'opacity-100'
        ]"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                severityClasses[alert.severity] ?? 'border-slate-600 bg-slate-800 text-slate-200'
              ]"
            >
              {{ alert.severity }}
            </span>
            <h3 class="text-sm font-semibold text-white">
              {{ alert.type.replace('_', ' ') }}
            </h3>
          </div>
          <span class="text-xs text-slate-200">
            {{ dayjs(alert.ts).fromNow() }}
          </span>
        </div>
        <p class="text-xs text-slate-100">
          Value
          <span class="font-semibold text-white">{{ alert.value }}</span>
          <span v-if="alert.threshold">/ Threshold {{ alert.threshold }}</span>
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-white/30 px-3 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="alert.acknowledged"
            @click="acknowledge(alert.id)"
          >
            {{ alert.acknowledged ? 'Acked' : 'Acknowledge' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-white/30 px-3 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
            @click="clear(alert.id)"
          >
            Clear
          </button>
        </div>
      </li>
      <li
        v-if="!filteredAlerts.length"
        class="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-center text-sm text-slate-400"
      >
        Tidak ada alert aktif untuk filter ini.
      </li>
    </ul>
  </article>
</template>
