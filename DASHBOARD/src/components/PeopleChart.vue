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
      backgroundColor: 'rgba(155, 89, 182, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#9b59b6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      stepped: false
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
      max: 25,
      ticks: {
        stepSize: 5
      },
      title: {
        display: true,
        text: 'Jumlah Orang'
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

.people-count-display {
  text-align: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  border-radius: 12px;
  color: white;
}

.count-value {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 5px;
}

.count-label {
  font-size: 14px;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>


