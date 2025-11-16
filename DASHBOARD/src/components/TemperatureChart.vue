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
      backgroundColor: 'rgba(231, 76, 60, 0.15)',
      borderWidth: 3,
      fill: true,
      tension: 0.5,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#e74c3c',
      pointBorderColor: '#fff',
      pointBorderWidth: 3,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowBlur: 10,
      shadowColor: 'rgba(231, 76, 60, 0.3)'
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
      borderColor: '#e74c3c',
      borderWidth: 2,
      cornerRadius: 8,
      displayColors: true
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: 'Suhu (°C)',
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
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
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





