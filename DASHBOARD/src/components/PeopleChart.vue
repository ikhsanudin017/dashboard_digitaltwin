<template>
  <div class="chart-container">
    <div class="people-count-display">
      <div class="count-value">{{ currentCount }}</div>
      <div class="count-label">Orang di Ruangan</div>
    </div>
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

const currentCount = computed(() => {
  const values = props.data.values || []
  return values.length > 0 ? values[values.length - 1] : 0
})

const chartData = computed(() => ({
  labels: props.data.labels || [],
  datasets: [
    {
      label: 'Jumlah Orang',
      data: props.data.values || [],
      borderColor: '#9b59b6',
      backgroundColor: 'rgba(155, 89, 182, 0.15)',
      borderWidth: 3,
      fill: true,
      tension: 0.5,
      pointRadius: 5,
      pointHoverRadius: 8,
      pointBackgroundColor: '#9b59b6',
      pointBorderColor: '#fff',
      pointBorderWidth: 3,
      stepped: false,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowBlur: 10,
      shadowColor: 'rgba(155, 89, 182, 0.3)'
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
      borderColor: '#9b59b6',
      borderWidth: 2,
      cornerRadius: 8,
      displayColors: true
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 25,
      ticks: {
        stepSize: 5,
        font: {
          size: 11
        },
        color: '#95a5a6'
      },
      title: {
        display: true,
        text: 'Jumlah Orang',
        font: {
          size: 12,
          weight: '600'
        },
        color: '#7f8c8d'
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.06)',
        lineWidth: 1
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

.people-count-display {
  text-align: center;
  margin-bottom: 24px;
  padding: 28px 24px;
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 50%, #7d3c98 100%);
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
  border-radius: 20px;
  color: white;
  box-shadow: 0 8px 24px rgba(155, 89, 182, 0.3);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.people-count-display::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.people-count-display:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(155, 89, 182, 0.4);
}

.count-value {
  font-size: 56px;
  font-weight: 800;
  margin-bottom: 8px;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  animation: countPulse 2s ease-in-out infinite;
}

@keyframes countPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.count-label {
  font-size: 14px;
  opacity: 0.95;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
  position: relative;
  z-index: 1;
}
</style>





