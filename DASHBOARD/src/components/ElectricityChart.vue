<template>
  <div class="chart-container">
    <Bar
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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
      label: 'Konsumsi Listrik (W)',
      data: props.data.values || [],
      backgroundColor: 'rgba(52, 152, 219, 0.6)',
      borderColor: '#3498db',
      borderWidth: 2,
      borderRadius: 4
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
      beginAtZero: true,
      title: {
        display: true,
        text: 'Daya (Watt)'
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
  }
}
</script>

<style scoped>
.chart-container {
  height: 300px;
  position: relative;
}
</style>


