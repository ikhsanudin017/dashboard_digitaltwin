<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Filler,
  CategoryScale
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import 'chartjs-adapter-dayjs-4';
import { Line } from 'vue-chartjs';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useConfigStore } from '@/stores/useConfigStore';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Tooltip,
  Filler
);

interface CardMetric {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  deltaLabel: string;
  deltaValue: string;
  deltaPositive: boolean;
  chartData: ChartData<'line'>;
  chartOptions: ChartOptions<'line'>;
  icon: string;
}

const telemetry = useTelemetryStore();
const config = useConfigStore();
const { envSeries, powerSeries, occSeries } = storeToRefs(telemetry);

const fifteenMinutes = 15 * 60 * 1000;

const baseChartOptions: ChartOptions<'line'> = {
  elements: {
    point: { radius: 0 },
    line: { tension: 0.35, borderWidth: 2 }
  },
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false }
  },
  scales: {
    x: { display: false },
    y: { display: false }
  }
};

const buildSparkline = (
  values: number[],
  timestamps: number[],
  color: string
): ChartData<'line'> => ({
  labels: timestamps,
  datasets: [
    {
      type: 'line' as const,
      label: '',
      data: values,
      borderColor: color,
      backgroundColor: `${color}33`,
      fill: true,
      tension: 0.35,
      pointRadius: 0
    }
  ]
});

const lastItem = <T,>(list: T[]): T | null => {
  if (list.length === 0) {
    return null;
  }
  const value = list[list.length - 1];
  return value === undefined ? null : (value as T);
};

const findValueAt = <T extends { ts: number }>(series: T[], deltaMs: number): T | null => {
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  if (!latest) return null;
  const target = latest.ts - deltaMs;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const point = series[i];
    if (point && point.ts <= target) {
      return point;
    }
  }
  const first = series[0];
  return first === undefined ? null : first;
};

const windowValues = <T extends { ts: number }>(
  series: T[],
  selector: (point: T) => number
): { timestamps: number[]; values: number[] } => {
  const latest = lastItem(series);
  if (!latest) {
    return { timestamps: [] as number[], values: [] as number[] };
  }
  const windowStart = latest.ts - fifteenMinutes;
  const points = series.filter((point) => point.ts >= windowStart);
  return {
    timestamps: points.map((p) => p.ts),
    values: points.map(selector)
  };
};

const temperatureCards = computed<CardMetric[]>(() => {
  const latestEnv = lastItem(envSeries.value);
  const latestPowerPoint = lastItem(powerSeries.value);
  const latestOccPoint = lastItem(occSeries.value);

  const latestTemp = latestEnv?.temp_c ?? 0;
  const latestHumidity = latestEnv?.rh ?? 0;
  const tempPast = findValueAt(envSeries.value, fifteenMinutes)?.temp_c ?? latestTemp;
  const humidityPast = findValueAt(envSeries.value, fifteenMinutes)?.rh ?? latestHumidity;

  const powerWindow = windowValues(powerSeries.value, (point) => point.watt);
  const powerPastAverage =
    powerWindow.values.length > 0
      ? powerWindow.values.reduce((acc, value) => acc + value, 0) / powerWindow.values.length
      : 0;
  const latestPower = latestPowerPoint?.watt ?? 0;

  const occ = latestOccPoint?.count ?? 0;
  const occConfidence = latestOccPoint?.confidence ?? 0;
  const capacity = config.roomCapacity;
  const capacityPct = capacity > 0 ? Math.round((occ / capacity) * 100) : 0;

  const tempWindow = windowValues(envSeries.value, (point) => point.temp_c);
  const humidityWindow = windowValues(envSeries.value, (point) => point.rh);
  const occWindow = windowValues(occSeries.value, (point) => point.count);

  return [
    {
      id: 'temperature',
      label: 'Temperature',
      value: `${latestTemp.toFixed(1)} degC`,
      subLabel: 'Current',
      deltaLabel: 'Delta 15m',
      deltaValue: `${(latestTemp - tempPast).toFixed(1)} degC`,
      deltaPositive: latestTemp - tempPast <= 0,
      chartData: buildSparkline(tempWindow.values, tempWindow.timestamps, '#38bdf8'),
      chartOptions: baseChartOptions,
      icon: 'thermometer'
    },
    {
      id: 'humidity',
      label: 'Humidity',
      value: `${latestHumidity.toFixed(1)} %`,
      subLabel: 'Current',
      deltaLabel: 'Delta 15m',
      deltaValue: `${(latestHumidity - humidityPast).toFixed(1)} %`,
      deltaPositive: latestHumidity - humidityPast <= 0,
      chartData: buildSparkline(humidityWindow.values, humidityWindow.timestamps, '#a855f7'),
      chartOptions: baseChartOptions,
      icon: 'humidity'
    },
    {
      id: 'power',
      label: 'Power',
      value: `${Math.round(latestPower)} W`,
      subLabel: 'Instantaneous',
      deltaLabel: 'Avg 15m',
      deltaValue: `${Math.round(powerPastAverage)} W`,
      deltaPositive: latestPower <= powerPastAverage,
      chartData: buildSparkline(powerWindow.values, powerWindow.timestamps, '#f97316'),
      chartOptions: baseChartOptions,
      icon: 'bolt'
    },
    {
      id: 'occupancy',
      label: 'Occupancy',
      value: `${occ} / ${capacity}`,
      subLabel: `Confidence ${(occConfidence * 100).toFixed(0)}%`,
      deltaLabel: 'Capacity',
      deltaValue: `${capacityPct >= 0 ? capacityPct : 0}%`,
      deltaPositive: occ <= capacity,
      chartData: buildSparkline(occWindow.values, occWindow.timestamps, '#22c55e'),
      chartOptions: baseChartOptions,
      icon: 'users'
    }
  ];
});
</script>

<template>
  <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    <article
      v-for="card in temperatureCards"
      :key="card.id"
      class="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-card transition hover:border-brand-500/60"
    >
      <header class="mb-3 flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-400">{{ card.label }}</p>
          <h2 class="text-2xl font-semibold text-white">{{ card.value }}</h2>
        </div>
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200"
        >
          <svg class="h-5 w-5 fill-current opacity-80">
            <use :xlink:href="`/src/assets/icons.svg#${card.icon}`" />
          </svg>
        </span>
      </header>
      <div class="mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>{{ card.subLabel }}</span>
        <span
          :class="[
            'inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium',
            card.deltaPositive
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
          ]"
        >
          {{ card.deltaLabel }}: {{ card.deltaValue }}
        </span>
      </div>
      <div class="h-20">
        <Line :data="card.chartData" :options="card.chartOptions" />
      </div>
    </article>
  </section>
</template>
