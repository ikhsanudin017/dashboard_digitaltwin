<template>
  <div class="historical-section" :class="{ 'dark': isDarkMode }">
    <!-- Hero Banner -->
    <div class="hero-banner">
      <div class="hero-kicker">HISTORICAL ANALYTICS</div>
      <h2>Analisis Data Sensor</h2>
      <p>Monitor dan analisis data historis dari sensor IoT untuk insight energi</p>
      <div class="hero-meta">
        <span class="meta-badge">Last Sync: {{ lastSyncText }}</span>
        <span class="meta-badge data-count">{{ statistics?.totalRecords || 0 }} Data Points</span>
      </div>
    </div>

    <div v-if="forecastPower != null" class="forecast-marker-card">
      <div>
        <span class="forecast-kicker">FORECAST +30 MENIT</span>
        <strong>{{ Math.round(forecastPower) }} W</strong>
      </div>
      <div>
        <span>Target waktu</span>
        <strong>{{ forecastTimeText }}</strong>
      </div>
      <div>
        <span>Sumber</span>
        <strong>{{ forecastSource }}</strong>
      </div>
      <p>Marker forecast adalah satu titik masa depan dan tidak dihitung sebagai data historis aktual.</p>
    </div>

    <!-- Quick Select Tabs -->
    <div class="quick-tabs">
      <button :class="['tab-btn', { active: activeTab === 'today' }]" @click="selectToday">Hari Ini</button>
      <button :class="['tab-btn', { active: activeTab === 'yesterday' }]" @click="selectYesterday">Kemarin</button>
      <button :class="['tab-btn', { active: activeTab === '7days' }]" @click="select7Days">7 Hari</button>
      <button :class="['tab-btn', { active: activeTab === '30days' }]" @click="select30Days">30 Hari</button>
      <button :class="['tab-btn', { active: activeTab === '90days' }]" @click="select90Days">90 Hari</button>
      <button :class="['tab-btn', { active: activeTab === 'all' }]" @click="selectAllTime">All Time</button>
      <div class="tab-spacer"></div>
      <button class="refresh-btn" :disabled="isRefreshing || isLoading" @click="refreshHistoricalData()">
        {{ isRefreshing || isLoading ? 'Menyegarkan...' : 'Refresh' }}
      </button>
    </div>

    <!-- Date Range Inputs -->
    <div class="date-range-bar">
      <div class="date-input-group">
        <label>Dari Tanggal</label>
        <input type="date" v-model="tempStartDate" :max="tempEndDate" />
      </div>
      <div class="date-separator">-</div>
      <div class="date-input-group">
        <label>Sampai Tanggal</label>
        <input type="date" v-model="tempEndDate" :min="tempStartDate" :max="today" />
      </div>
      <button class="apply-btn" @click="applyFilter">Cari Data</button>
    </div>

    <!-- Stats Grid -->
    <div v-if="statistics" class="stats-section">
      <h3 class="section-title">Statistik Ringkasan</h3>
      <div class="stats-grid">
        <div class="stat-card temp-card">
          <div class="stat-card-header">
            <span class="stat-label-lg">Temperature</span>
            <span :class="['stat-trend', temperatureTrend.isPositive ? 'positive' : 'negative']">
              {{ temperatureTrend.percent === 'N/A' ? 'N/A' : (temperatureTrend.current > temperatureTrend.previous ? '+' : '') + temperatureTrend.percent + '%' }}
            </span>
          </div>
          <div class="stat-value-lg">{{ statistics.temperature.avg?.toFixed(1) || 'N/A' }}°C</div>
          <div class="stat-range">{{ statistics.temperature.min?.toFixed(1) }} - {{ statistics.temperature.max?.toFixed(1) }}°C</div>
        </div>

        <div class="stat-card humid-card">
          <div class="stat-card-header">
            <span class="stat-label-lg">Humidity</span>
            <span :class="['stat-trend', humidityTrend.isPositive ? 'positive' : 'negative']">
              {{ humidityTrend.percent === 'N/A' ? 'N/A' : (humidityTrend.current > humidityTrend.previous ? '+' : '') + humidityTrend.percent + '%' }}
            </span>
          </div>
          <div class="stat-value-lg">{{ statistics.humidity.avg?.toFixed(1) || 'N/A' }}%</div>
          <div class="stat-range">{{ statistics.humidity.min?.toFixed(1) }} - {{ statistics.humidity.max?.toFixed(1) }}%</div>
        </div>

        <div class="stat-card power-card">
          <div class="stat-card-header">
            <span class="stat-label-lg">Average Power</span>
            <span :class="['stat-trend', powerTrend.isPositive ? 'positive' : 'negative']">
              {{ powerTrend.percent === 'N/A' ? 'N/A' : ((powerTrend.current || 0) > (powerTrend.previous || 0) ? '+' : '') + powerTrend.percent + '%' }}
            </span>
          </div>
          <div class="stat-value-lg">{{ statistics.power.avg?.toFixed(0) || 'N/A' }}W</div>
          <div class="stat-range">{{ statistics.power.min?.toFixed(0) }} - {{ statistics.power.max?.toFixed(0) }}W</div>
        </div>

        <div class="stat-card energy-card">
          <div class="stat-card-header">
            <span class="stat-label-lg">Total Energy</span>
          </div>
          <div class="stat-value-lg">{{ formatEnergy(statistics.totalEnergy) }}</div>
          <div class="stat-range">{{ statistics.totalRecords }} records</div>
        </div>

        <div class="stat-card people-card">
          <div class="stat-card-header">
            <span class="stat-label-lg">People Count</span>
          </div>
          <div class="stat-value-lg">{{ currentPeopleCount }}</div>
          <div class="stat-range">Real-time dari kamera</div>
        </div>
      </div>
    </div>

    <div v-else class="no-data-card">
      <p>Tidak ada data untuk rentang tanggal yang dipilih</p>
    </div>

    <!-- Chart Controls & Chart -->
    <div v-if="chartData && chartData.labels.length > 0" class="chart-section">
      <div class="chart-header">
        <h3 class="section-title">Trend Chart</h3>
        <div class="chart-controls">
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
      </div>
      <div class="chart-container">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- Data Preview Table (Admin Only) -->
    <div v-if="isAdmin" class="preview-section">
      <div class="preview-header">
        <h3 class="section-title">Preview Data Mentah (10 Terakhir)</h3>
        <button @click="handleExport" class="export-btn">Export to CSV</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Suhu (°C)</th>
              <th>Kelembaban (%)</th>
              <th>Tegangan (V)</th>
              <th>Arus (A)</th>
              <th>Daya (W)</th>
              <th>Orang</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewData" :key="i">
              <td>{{ formatTimestamp(row.timestamp) }}</td>
              <td>{{ row.temperature?.toFixed(2) || '-' }}</td>
              <td>{{ row.humidity?.toFixed(2) || '-' }}</td>
              <td>{{ row.voltage?.toFixed(2) || '-' }}</td>
              <td>{{ row.current?.toFixed(2) || '-' }}</td>
              <td>{{ row.power?.toFixed(2) || '-' }}</td>
              <td>{{ row.peopleCount ?? '-' }}</td>
            </tr>
            <tr v-if="previewData.length === 0">
              <td colspan="7" class="empty-row">Tidak ada data untuk rentang tanggal ini</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { useHistoricalData } from '../composables/useHistoricalData'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  isDarkMode: Boolean,
  currentPeopleCount: {
    type: Number,
    default: 0
  },
  isAdmin: {
    type: Boolean,
    default: true
  },
  forecastPower: { type: Number, default: null },
  forecastTargetTime: { type: String, default: null },
  forecastSource: { type: String, default: 'N/A' }
})

const forecastTimeText = computed(() => props.forecastTargetTime
  ? new Date(props.forecastTargetTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  : 'N/A')

const {
  historicalData,
  isLoading,
  loadHistoricalData,
  loadHistoricalDataForRange,
  getDataByDateRange,
  getAggregatedData,
  getAvailableDateRange,
  exportToCSV,
  getStatistics
} = useHistoricalData()

const isExpanded = ref(true)
const AUTO_REFRESH_INTERVAL = 30000
let refreshTimer = null
const lastSyncAt = ref(null)
const isRefreshing = ref(false)
const activeTab = ref('7days')

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateInput(value, endOfDay = false) {
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
}

onMounted(async () => {
  await refreshHistoricalData()
  refreshTimer = setInterval(() => {
    refreshHistoricalData(true)
  }, AUTO_REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

const today = formatDateInput(new Date())
const endDate = ref(today)
const startDate = ref(getDateDaysAgo(7))

const tempStartDate = ref(startDate.value)
const tempEndDate = ref(endDate.value)

const chartInterval = ref('daily')
const selectedMetric = ref('temperature')
const comparisonMode = ref(false)
const availableDateRange = computed(() => getAvailableDateRange())
const lastSyncText = computed(() => {
  if (!lastSyncAt.value) return 'Belum sinkron'
  return lastSyncAt.value.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

function getDateDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return formatDateInput(date)
}

async function applyFilter() {
  startDate.value = tempStartDate.value
  endDate.value = tempEndDate.value
  await refreshHistoricalData()
}

async function selectToday() {
  activeTab.value = 'today'
  tempStartDate.value = today
  tempEndDate.value = today
  await applyFilter()
}

async function selectYesterday() {
  activeTab.value = 'yesterday'
  const yesterday = getDateDaysAgo(1)
  tempStartDate.value = yesterday
  tempEndDate.value = yesterday
  await applyFilter()
}

async function select7Days() {
  activeTab.value = '7days'
  tempStartDate.value = getDateDaysAgo(7)
  tempEndDate.value = today
  await applyFilter()
}

async function select30Days() {
  activeTab.value = '30days'
  tempStartDate.value = getDateDaysAgo(30)
  tempEndDate.value = today
  await applyFilter()
}

async function select90Days() {
  activeTab.value = '90days'
  tempStartDate.value = getDateDaysAgo(90)
  tempEndDate.value = today
  await applyFilter()
}

async function selectAllTime() {
  activeTab.value = 'all'
  await loadHistoricalData({ background: true })
  const range = getAvailableDateRange()
  if (!range) return
  tempStartDate.value = range.startDate
  tempEndDate.value = range.endDate
  await applyFilter()
}

async function refreshHistoricalData(background = false) {
  if (!background) {
    isRefreshing.value = true
  }
  try {
    const start = parseDateInput(startDate.value)
    const end = parseDateInput(endDate.value, true)
    await loadHistoricalDataForRange(start, end, { background })
    lastSyncAt.value = new Date()
  } finally {
    if (!background) {
      isRefreshing.value = false
    }
  }
}

const statistics = computed(() => {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  return getStatistics(start, end)
})

// Use computed properties that depend on reactive startDate/endDate
const temperatureTrend = computed(() => {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  return getTrendForMetric('temperature', start, end)
})

const humidityTrend = computed(() => {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  return getTrendForMetric('humidity', start, end)
})

const powerTrend = computed(() => {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  return getTrendForMetric('power', start, end)
})

// Helper function that uses reactive values
function getTrendForMetric(metric, start, end) {
  if (!start || !end) return { percent: 'N/A', isPositive: true, current: null, previous: null }

  const periodMs = end - start
  if (periodMs <= 0) return { percent: 'N/A', isPositive: true, current: null, previous: null }

  // Access reactive historicalData to ensure dependency tracking
  const _ = historicalData.value.length

  const currentStats = getStatistics(start, end)
  if (!currentStats) return { percent: 'N/A', isPositive: true, current: null, previous: null }

  const current = currentStats[metric]?.avg
  if (current === null || current === undefined) return { percent: 'N/A', isPositive: true, current: null, previous: null }

  // Previous period calculation
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(start.getTime() - periodMs - 1)
  const prevStats = getStatistics(prevStart, prevEnd)

  // If no previous period data, compare first half vs second half of current period
  if (!prevStats || prevStats[metric]?.avg === null || prevStats[metric]?.avg === undefined) {
    const midpoint = new Date((start.getTime() + end.getTime()) / 2)
    const firstHalfStats = getStatistics(start, midpoint)
    const secondHalfStats = getStatistics(midpoint, end)

    const firstHalf = firstHalfStats?.[metric]?.avg
    const secondHalf = secondHalfStats?.[metric]?.avg

    if (firstHalf && secondHalf && firstHalf > 0) {
      const percent = ((secondHalf - firstHalf) / firstHalf) * 100
      let isPositive
      if (metric === 'power') {
        isPositive = percent <= 0
      } else {
        isPositive = percent >= 0
      }
      return {
        percent: Math.abs(percent).toFixed(1),
        isPositive,
        current: secondHalf,
        previous: firstHalf,
        note: 'vs periode pertama'
      }
    }

    return { percent: 'N/A', isPositive: true, current, previous: null }
  }

  const previous = prevStats[metric]?.avg
  if (previous === null || previous === undefined || previous === 0) {
    return { percent: 'N/A', isPositive: true, current, previous }
  }

  const percent = ((current - previous) / previous) * 100
  let isPositive
  if (metric === 'power') {
    isPositive = percent <= 0
  } else {
    isPositive = percent >= 0
  }

  return {
    percent: Math.abs(percent).toFixed(1),
    isPositive,
    current,
    previous
  }
}

const chartData = computed(() => {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  const aggregated = getAggregatedData(start, end, chartInterval.value)
  if (aggregated.length === 0) return null
  const labels = aggregated.map(item => {
    if (chartInterval.value === 'hourly') {
      return item.timestamp.split(' ')[1]
    } else {
      return item.timestamp
    }
  })
  const data = aggregated.map(item => item[selectedMetric.value])

  const datasets = [{
    label: getMetricLabel(selectedMetric.value),
    data,
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    tension: 0.4,
    fill: true,
    pointRadius: 4,
    pointHoverRadius: 6
  }]

  // Add comparison dataset
  if (comparisonMode.value) {
    const periodMs = end - start
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(start.getTime() - periodMs - 1)
    const prevAggregated = getAggregatedData(prevStart, prevEnd, chartInterval.value)
    const prevData = prevAggregated.map(item => item[selectedMetric.value])

    datasets.push({
      label: `Prev: ${getMetricLabel(selectedMetric.value)}`,
      data: prevData,
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderDash: [5, 5]
    })
  }

  return { labels, datasets }
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
  if (wh < 0) return '0 Wh'
  if (wh >= 1000) {
    return `${(wh / 1000).toFixed(2)} kWh`
  }
  return `${wh.toFixed(2)} Wh`
}

function handleExport() {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  exportToCSV(start, end)
}

const previewData = computed(() => {
  const start = parseDateInput(startDate.value)
  const end = parseDateInput(endDate.value, true)
  const rangeData = getDataByDateRange(start, end)
  if (!rangeData || rangeData.length === 0) return []
  return [...rangeData].reverse().slice(0, 10)
})

const formatTimestamp = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID')}`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap');

.historical-section {
  --accent: #06b6d4;
  --accent-dark: #0891b2;
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-2: #475569;
  --text-3: #94a3b8;
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;
  --purple: #a855f7;

  font-family: 'IBM Plex Sans', sans-serif;
  padding: 24px;
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-banner { margin-bottom: 24px; }

.forecast-marker-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr)) 2fr;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border: 1px dashed var(--accent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
}
.forecast-marker-card div { display: flex; flex-direction: column; gap: 4px; }
.forecast-marker-card span, .forecast-marker-card p { color: var(--text-2); font-size: 11px; }
.forecast-marker-card strong { color: var(--text); font-family: 'Sora', sans-serif; }
.forecast-marker-card p { margin: 0; }
.forecast-kicker { color: var(--accent) !important; font-weight: 800; }

@media (max-width: 800px) {
  .forecast-marker-card { grid-template-columns: 1fr 1fr; }
  .forecast-marker-card p { grid-column: 1 / -1; }
}

.hero-kicker {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.hero-banner h2 {
  font-family: 'Sora', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px 0;
}

.hero-banner p {
  font-size: 0.95rem;
  color: var(--text-2);
  margin: 0 0 16px 0;
}

.hero-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-badge {
  display: inline-block;
  padding: 8px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--text-2);
}

.meta-badge.data-count {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.2);
  color: var(--success);
}

.quick-tabs {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.tab-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

.tab-btn.active {
  background: var(--accent);
  color: white;
  font-weight: 600;
}

.tab-spacer { flex: 1; }

.refresh-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  border: none;
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.date-range-bar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 160px;
}

.date-input-group label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.date-input-group input {
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--surface);
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.date-input-group input:focus {
  outline: none;
  border-color: var(--accent);
}

.date-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: var(--text-3);
  font-weight: 600;
}

.apply-btn {
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  border: none;
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.apply-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
}

.section-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 16px 0;
}

.stats-section { margin-bottom: 24px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.temp-card { border-top: 3px solid var(--accent); }
.humid-card { border-top: 3px solid var(--purple); }
.power-card { border-top: 3px solid var(--warning); }
.energy-card { border-top: 3px solid var(--success); }
.people-card { border-top: 3px solid var(--danger); }

.stat-label-lg {
  font-size: 0.85rem;
  color: var(--text-2);
  font-weight: 600;
}

.stat-trend {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-trend.positive {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.stat-trend.negative {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.stat-value-lg {
  font-family: 'Sora', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.stat-range {
  font-size: 0.78rem;
  color: var(--text-3);
}

.no-data-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: center;
}

.no-data-card p {
  font-size: 1rem;
  color: var(--text-2);
  margin: 0;
}

.chart-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-2);
}

.control-group select {
  padding: 8px 12px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--text);
  background: var(--surface);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.control-group select:focus {
  outline: none;
  border-color: var(--accent);
}

.comparison-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
}

.comparison-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.chart-container {
  height: 350px;
  margin-top: 16px;
}

.preview-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.export-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--success), #059669);
  border: none;
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  white-space: nowrap;
}

.data-table th {
  background: var(--surface-2);
  color: var(--text);
  font-weight: 600;
  padding: 14px 16px;
  text-align: left;
  border-bottom: 2px solid var(--border);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-2);
}

.data-table tbody tr:hover {
  background: rgba(6, 182, 212, 0.04);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.empty-row {
  text-align: center;
  padding: 24px;
  color: var(--text-3);
}

.dark {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-2: #334155;
  --border: rgba(255, 255, 255, 0.1);
  --text: #f1f5f9;
  --text-2: #cbd5e1;
  --text-3: #94a3b8;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .historical-section {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chart-controls {
    width: 100%;
  }

  .control-group {
    width: 100%;
  }

  .control-group select {
    width: 100%;
  }

  .date-range-bar {
    flex-direction: column;
  }

  .date-input-group {
    width: 100%;
  }

  .date-separator {
    display: none;
  }

  .apply-btn {
    width: 100%;
    justify-content: center;
  }

  .quick-tabs {
    flex-direction: column;
  }

  .tab-spacer {
    display: none;
  }

  .refresh-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
