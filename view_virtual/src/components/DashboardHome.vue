<template>
  <div class="dashboard" :class="{ dark: isDarkMode }">
    <!-- Full-Screen 3D Background -->
    <div class="viewer-3d">
      <CesiumViewer
        v-if="current3DView === 'cesium'"
        :sensor-data="sensorData"
        :is-dark-mode="isDarkMode"
        :show-info-card="false"
        :building-lod="selectedBuildingLod"
        @toggle-indoor="current3DView = 'babylon'"
        @switch-to-3d="current3DView = 'babylon'"
      />
      <DigitalTwinBabylon
        v-else
        :sensor-data="sensorData"
        :people-count="peopleCount"
        :is-dark-mode="isDarkMode"
        :building-lod="selectedBuildingLod"
      />
    </div>

    <!-- ═══ LEFT SIDEBAR ═══ -->
    <aside class="sidebar sidebar-left">
      <div class="main-card">
        <!-- Header -->
        <div class="card-header">
          <div class="header-row">
            <div class="logo-section">
              <img src="/logo.png" alt="Logo" class="brand-logo" />
              <span class="brand">TWINUVO</span>
            </div>
            <span class="status-badge" :class="isConnected ? 'online' : 'offline'">
              <span class="dot"></span>
              {{ isConnected ? 'ONLINE' : 'OFFLINE' }}
            </span>
          </div>
        </div>

        <!-- IOT SENSOR -->
        <div class="section-header">
          <span>IOT SENSOR</span>
        </div>
        <div class="sensor-list">
          <div class="sensor-item">
            <span class="sensor-label">TEMP</span>
            <span class="sensor-value temp">{{ sensorData.temperature?.toFixed(1) || '--' }}°C</span>
          </div>
          <div class="sensor-item">
            <span class="sensor-label">HUMID</span>
            <span class="sensor-value humid">{{ sensorData.humidity?.toFixed(1) || '--' }}%</span>
          </div>
          <div class="sensor-item">
            <span class="sensor-label">POWER</span>
            <span class="sensor-value power">{{ sensorData.power?.toFixed(0) || '--' }}W</span>
          </div>
          <div class="sensor-item">
            <span class="sensor-label">VOLT</span>
            <span class="sensor-value voltage">{{ sensorData.voltage?.toFixed(0) || '--' }}V</span>
          </div>
        </div>

        <!-- AC RECOMMENDATION -->
        <div class="section-header">
          <span>AC TARGET</span>
        </div>
        <div class="ac-target-card">
          <span class="ac-temp-value">{{ acRecommendedTemp }}°C</span>
          <span class="ac-label">Rekomendasi</span>
          <span class="ai-source-badge" :class="aiSourceClass">{{ aiSourceLabel }}</span>
          <span class="approval-label">Perlu persetujuan pengguna</span>
        </div>

        <div class="section-header">
          <span>AI INSIGHT</span>
        </div>
        <div class="ai-summary-grid">
          <div class="ai-summary-item">
            <span class="ai-summary-label">FORECAST +30</span>
            <strong>{{ forecastPowerText }}</strong>
            <small :class="forecastDeltaClass">{{ forecastDeltaText }}</small>
          </div>
          <div class="ai-summary-item">
            <span class="ai-summary-label">COMFORT</span>
            <strong>{{ comfortScoreText }}</strong>
            <small>{{ comfortLabel }}</small>
          </div>
        </div>

        <!-- STATS -->
        <div class="section-header">
          <span>STATS</span>
        </div>
        <div class="stats-list">
          <div class="stat-item">
            <span class="stat-label">PEOPLE</span>
            <span class="stat-value">{{ peopleCount || sensorData.peopleCount || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">ENERGY</span>
            <span class="stat-value">{{ totalEnergyWh.toFixed(1) }}Wh</span>
          </div>
        </div>

        <!-- BUILDING LOD -->
        <div class="section-header lod-section-header">
          <span>BUILDING LOD</span>
        </div>
        <div class="lod-selector" role="group" aria-label="Building LOD">
          <button
            v-for="option in buildingLodOptions"
            :key="option.value"
            type="button"
            class="lod-btn"
            :class="{ active: selectedBuildingLod === option.value }"
            @click="selectedBuildingLod = option.value"
          >
            <span class="lod-code">LOD {{ option.value }}</span>
            <span class="lod-name">{{ option.label }}</span>
          </button>
        </div>

      </div>
    </aside>

    <!-- ═══ RIGHT SIDEBAR ═══ -->
    <aside class="sidebar sidebar-right">
      <div class="main-card">
        <!-- Time Header -->
        <div class="card-header">
          <span class="time-display">{{ formattedTime }}</span>
        </div>

        <!-- 3D VIEW -->
        <div class="section-header">
          <span>3D VIEW</span>
        </div>
        <div class="view-toggle">
          <button
            :class="['view-btn', { active: current3DView === 'cesium' }]"
            @click="current3DView = 'cesium'"
          >
            Map
          </button>
          <button
            :class="['view-btn', { active: current3DView === 'babylon' }]"
            @click="current3DView = 'babylon'"
          >
            Indoor
          </button>
        </div>

        <!-- FEATURES -->
        <div class="section-header">
          <span>FEATURES</span>
        </div>
        <div class="menu-grid">
          <button class="menu-btn" @click="selectSection('energy')">
            Energy
          </button>
          <button class="menu-btn" @click="selectSection('analytics')">
            Analytics
          </button>
          <button class="menu-btn" @click="selectSection('camera')">
            Vision
          </button>
          <button class="menu-btn" @click="selectSection('settings')">
            Settings
          </button>
        </div>

        <!-- THEME -->
        <button class="theme-btn" @click="handleThemeToggle">
          <svg v-if="isDarkMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span>{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>

        <!-- Footer -->
        <div class="card-footer">
          <span>-7.7230, 110.5187</span>
        </div>
      </div>
    </aside>

    <!-- ═══ MODAL ═══ -->
    <Teleport to="body">
      <div
        v-if="activeSection !== 'overview'"
        class="modal-overlay"
        :class="{ dark: isDarkMode }"
        @click.self="activeSection = 'overview'"
      >
        <div class="modal-content">
          <button class="modal-close" @click="activeSection = 'overview'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div v-if="activeSection === 'energy'" class="modal-body">
            <h2>ENERGY MANAGEMENT</h2>
            <EnergyManagement
              :is-dark-mode="isDarkMode"
              :current-power="sensorData.power"
              :is-admin="false"
              :ml-insight="mlInsight"
            />
          </div>

          <div v-if="activeSection === 'analytics'" class="modal-body">
            <h2>HISTORICAL ANALYTICS</h2>
            <HistoricalAnalytics
              :is-dark-mode="isDarkMode"
              :current-people-count="peopleCount"
              :is-admin="false"
              :forecast-power="forecastPower"
              :forecast-target-time="mlPrediction.forecastMeta.value?.targetTime"
              :forecast-source="aiSourceLabel"
            />
          </div>

          <div v-if="activeSection === 'camera'" class="modal-body">
            <h2>VISION SYSTEM</h2>
            <CameraStream :is-dark-mode="isDarkMode" @people-count-update="handlePeopleCountUpdate" />
          </div>

          <div v-if="activeSection === 'settings'" class="modal-body">
            <h2>SETTINGS</h2>
            <div class="settings-grid">
              <div class="settings-card">
                <h4>Profile</h4>
                <div class="profile-row">
                  <img v-if="user?.photoURL" :src="user.photoURL" class="profile-avatar" referrerpolicy="no-referrer"/>
                  <div v-else class="profile-avatar fallback">{{ userInitials }}</div>
                  <div>
                    <p class="profile-name">{{ displayName }}</p>
                    <p class="profile-email">{{ user?.email || 'Operator' }}</p>
                  </div>
                </div>
              </div>
              <div class="settings-card">
                <h4>System</h4>
                <p>Status: <span :class="isConnected ? 'online' : 'offline'">{{ isConnected ? 'Online' : 'Offline' }}</span></p>
                <p>Energy: {{ totalEnergyWh.toFixed(2) }} Wh</p>
              </div>
            </div>
            <button class="logout-btn" @click="handleLogout">LOGOUT</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch, defineAsyncComponent } from 'vue'

// Lazy load heavy 3D components
const CesiumViewer = defineAsyncComponent(() =>
  import('./CesiumViewer.vue')
)
const DigitalTwinBabylon = defineAsyncComponent(() =>
  import('./DigitalTwin3D_Babylon.vue')
)
const CameraStream = defineAsyncComponent(() =>
  import('./CameraStream.vue')
)
const EnergyManagement = defineAsyncComponent(() =>
  import('./EnergyManagement.vue')
)
const HistoricalAnalytics = defineAsyncComponent(() =>
  import('./HistoricalAnalytics.vue')
)

import { useHistoricalData } from '../composables/useHistoricalData'
import { useAzureTelemetry } from '../composables/useAzureTelemetry'
import { useMLPrediction } from '../composables/useMLPrediction'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  user: { type: Object, default: null }
})

const emit = defineEmits(['toggle-theme', 'logout'])

const activeSection = ref('overview')
const current3DView = ref('cesium')
const selectedBuildingLod = ref(3)
const buildingLodOptions = [
  { value: 1, label: 'Massa' },
  { value: 2, label: 'Atap' },
  { value: 3, label: 'Fasad' },
  { value: 4, label: 'Detail' }
]

const { isConnected, sensorData, startPolling, stopPolling } = useAzureTelemetry()
const { loadHistoricalData, addDataPoint } = useHistoricalData()
const mlPrediction = useMLPrediction()

const peopleCount = ref(0)
const totalEnergyWh = ref(0)
const currentTime = ref(new Date())
const electricityData = ref({ values: [] })

const SAVE_INTERVAL = 30000
const MAX_POINTS = 60
let lastSaveTimestamp = 0
let timeInterval = null
let lastPowerTimestamp = Date.now()

const displayName = computed(() => props.user?.displayName || props.user?.email || 'Operator')
const userInitials = computed(() => {
  const src = displayName.value.trim()
  if (!src) return 'OP'
  return src.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
})
const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
})

const acRecommendedTemp = computed(() => {
  const temp = mlPrediction.acRecommendation.value?.recommendedTemp
  return temp ? Math.round(temp) : '--'
})

const forecastPower = computed(() => {
  const value = mlPrediction.energyPrediction.value?.predictedWatt
  return Number.isFinite(value) && mlPrediction.lastPrediction.value ? value : null
})
const forecastPowerText = computed(() => forecastPower.value == null ? '--' : `${Math.round(forecastPower.value)}W`)
const forecastDelta = computed(() => forecastPower.value == null ? null : forecastPower.value - Number(sensorData.value?.power || 0))
const forecastDeltaText = computed(() => {
  if (forecastDelta.value == null) return 'Menunggu prediksi'
  const sign = forecastDelta.value > 0 ? '+' : ''
  return `${sign}${forecastDelta.value.toFixed(0)}W dari sekarang`
})
const forecastDeltaClass = computed(() => forecastDelta.value > 0 ? 'trend-up' : 'trend-stable')
const comfortScoreText = computed(() => {
  const score = mlPrediction.comfortCalculation.value?.score
  return score == null ? '--' : `${Math.round(score)}/100`
})
const comfortLabel = computed(() => {
  const level = mlPrediction.comfortCalculation.value?.level
  return ({ comfortable: 'Nyaman', warm: 'Sedikit hangat', cool: 'Sedikit dingin' })[level] || 'Menunggu analisis'
})
const aiSourceLabel = computed(() => {
  const source = mlPrediction.predictionMeta.value?.source
  if (source === 'azure_ml') return 'AZURE ML · CANDIDATE V1'
  if (source === 'azure_function') return 'AZURE FUNCTION'
  if (source === 'ml_api') return 'ML API'
  if (source === 'local_calculation') return 'BASELINE LOKAL'
  return 'MENUNGGU AI'
})
const aiSourceClass = computed(() => mlPrediction.predictionMeta.value?.fallback_level > 0 ? 'fallback' : 'cloud')
const mlInsight = computed(() => ({
  currentPower: Number(sensorData.value?.power || 0),
  forecastPower: forecastPower.value,
  forecastDelta: forecastDelta.value,
  forecast: mlPrediction.forecastMeta.value,
  comfort: mlPrediction.comfortCalculation.value,
  recommendation: mlPrediction.acRecommendation.value,
  scenarios: mlPrediction.recommendationScenarios.value,
  meta: mlPrediction.predictionMeta.value,
  sourceLabel: aiSourceLabel.value
}))

const handleThemeToggle = () => emit('toggle-theme')
const handleLogout = () => emit('logout')
const selectSection = (id) => { activeSection.value = id }

const handlePeopleCountUpdate = async count => {
  peopleCount.value = count
  if (sensorData.value) sensorData.value.peopleCount = count
}

onMounted(() => {
  startPolling()
  loadHistoricalData()
  timeInterval = setInterval(() => { currentTime.value = new Date() }, 1000)
  // Trigger initial ML prediction
  triggerMLPrediction()
})

// Watch for sensor data changes and update ML prediction
watch(
  sensorData,
  async (newData) => {
    if (!newData) return

    // Update electricity data
    if (typeof newData.power === 'number') {
      const values = [...electricityData.value.values, parseFloat(newData.power.toFixed(2))]
      if (values.length > MAX_POINTS) values.shift()
      electricityData.value = { ...electricityData.value, values }
      const now = Date.now()
      const deltaHours = (now - lastPowerTimestamp) / 3600000
      if (deltaHours > 0 && deltaHours < 1) {
        totalEnergyWh.value += newData.power * deltaHours
      }
      lastPowerTimestamp = now
    }

    // Update people count
    if (typeof newData.peopleCount === 'number') {
      peopleCount.value = newData.peopleCount
    }

    // Save to historical data
    const now = Date.now()
    if (now - lastSaveTimestamp >= SAVE_INTERVAL) {
      addDataPoint(newData)
      lastSaveTimestamp = now
    }

    // Update ML prediction when sensor data changes significantly
    if (lastSensorSuhu === null || Math.abs(newData.temperature - lastSensorSuhu) >= 1) {
      lastSensorSuhu = newData.temperature
      triggerMLPrediction()
    }
  },
  { deep: true }
)

// Trigger ML prediction with current sensor data
const triggerMLPrediction = async () => {
  try {
    const sensorInput = {
      suhu: sensorData.value?.temperature || sensorData.value?.suhu || 25,
      kelembaban: sensorData.value?.humidity || sensorData.value?.kelembaban || 60,
      daya: sensorData.value?.power || sensorData.value?.daya || 0,
      jumlahOrang: sensorData.value?.peopleCount || peopleCount.value || 0
    }

    console.log('[Dashboard] Triggering ML prediction with:', sensorInput)
    await mlPrediction.getPrediction(sensorInput)
  } catch (err) {
    console.error('[Dashboard] ML prediction error:', err)
  }
}

let lastSensorSuhu = null
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard {
  --accent: #0891b2;
  --accent-strong: #0e7490;
  --accent-soft: rgba(8, 145, 178, 0.11);
  --bg: linear-gradient(135deg, #f8fafc 0%, #eef7fb 52%, #f7fbf5 100%);
  --panel: rgba(255, 255, 255, 0.9);
  --panel-solid: #f8fafc;
  --surface-soft: rgba(15, 23, 42, 0.04);
  --surface-hover: rgba(15, 23, 42, 0.07);
  --button-soft: rgba(255, 255, 255, 0.78);
  --border: rgba(15, 23, 42, 0.12);
  --text: #0f172a;
  --text-2: #475569;
  --text-3: #64748b;
  --success: #059669;
  --danger: #dc2626;
  --sidebar-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
  overflow: hidden;
}

.dashboard.dark {
  --accent: #00d4ff;
  --accent-strong: #22d3ee;
  --accent-soft: rgba(0, 212, 255, 0.15);
  --bg: #0a0f1a;
  --panel: rgba(10, 15, 30, 0.95);
  --panel-solid: #0d1117;
  --surface-soft: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.08);
  --button-soft: rgba(255, 255, 255, 0.05);
  --border: rgba(255, 255, 255, 0.1);
  --text: #f8fafc;
  --text-2: #94a3b8;
  --text-3: #64748b;
  --success: #22c55e;
  --danger: #ef4444;
  --sidebar-shadow: none;
}

/* ═══ VIEWER ═══ */
.viewer-3d {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 1;
}

/* ═══ SIDEBARS ═══ */
.sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 220px;
  z-index: 100;
}

.sidebar-left {
  left: 0;
}

.sidebar-right {
  right: 0;
}

/* Main Card - Single unified card */
.main-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 16px 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  box-shadow: var(--sidebar-shadow);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* Card Header */
.card-header {
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-icon {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.brand {
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.brand-logo {
  height: 28px;
  width: auto;
  object-fit: contain;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: 600;
}

.status-badge.online {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.status-badge.offline {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.status-badge .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.header-row2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version {
  font-size: 10px;
  color: var(--text-3);
}

.time-display {
  font-family: 'Sora', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  text-align: center;
  display: block;
}

/* Section Header */
.section-header {
  padding: 10px 0 8px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.section-header span {
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
}

/* Sensor List */
.sensor-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.sensor-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--surface-soft);
  border: 1px solid transparent;
  border-radius: 6px;
}

.sensor-label {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
}

.sensor-value {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
}

.sensor-value.temp { color: var(--accent-strong); }
.sensor-value.humid { color: #a855f7; }
.sensor-value.power { color: var(--success); }
.sensor-value.voltage { color: #f59e0b; }

/* AC Target Card */
.ac-target-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  background: linear-gradient(135deg, var(--accent-soft) 0%, rgba(168, 85, 247, 0.1) 100%);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 10px;
  margin-bottom: 12px;
}

.ac-temp-value {
  font-family: 'Sora', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-strong);
}

.ac-label {
  font-size: 10px;
  color: var(--text-3);
}

.ai-source-badge {
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}

.ai-source-badge.fallback { color: #d97706; background: rgba(245, 158, 11, 0.12); }
.approval-label { font-size: 8px; color: var(--text-3); }

.ai-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 12px;
}

.ai-summary-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
}

.ai-summary-label { font-size: 8px; color: var(--text-3); font-weight: 700; }
.ai-summary-item strong { font-family: 'Sora', sans-serif; font-size: 13px; color: var(--accent-strong); }
.ai-summary-item small { overflow: hidden; font-size: 8px; color: var(--text-3); text-overflow: ellipsis; white-space: nowrap; }
.ai-summary-item small.trend-up { color: #dc2626; }
.ai-summary-item small.trend-stable { color: var(--success); }

/* Stats List */
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--surface-soft);
  border: 1px solid transparent;
  border-radius: 6px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
}

.stat-value {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.lod-section-header {
  margin-top: 12px;
}

.lod-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 12px;
}

.lod-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-height: 52px;
  padding: 8px 9px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  font-family: 'IBM Plex Sans', sans-serif;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.lod-btn:hover {
  background: var(--surface-hover);
  border-color: var(--accent);
}

.lod-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.lod-code {
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
}

.lod-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
}

.lod-btn.active .lod-name {
  color: var(--accent-strong);
}

/* CCTV List */
.cctv-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.cctv-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-2);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.cctv-btn:hover {
  background: var(--surface-hover);
  border-color: var(--accent);
}

.cctv-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.cam-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
  flex-shrink: 0;
}

.cctv-btn.active .cam-dot {
  background: var(--success);
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.view-btn {
  flex: 1;
  padding: 10px 8px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.view-btn:hover {
  background: var(--surface-hover);
}

.view-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

/* Menu Grid */
.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.menu-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.menu-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.menu-btn span {
  font-size: 11px;
  font-weight: 600;
}

/* Theme Button */
.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: var(--button-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  margin-bottom: 12px;
}

.theme-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.theme-btn svg {
  width: 18px;
  height: 18px;
}

/* Footer */
.card-footer {
  text-align: center;
  padding-top: 12px;
  margin-top: auto;
  border-top: 1px solid var(--border);
}

.card-footer span {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  color: var(--text-3);
}

/* ═══ MODAL ═══ */
.modal-overlay {
  --accent: #0891b2;
  --accent-strong: #0e7490;
  --accent-soft: rgba(8, 145, 178, 0.1);
  --panel-solid: #f8fafc;
  --surface-soft: rgba(255, 255, 255, 0.78);
  --surface-hover: rgba(15, 23, 42, 0.07);
  --button-soft: rgba(255, 255, 255, 0.9);
  --border: rgba(15, 23, 42, 0.12);
  --text: #0f172a;
  --text-2: #475569;
  --text-3: #64748b;
  --success: #059669;
  --danger: #dc2626;
  --modal-overlay-bg: rgba(15, 23, 42, 0.38);
  --modal-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);

  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--modal-overlay-bg);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.modal-overlay.dark {
  --accent: #00d4ff;
  --accent-strong: #22d3ee;
  --accent-soft: rgba(0, 212, 255, 0.15);
  --panel-solid: #0d1117;
  --surface-soft: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.08);
  --button-soft: rgba(255, 255, 255, 0.1);
  --border: rgba(255, 255, 255, 0.1);
  --text: #f8fafc;
  --text-2: #94a3b8;
  --text-3: #64748b;
  --success: #22c55e;
  --danger: #ef4444;
  --modal-overlay-bg: rgba(0, 0, 0, 0.85);
  --modal-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 900px;
  max-height: calc(100vh - 60px);
  background: var(--panel-solid);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--modal-shadow);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-soft);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-2);
  cursor: pointer;
}

.modal-close:hover {
  background: var(--danger);
  color: #fff;
}

.modal-close svg {
  width: 16px;
  height: 16px;
}

.modal-body {
  padding: 30px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  color: var(--text);
}

.modal-body h2 {
  font-family: 'Sora', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--accent);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.settings-card {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
}

.settings-card h4 {
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  color: var(--accent);
  margin-bottom: 10px;
}

.settings-card p {
  font-size: 0.8rem;
  color: var(--text-2);
  margin-bottom: 4px;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid var(--accent);
}

.profile-avatar.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 212, 255, 0.2);
  color: var(--accent);
  font-family: 'Sora', sans-serif;
  font-weight: 700;
}

.profile-name {
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.profile-email {
  font-size: 0.7rem;
  color: var(--text-3);
  margin: 0;
}

.online { color: var(--success); }
.offline { color: var(--danger); }

.logout-btn {
  display: block;
  width: 100%;
  max-width: 150px;
  margin: 0 auto;
  padding: 12px;
  background: transparent;
  border: 1px solid var(--danger);
  border-radius: 6px;
  color: var(--danger);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.logout-btn:hover {
  background: var(--danger);
  color: #fff;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .dashboard {
    min-height: 100dvh;
    overflow: hidden;
  }

  .viewer-3d {
    height: 100dvh !important;
  }

  .sidebar {
    display: block;
    left: 8px;
    right: 8px;
    width: auto;
    z-index: 120;
    pointer-events: none;
  }

  .sidebar-left {
    top: 8px;
    bottom: auto;
    max-height: 36dvh;
  }

  .sidebar-right {
    top: auto;
    bottom: 42px;
    max-height: 25dvh;
  }

  .main-card {
    height: auto;
    max-height: inherit;
    padding: 8px;
    border-radius: 12px;
    overflow-y: auto;
    pointer-events: auto;
    scrollbar-width: thin;
  }

  .card-header {
    padding-bottom: 6px;
    margin-bottom: 6px;
  }

  .section-header {
    display: none;
  }

  .brand-logo {
    height: 20px;
  }

  .brand {
    font-size: 11px;
  }

  .status-badge {
    padding: 2px 7px;
    font-size: 8px;
  }

  .sensor-list,
  .stats-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    margin-bottom: 6px;
  }

  .sensor-item,
  .stat-item {
    min-height: 32px;
    padding: 5px 7px;
  }

  .sensor-label,
  .stat-label {
    font-size: 9px;
  }

  .sensor-value,
  .stat-value {
    font-size: 11px;
  }

  .ac-target-card {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    margin-bottom: 6px;
    min-height: 34px;
  }

  .ac-temp-value {
    font-size: 17px;
    line-height: 1;
  }

  .ac-label {
    font-size: 9px;
  }

  .approval-label { display: none; }
  .ai-summary-grid { margin-bottom: 6px; }

  .lod-selector {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    margin-bottom: 0;
  }

  .lod-btn {
    align-items: center;
    min-height: 30px;
    padding: 4px 3px;
    text-align: center;
  }

  .lod-code {
    font-size: 9px;
  }

  .lod-name {
    display: none;
  }

  .time-display {
    font-size: 16px;
    line-height: 1.1;
  }

  .view-toggle {
    gap: 5px;
    margin-bottom: 6px;
  }

  .view-btn,
  .theme-btn {
    min-height: 30px;
    padding: 6px 7px;
    font-size: 10px;
  }

  .menu-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
    margin-bottom: 6px;
  }

  .menu-btn {
    min-height: 30px;
    padding: 6px 4px;
    font-size: 10px;
  }

  .theme-btn {
    margin-bottom: 0;
  }

  .card-footer {
    display: none;
  }
}

@media (max-width: 430px) {
  .sidebar-left {
    max-height: 39dvh;
  }

  .sidebar-right {
    max-height: 27dvh;
  }

  .main-card {
    padding: 7px;
  }

  .sensor-list,
  .stats-list {
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }

  .sensor-item,
  .stat-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .menu-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) and (max-height: 620px) {
  .sidebar-left {
    max-height: 33dvh;
  }

  .sidebar-right {
    max-height: 23dvh;
  }

  .sensor-item,
  .stat-item,
  .lod-btn,
  .view-btn,
  .menu-btn,
  .theme-btn {
    min-height: 28px;
  }

  .ac-target-card {
    min-height: 30px;
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 16px;
  }

  .modal-body {
    padding: 20px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
