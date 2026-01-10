<template>
  <div class="historical-section" :class="{ 'dark': isDarkMode }">
    <div class="section-header" @click="isExpanded = !isExpanded">
      <h2>📊 Historical Data & Analytics</h2>
      <button class="toggle-btn">
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>
    
    <div v-if="isExpanded" class="section-content">
      <!-- Date Range Picker -->
      <div class="date-range-section">
        <div class="date-inputs">
          <div class="input-group">
            <label>Dari Tanggal:</label>
            <input type="date" v-model="startDate" :max="endDate" />
          </div>
          <div class="input-group">
            <label>Sampai Tanggal:</label>
            <input type="date" v-model="endDate" :min="startDate" :max="today" />
          </div>
        </div>
        
        <div class="quick-selects">
          <button @click="selectToday">Hari Ini</button>
          <button @click="selectYesterday">Kemarin</button>
          <button @click="select7Days">7 Hari</button>
          <button @click="select30Days">30 Hari</button>
        </div>
      </div>
      
      <!-- Statistics Cards -->
      <div v-if="statistics" class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🌡️</div>
          <div class="stat-info">
            <p class="stat-label">Temperature</p>
            <p class="stat-value">{{ statistics.temperature.avg?.toFixed(1) || 'N/A' }} °C</p>
            <p class="stat-range">{{ statistics.temperature.min?.toFixed(1) }} - {{ statistics.temperature.max?.toFixed(1) }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💧</div>
          <div class="stat-info">
            <p class="stat-label">Humidity</p>
            <p class="stat-value">{{ statistics.humidity.avg?.toFixed(1) || 'N/A' }} %</p>
            <p class="stat-range">{{ statistics.humidity.min?.toFixed(1) }} - {{ statistics.humidity.max?.toFixed(1) }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-info">
            <p class="stat-label">Power</p>
            <p class="stat-value">{{ statistics.power.avg?.toFixed(0) || 'N/A' }} W</p>
            <p class="stat-range">{{ statistics.power.min?.toFixed(0) }} - {{ statistics.power.max?.toFixed(0) }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔋</div>
          <div class="stat-info">
            <p class="stat-label">Total Energy</p>
            <p class="stat-value">{{ formatEnergy(statistics.totalEnergy) }}</p>
            <p class="stat-range">{{ statistics.totalRecords }} records</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <p class="stat-label">People Count</p>
            <p class="stat-value">{{ statistics.peopleCount.avg?.toFixed(0) || 'N/A' }}</p>
            <p class="stat-range">{{ statistics.peopleCount.min }} - {{ statistics.peopleCount.max }}</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-info">
            <p class="stat-label">Total Records</p>
            <p class="stat-value">{{ statistics.totalRecords }}</p>
            <p class="stat-range">Data points</p>
          </div>
        </div>
      </div>
      
      <div v-else class="no-data">
        <p>Tidak ada data untuk rentang tanggal yang dipilih</p>
      </div>
      
      <!-- Chart Controls -->
      <div v-if="statistics" class="chart-controls">
        <div class="control-group">
          <label>Interval:</label>
          <select v-model="chartInterval">
            <option value="hourly">Per Jam</option>
            <option value="daily">Per Hari</option>
            <option value="weekly">Per Minggu</option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Metric:</label>
          <select v-model="selectedMetric">
            <option value="temperature">Temperature</option>
            <option value="humidity">Humidity</option>
            <option value="power">Power</option>
            <option value="peopleCount">People Count</option>
          </select>
        </div>
        
        <label class="comparison-toggle">
          <input type="checkbox" v-model="comparisonMode" />
          <span>Comparison Mode</span>
        </label>
      </div>
      
      <!-- Trend Chart -->
      <div v-if="chartData && chartData.labels.length > 0" class="chart-container">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      
      <!-- Export Button -->
      <div class="export-section">
        <button @click="handleExport" class="export-btn">
          📥 Export to CSV
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { useHistoricalData } from '../composables/useHistoricalData'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  isDarkMode: Boolean
})

const { historicalData, isLoading, loadHistoricalData, getDataByDateRange, getAggregatedData, exportToCSV, getStatistics } = useHistoricalData()

const isExpanded = ref(false)

// Load data from Azure Storage when component mounts
onMounted(async () => {
  console.log('🔄 HistoricalAnalytics: Loading data from Azure Storage...')
  await loadHistoricalData()
  console.log('📊 HistoricalAnalytics: Data loaded, total records:', historicalData.value.length)
})
const today = new Date().toISOString().split('T')[0]
const endDate = ref(today)
const startDate = ref(getDateDaysAgo(7))

const chartInterval = ref('daily')
const selectedMetric = ref('temperature')
const comparisonMode = ref(false)

function getDateDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function selectToday() {
  startDate.value = today
  endDate.value = today
}

function selectYesterday() {
  const yesterday = getDateDaysAgo(1)
  startDate.value = yesterday
  endDate.value = yesterday
}

function select7Days() {
  startDate.value = getDateDaysAgo(7)
  endDate.value = today
}

function select30Days() {
  startDate.value = getDateDaysAgo(30)
  endDate.value = today
}

const statistics = computed(() => {
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  end.setHours(23, 59, 59, 999)
  
  return getStatistics(start, end)
})

const chartData = computed(() => {
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  end.setHours(23, 59, 59, 999)
  
  const aggregated = getAggregatedData(start, end, chartInterval.value)
  
  if (aggregated.length === 0) return null
  
  const labels = aggregated.map(item => {
    if (chartInterval.value === 'hourly') {
      return item.timestamp.split(' ')[1]
    } else if (chartInterval.value === 'daily') {
      return item.timestamp
    } else {
      return item.timestamp
    }
  })
  
  const data = aggregated.map(item => item[selectedMetric.value])
  
  return {
    labels,
    datasets: [{
      label: getMetricLabel(selectedMetric.value),
      data,
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: props.isDarkMode ? '#e5e7eb' : '#374151'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  },
  scales: {
    x: {
      ticks: {
        color: props.isDarkMode ? '#9ca3af' : '#6b7280',
        maxRotation: 45,
        minRotation: 0
      },
      grid: {
        color: props.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      }
    },
    y: {
      ticks: {
        color: props.isDarkMode ? '#9ca3af' : '#6b7280'
      },
      grid: {
        color: props.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      }
    }
  }
}))

function getMetricLabel(metric) {
  const labels = {
    temperature: 'Temperature (°C)',
    humidity: 'Humidity (%)',
    power: 'Power (W)',
    peopleCount: 'People Count'
  }
  return labels[metric] || metric
}

function formatEnergy(wh) {
  if (wh === null || wh === undefined) return 'N/A'
  if (wh < 0) return '0 Wh' // Prevent negative values
  if (wh >= 1000) {
    return `${(wh / 1000).toFixed(2)} kWh`
  }
  return `${wh.toFixed(2)} Wh`
}

function handleExport() {
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  end.setHours(23, 59, 59, 999)
  
  exportToCSV(start, end)
}
</script>

<style scoped>
.historical-section {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.historical-section.dark {
  background: #1e293b;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #06b6d4;
}

.toggle-btn {
  background: #06b6d4;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: #0891b2;
  transform: translateY(-2px);
}

.section-content {
  margin-top: 20px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.date-range-section {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.dark .date-range-section {
  background: #0f172a;
}

.date-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.input-group label {
  font-weight: 600;
  color: #475569;
}

.dark .input-group label {
  color: #cbd5e1;
}

.input-group input {
  padding: 10px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.dark .input-group input {
  background: #1e293b;
  border-color: #334155;
  color: #e5e7eb;
}

.input-group input:focus {
  outline: none;
  border-color: #06b6d4;
}

.quick-selects {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-selects button {
  padding: 8px 16px;
  background: white;
  border: 2px solid #06b6d4;
  color: #06b6d4;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dark .quick-selects button {
  background: #1e293b;
  border-color: #0891b2;
  color: #06b6d4;
}

.quick-selects button:hover {
  background: #06b6d4;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(6, 182, 212, 0.2);
  display: flex;
  gap: 15px;
  align-items: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 12px rgba(6, 182, 212, 0.3);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-info {
  flex: 1;
}

.stat-label {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-value {
  margin: 5px 0;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-range {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  font-size: 1.1rem;
}

.chart-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-weight: 600;
  color: #475569;
}

.dark .control-group label {
  color: #cbd5e1;
}

.control-group select {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dark .control-group select {
  background: #1e293b;
  border-color: #334155;
  color: #e5e7eb;
}

.control-group select:focus {
  outline: none;
  border-color: #06b6d4;
}

.comparison-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  user-select: none;
}

.dark .comparison-toggle {
  color: #cbd5e1;
}

.comparison-toggle input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.chart-container {
  height: 400px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8fafc;
  border-radius: 8px;
}

.dark .chart-container {
  background: #0f172a;
}

.export-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.export-btn {
  padding: 12px 30px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
  transition: all 0.3s ease;
}

.export-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 12px rgba(16, 185, 129, 0.4);
}

@media (max-width: 768px) {
  .historical-section {
    padding: 15px;
  }
  
  .section-header h2 {
    font-size: 1.2rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .chart-container {
    height: 300px;
  }
}
</style>
