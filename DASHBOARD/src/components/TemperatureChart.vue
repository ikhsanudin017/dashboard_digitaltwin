<template>
  <div class="chart-container">
    <Line
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps({
  data: {
    type: Object,
    default: () => ({ labels: [], values: [] })
  }
})

const chartData = computed(() => ({
  labels: props.data.labels || [],
  datasets: [
    {
      label: 'Suhu (°C)',
      data: props.data.values || [],
      borderColor: '#e74c3c',
      backgroundColor: 'rgba(231, 76, 60, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#e74c3c',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: 'Suhu (°C)'
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
}
</script>

<style scoped>
.chart-container {
  height: 300px;
  position: relative;
}
</style>


