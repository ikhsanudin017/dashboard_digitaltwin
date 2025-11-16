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
      backgroundColor: 'rgba(52, 152, 219, 0.7)',
      borderColor: '#3498db',
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowBlur: 8,
      shadowColor: 'rgba(52, 152, 219, 0.3)'
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: {
          size: 12,
          weight: '600'
        }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 13,
        weight: '600'
      },
      bodyFont: {
        size: 12
      },
      borderColor: '#3498db',
      borderWidth: 2,
      cornerRadius: 8,
      displayColors: true
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Daya (Watt)',
        font: {
          size: 12,
          weight: '600'
        },
        color: '#7f8c8d'
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.06)',
        lineWidth: 1
      },
      ticks: {
        font: {
          size: 11
        },
        color: '#95a5a6'
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          size: 11
        },
        color: '#95a5a6'
      }
    }
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart'
  }
}
</script>

<style scoped>
.chart-container {
  height: 300px;
  position: relative;
}
</style>





