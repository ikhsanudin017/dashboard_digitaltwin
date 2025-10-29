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
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
  Decimation
} from 'chart.js';
import type { ChartData, ChartOptions, TooltipItem, TooltipLabelStyle } from 'chart.js';
import 'chartjs-adapter-dayjs-4';
import { Line } from 'vue-chartjs';
import { useTelemetryStore } from '@/stores/useTelemetryStore';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
  Decimation
);

const telemetry = useTelemetryStore();
const { envSeries, powerSeries } = storeToRefs(telemetry);

const baseChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 300
  },
  plugins: {
    legend: {
      labels: {
        color: '#cbd5f5',
        usePointStyle: true
      }
    },
    tooltip: {
      intersect: false,
      mode: 'index',
      callbacks: {
        labelColor: (ctx: TooltipItem<'line'>): TooltipLabelStyle => {
          const datasetColor = Array.isArray(ctx.dataset.borderColor)
            ? ctx.dataset.borderColor[0]
            : (ctx.dataset.borderColor as string | undefined);
          const color = typeof datasetColor === 'string' ? datasetColor : '#38bdf8';
          return {
            borderColor: color,
            backgroundColor: color
          };
        }
      }
    },
    decimation: {
      enabled: true,
      algorithm: 'lttb' as const,
      samples: 200
    }
  },
  scales: {
    x: {
      type: 'time',
      ticks: {
        color: '#94a3b8'
      },
      grid: {
        color: '#1e293b'
      }
    }
  }
};

const envChartData = computed<ChartData<'line'>>(() => ({
  labels: envSeries.value.map((point) => point.ts),
  datasets: [
    {
      label: 'Temperature (degC)',
      data: envSeries.value.map((point) => point.temp_c),
      borderColor: '#38bdf8',
      backgroundColor: '#38bdf8',
      borderWidth: 2,
      tension: 0.35,
      yAxisID: 'temp',
      pointRadius: 0
    },
    {
      label: 'Humidity (%)',
      data: envSeries.value.map((point) => point.rh),
      borderColor: '#a855f7',
      backgroundColor: '#a855f7',
      borderDash: [6, 4],
      borderWidth: 2,
      tension: 0.35,
      yAxisID: 'humidity',
      pointRadius: 0
    }
  ]
}));

const envChartOptions = computed<ChartOptions<'line'>>(() => ({
  ...baseChartOptions,
  scales: {
    ...baseChartOptions.scales,
    temp: {
      type: 'linear',
      position: 'left',
      ticks: { color: '#38bdf8' },
      grid: { color: '#1e293b' }
    },
    humidity: {
      type: 'linear',
      position: 'right',
      ticks: { color: '#a855f7' },
      grid: { drawOnChartArea: false }
    }
  }
}));

const powerChartData = computed<ChartData<'line'>>(() => ({
  labels: powerSeries.value.map((point) => point.ts),
  datasets: [
    {
      label: 'Power (W)',
      data: powerSeries.value.map((point) => point.watt),
      borderColor: '#f97316',
      backgroundColor: '#f97316',
      tension: 0.35,
      borderWidth: 2,
      yAxisID: 'watt',
      pointRadius: 0
    },
    {
      label: 'Cumulative kWh',
      data: powerSeries.value.map((point) => point.kwh_total),
      borderColor: '#22c55e',
      backgroundColor: '#22c55e33',
      fill: true,
      borderWidth: 2,
      tension: 0.35,
      yAxisID: 'kwh',
      pointRadius: 0
    }
  ]
}));

const powerChartOptions = computed<ChartOptions<'line'>>(() => ({
  ...baseChartOptions,
  scales: {
    ...baseChartOptions.scales,
    watt: {
      type: 'linear',
      position: 'left',
      ticks: { color: '#f97316' },
      grid: { color: '#1e293b' }
    },
    kwh: {
      type: 'linear',
      position: 'right',
      ticks: { color: '#22c55e' },
      grid: { drawOnChartArea: false }
    }
  }
}));
</script>

<template>
  <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <article class="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-card">
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold text-white">Temperature &amp; Humidity</h2>
        <span class="text-xs uppercase tracking-wide text-slate-500">Real-time</span>
      </header>
      <div class="h-72">
        <Line :data="envChartData" :options="envChartOptions" />
      </div>
    </article>
    <article class="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-card">
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold text-white">Power &amp; Energy</h2>
        <span class="text-xs uppercase tracking-wide text-slate-500">Real-time</span>
      </header>
      <div class="h-72">
        <Line :data="powerChartData" :options="powerChartOptions" />
      </div>
    </article>
  </section>
</template>
