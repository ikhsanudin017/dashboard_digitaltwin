<template>
  <div class="admin" :class="{ dark: isDarkMode }">
    <!-- Sidebar (Drawer on mobile) -->
    <aside class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">
      <div class="sidebar-brand">
        <div class="brand-logo-wrap">
          <img src="/logo.png" alt="Logo" class="brand-logo" />
        </div>
        <div class="brand-text">
          <span class="brand-title">TwinSpace</span>
          <span class="brand-role">Admin Panel</span>
        </div>
        <!-- Close button on mobile -->
        <button class="menu-close-btn" @click="isMobileMenuOpen = false">✕</button>
      </div>

      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
          @click="selectSection(item.id)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-chip">
          <img v-if="user?.photoURL" :src="user.photoURL" class="admin-avatar" referrerpolicy="no-referrer" />
          <div v-else class="admin-avatar admin-avatar-fallback">{{ userInitials }}</div>
          <div class="admin-info">
            <span class="admin-name">{{ displayName }}</span>
            <span class="admin-email">{{ user?.email || '' }}</span>
          </div>
        </div>
        <div class="sidebar-actions">
          <button class="action-btn logout" @click="$emit('logout')">
            <span>🚪</span> Keluar Panel
          </button>
        </div>
      </div>
    </aside>

    <!-- Overlay backrop for mobile menu -->
    <div v-if="isMobileMenuOpen" class="mobile-overlay" @click="isMobileMenuOpen = false"></div>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Bar -->
      <header class="topbar">
        <div class="topbar-left">
          <!-- Burger toggle for mobile -->
          <button class="burger-btn" @click="isMobileMenuOpen = true">
            <span></span><span></span><span></span>
          </button>
          <div class="topbar-info">
            <h1 class="page-title">{{ currentPageTitle }}</h1>
            <p class="page-subtitle">{{ currentPageSubtitle }}</p>
          </div>
        </div>
        <div class="topbar-right">
          <div class="status-pill" :class="mqttConnected ? 'online' : 'offline'">
            <span class="status-dot"></span>
            {{ mqttConnected ? 'Azure Terhubung' : 'Simulasi / Offline' }}
          </div>
          <button class="theme-toggle" @click="$emit('toggle-theme')">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
        </div>
      </header>

      <!-- Section: Overview -->
      <section v-if="activeSection === 'overview'" class="section">
        <div class="overview-head">
          <div class="overview-copy">
            <span class="overview-kicker">Overview</span>
            <h2 class="overview-title">Pusat kontrol untuk memantau kondisi ruang dan sistem Azure.</h2>
            <p class="overview-text">
              Semua indikator utama, shortcut admin, dan aktivitas terbaru dirangkum dalam satu area.
            </p>
          </div>
          <div class="overview-badges">
            <div class="overview-badge" :class="mqttConnected ? 'online' : 'offline'">
              <span class="overview-badge-dot"></span>
              <span>{{ mqttConnected ? 'Azure Live' : 'Offline Mode' }}</span>
            </div>
            <div class="overview-badge neutral">
              <span>{{ onlineDeviceCount }} perangkat aktif</span>
            </div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card cyan">
            <div class="stat-icon-bg">🌡️</div>
            <div class="stat-body">
              <span class="stat-label">Suhu Saat Ini</span>
              <span class="stat-value">{{ sensorData.temperature.toFixed(1) }}°C</span>
            </div>
          </div>
          <div class="stat-card blue">
            <div class="stat-icon-bg">💧</div>
            <div class="stat-body">
              <span class="stat-label">Kelembaban</span>
              <span class="stat-value">{{ sensorData.humidity.toFixed(1) }}%</span>
            </div>
          </div>
          <div class="stat-card purple">
            <div class="stat-icon-bg">⚡</div>
            <div class="stat-body">
              <span class="stat-label">Daya Listrik</span>
              <span class="stat-value">{{ sensorData.power.toFixed(1) }}W</span>
            </div>
          </div>
          <div class="stat-card green">
            <div class="stat-icon-bg">👥</div>
            <div class="stat-body">
              <span class="stat-label">Jumlah Orang</span>
              <span class="stat-value">{{ sensorData.peopleCount || 0 }}</span>
            </div>
          </div>
          <div class="stat-card orange">
            <div class="stat-icon-bg">🔌</div>
            <div class="stat-body">
              <span class="stat-label">Tegangan</span>
              <span class="stat-value">{{ sensorData.voltage.toFixed(1) }}V</span>
            </div>
          </div>
          <div class="stat-card pink">
            <div class="stat-icon-bg">✅</div>
            <div class="stat-body">
              <span class="stat-label">Perangkat Aktif</span>
              <span class="stat-value">{{ devices.filter(d => d.statusClass === 'online').length }} / {{ devices.length }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="panel">
          <h2 class="panel-title">⚡ Quick Actions</h2>
          <div class="action-grid">

            <button class="quick-action" @click="activeSection = 'energy'">
              <span>💰</span> Energy Management
            </button>
            <button class="quick-action" @click="activeSection = 'analytics'">
              <span>📊</span> Historical Analytics
            </button>
            <button class="quick-action" @click="activeSection = 'settings'">
              <span>⚙️</span> Pengaturan Sistem
            </button>
          </div>
        </div>

        <!-- Recent Activity Log -->
        <div class="panel">
          <h2 class="panel-title">🕐 Activity Log</h2>
          <div class="log-list">
            <div v-for="(log, i) in activityLog" :key="i" class="log-item">
              <span class="log-icon">{{ log.icon }}</span>
              <div class="log-body">
                <span class="log-msg">{{ log.message }}</span>
                <span class="log-time">{{ log.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Data Export -->


      <!-- Section: Energy Management -->
      <section v-if="activeSection === 'energy'" class="section">
        <EnergyManagement :is-dark-mode="isDarkMode" :current-power="sensorData.power" />
      </section>

      <!-- Section: Historical Analytics -->
      <section v-if="activeSection === 'analytics'" class="section">
        <HistoricalAnalytics :is-dark-mode="isDarkMode" :current-people-count="sensorData.peopleCount || 0" />
      </section>

      <!-- Section: Device Management -->
      <section v-if="activeSection === 'devices'" class="section">
        <div class="panel">
          <h2 class="panel-title">🔧 Manajemen Perangkat IoT</h2>
          <div class="device-grid">
            <div v-for="device in devices" :key="device.id" class="device-card" :class="device.statusClass">
              <div class="device-icon">{{ device.icon }}</div>
              <div class="device-info">
                <strong>{{ device.name }}</strong>
                <span class="device-id">{{ device.id }}</span>
                <span class="device-type">{{ device.type }}</span>
              </div>
              <div class="device-status-wrap">
                <span class="device-status-dot" :class="device.statusClass"></span>
                <span class="device-status-text">{{ device.status }}</span>
              </div>
              <span class="device-last">{{ device.lastSeen }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Alert Settings -->
      <section v-if="activeSection === 'alerts'" class="section">
        <div class="panel">
          <h2 class="panel-title">🔔 Pengaturan Alert & Threshold</h2>
          <div class="alert-grid">
            <div v-for="alert in alertSettings" :key="alert.key" class="alert-card">
              <div class="alert-header">
                <span class="alert-icon">{{ alert.icon }}</span>
                <strong>{{ alert.label }}</strong>
              </div>
              <div class="alert-inputs">
                <div class="input-group">
                  <label>Min</label>
                  <input type="number" v-model.number="alert.min" :step="alert.step" />
                </div>
                <div class="input-group">
                  <label>Max</label>
                  <input type="number" v-model.number="alert.max" :step="alert.step" />
                </div>
              </div>
              <div class="alert-status" :class="getAlertStatus(alert)">
                {{ getAlertStatusText(alert) }}
              </div>
            </div>
          </div>
          <div class="panel-actions">
            <button class="btn-primary" @click="saveAlertSettings">💾 Simpan Pengaturan</button>
          </div>
        </div>
      </section>

      <!-- Section: System Settings -->
      <section v-if="activeSection === 'settings'" class="section">
        <div class="panel">
          <h2 class="panel-title">⚙️ Pengaturan Sistem</h2>
          <div class="settings-list">
            <div class="setting-row">
              <div class="setting-info">
                <strong>Polling Interval</strong>
                <span>Interval pengambilan data dari Azure (detik)</span>
              </div>
              <input type="number" v-model.number="systemSettings.pollingInterval" min="1" max="60" class="setting-input" />
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Tarif Listrik</strong>
                <span>Tarif PLN per kWh (Rp)</span>
              </div>
              <input type="number" v-model.number="systemSettings.tariff" min="0" step="0.01" class="setting-input" />
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Target Bulanan</strong>
                <span>Target konsumsi energi bulanan (kWh)</span>
              </div>
              <input type="number" v-model.number="systemSettings.monthlyTarget" min="0" class="setting-input" />
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Kapasitas Ruangan</strong>
                <span>Jumlah maksimum orang dalam ruangan</span>
              </div>
              <input type="number" v-model.number="systemSettings.roomCapacity" min="1" class="setting-input" />
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Azure Function URL</strong>
                <span>Endpoint API untuk Azure Functions</span>
              </div>
              <input type="text" :value="azureFunctionUrl" class="setting-input wide" disabled />
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Demo Mode</strong>
                <span>Gunakan data dummy jika backend tidak tersedia</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" v-model="systemSettings.demoMode" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="panel-actions">
            <button class="btn-primary" @click="saveSystemSettings">💾 Simpan Pengaturan</button>
            <button class="btn-outline" @click="clearLocalCache">🗑️ Clear Cache</button>
          </div>
        </div>

        <!-- System Info -->
        <div class="panel">
          <h2 class="panel-title">ℹ️ Informasi Sistem</h2>
          <div class="info-grid">
            <div class="info-item"><span>Frontend</span><strong>Vue 3 + Vite</strong></div>
            <div class="info-item"><span>3D Engine</span><strong>Babylon.js</strong></div>
            <div class="info-item"><span>Chart</span><strong>Chart.js + vue-chartjs</strong></div>
            <div class="info-item"><span>Auth</span><strong>Firebase Google</strong></div>
            <div class="info-item"><span>Backend</span><strong>Azure Functions</strong></div>
            <div class="info-item"><span>Storage</span><strong>Azure Table Storage</strong></div>
            <div class="info-item"><span>ML</span><strong>Python Flask API</strong></div>
            <div class="info-item"><span>IoT</span><strong>ESP32 + RPi</strong></div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import EnergyManagement from './EnergyManagement.vue'
import HistoricalAnalytics from './HistoricalAnalytics.vue'
import { useMQTT } from '../composables/useMQTT'
import { AZURE_FUNCTION_URL } from '../lib/appConfig'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  user: { type: Object, default: null }
})

const emit = defineEmits(['toggle-theme', 'logout', 'go-dashboard'])

// Data
const { mqttConnected, sensorData, connectMQTT, disconnectMQTT } = useMQTT()

const activeSection = ref('overview')
const isMobileMenuOpen = ref(false)
const azureFunctionUrl = AZURE_FUNCTION_URL

const selectSection = (id) => {
  activeSection.value = id
  isMobileMenuOpen.value = false
}

const navItems = [
  { id: 'overview', icon: '🏠', label: 'Overview' },
  { id: 'energy', icon: '💰', label: 'Energy' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'devices', icon: '🔧', label: 'Devices' },
  { id: 'alerts', icon: '🔔', label: 'Alerts' },
  { id: 'settings', icon: '⚙️', label: 'Settings' }
]

const currentPageTitle = computed(() => {
  const map = {
    overview: '🏠 Dashboard Overview',
    energy: '💰 Energy Management',
    analytics: '📊 Historical Analytics',
    devices: '🔧 Device Management',
    alerts: '🔔 Alert Settings',
    settings: '⚙️ System Settings'
  }
  return map[activeSection.value] || 'Admin'
})

const currentPageSubtitle = computed(() => {
  const map = {
    overview: 'Ringkasan sistem dan status sensor realtime',
    energy: 'Analisis konsumsi energi & rekomendasi AI',
    analytics: 'Grafik historis dan tren data sensor',
    devices: 'Status dan manajemen perangkat IoT',
    alerts: 'Konfigurasi threshold dan notifikasi',
    settings: 'Pengaturan sistem dan konfigurasi'
  }
  return map[activeSection.value] || ''
})

const displayName = computed(() => props.user?.displayName || props.user?.email || 'Admin')
const userInitials = computed(() => {
  const name = displayName.value.trim()
  if (!name) return 'AD'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
})



// Devices (Reactive to MQTT connection)
const devices = computed(() => [
  { id: 'ESP32-001', name: 'ESP32 Sensor Node', type: 'Suhu, Kelembaban, Listrik', icon: '🌡️', status: mqttConnected.value ? 'Online' : 'Offline', statusClass: mqttConnected.value ? 'online' : 'offline', lastSeen: mqttConnected.value ? 'Baru saja' : 'N/A' },
  { id: 'RPi-CAM-001', name: 'Raspberry Pi Camera', type: 'People Counter (YOLO)', icon: '📹', status: 'Online', statusClass: 'online', lastSeen: 'Baru saja' },
  { id: 'AC-UNIT-001', name: 'AC Unit (Smart)', type: 'Pendingin Ruangan', icon: '❄️', status: 'Standby', statusClass: 'warning', lastSeen: '5 menit lalu' },
  { id: 'GW-MQTT-001', name: 'MQTT Gateway', type: 'Azure Cloud Sync', icon: '📡', status: mqttConnected.value ? 'Connected' : 'Disconnected', statusClass: mqttConnected.value ? 'online' : 'offline', lastSeen: 'N/A' }
])

const onlineDeviceCount = computed(() => (
  devices.value.filter(device => device.statusClass === 'online').length
))

// Alert settings
const alertSettings = ref([
  { key: 'temperature', icon: '🌡️', label: 'Suhu (°C)', min: 15, max: 30, step: 0.5, currentValue: () => sensorData.value.temperature },
  { key: 'humidity', icon: '💧', label: 'Kelembaban (%)', min: 30, max: 80, step: 1, currentValue: () => sensorData.value.humidity },
  { key: 'voltage', icon: '🔌', label: 'Tegangan (V)', min: 180, max: 250, step: 1, currentValue: () => sensorData.value.voltage },
  { key: 'power', icon: '⚡', label: 'Daya (W)', min: 0, max: 4000, step: 10, currentValue: () => sensorData.value.power },
  { key: 'people', icon: '👥', label: 'Jumlah Orang', min: 0, max: 20, step: 1, currentValue: () => sensorData.value.peopleCount || 0 }
])

const getAlertStatus = (alert) => {
  const val = typeof alert.currentValue === 'function' ? alert.currentValue() : 0
  if (val < alert.min || val > alert.max) return 'alert-danger'
  return 'alert-ok'
}

const getAlertStatusText = (alert) => {
  const val = typeof alert.currentValue === 'function' ? alert.currentValue() : 0
  if (val < alert.min) return `⚠️ Di bawah minimum (${val})`
  if (val > alert.max) return `⚠️ Di atas maximum (${val})`
  return `✅ Normal (${typeof val === 'number' ? val.toFixed(1) : val})`
}

const saveAlertSettings = () => {
  localStorage.setItem('admin_alert_settings', JSON.stringify(alertSettings.value))
  addLog('🔔', 'Alert settings saved')
  alert('Pengaturan alert berhasil disimpan!')
}

// System settings
const systemSettings = ref({
  pollingInterval: 5,
  tariff: 1444.70,
  monthlyTarget: 100,
  roomCapacity: 20,
  demoMode: false
})

const saveSystemSettings = () => {
  localStorage.setItem('admin_system_settings', JSON.stringify(systemSettings.value))
  addLog('⚙️', 'System settings saved')
  alert('Pengaturan sistem berhasil disimpan!')
}

const clearLocalCache = () => {
  if (confirm('Yakin ingin menghapus semua cache lokal?')) {
    localStorage.removeItem('sensor_last_data')
    localStorage.removeItem('digitaltwin_historical_data')
    localStorage.removeItem('digitaltwin_energy_management')
    addLog('🗑️', 'Local cache cleared')
    alert('Cache lokal berhasil dihapus!')
  }
}

// Activity log
const activityLog = ref([])
const addLog = (icon, message) => {
  activityLog.value.unshift({
    icon,
    message,
    time: new Date().toLocaleTimeString('id-ID')
  })
  if (activityLog.value.length > 50) activityLog.value.pop()
}

// Lifecycle
onMounted(() => {
  connectMQTT()
  addLog('🟢', 'Admin panel opened')
  addLog('📡', `Azure polling started`)

  // Load saved settings
  try {
    const savedSystem = localStorage.getItem('admin_system_settings')
    if (savedSystem) systemSettings.value = { ...systemSettings.value, ...JSON.parse(savedSystem) }

    const savedAlerts = localStorage.getItem('admin_alert_settings')
    if (savedAlerts) alertSettings.value = JSON.parse(savedAlerts)
  } catch (e) { /* ignore */ }
})

onUnmounted(() => {
  disconnectMQTT()
})
</script>

<style scoped>
/* ===== Layout ===== */
.admin {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
  color: #1e293b;
  transition: background 0.3s, color 0.3s;
}
.admin.dark {
  background: #0b0f19;
  color: #e2e8f0;
}

/* ===== Sidebar ===== */
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  transition: background 0.3s, border-color 0.3s;
}
.dark .sidebar {
  background: #111827;
  border-right-color: rgba(255,255,255,0.06);
}

.sidebar-brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 16px 14px 10px;
  padding: 16px 16px 14px;
  border-radius: 20px;
  background:
    linear-gradient(145deg, rgba(6,182,212,0.12), rgba(255,255,255,0.96)),
    linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.95));
  border-bottom: 1px solid rgba(0,0,0,0.06);
  border: 1px solid rgba(6,182,212,0.12);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}
.dark .sidebar-brand {
  border-bottom-color: rgba(255,255,255,0.06);
  border-color: rgba(34,211,238,0.14);
  background:
    linear-gradient(145deg, rgba(34,211,238,0.1), rgba(17,24,39,0.96)),
    linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.96));
  box-shadow: 0 14px 30px rgba(0,0,0,0.28);
}
.brand-logo-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(6,182,212,0.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(6,182,212,0.12);
  flex-shrink: 0;
}
.dark .brand-logo-wrap {
  background: rgba(15,23,42,0.94);
  border-color: rgba(34,211,238,0.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 22px rgba(0,0,0,0.26);
}
.brand-logo { width: 30px; height: 30px; object-fit: contain; }
.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.brand-title {
  font-weight: 900;
  font-size: 1.28rem;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: #0f172a;
  display: block;
}
.dark .brand-title {
  color: #f8fafc;
}
.brand-role {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #06b6d4;
  background: rgba(6,182,212,0.1);
  border: 1px solid rgba(6,182,212,0.14);
}
.dark .brand-role {
  color: #67e8f9;
  background: rgba(34,211,238,0.12);
  border-color: rgba(34,211,238,0.16);
}
.menu-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: 12px;
  background: rgba(255,255,255,0.76);
  color: #334155;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}
.menu-close-btn:hover {
  transform: translateY(-1px);
  background: rgba(239,68,68,0.08);
  color: #ef4444;
  box-shadow: 0 8px 16px rgba(239,68,68,0.12);
}
.dark .menu-close-btn {
  border-color: rgba(255,255,255,0.08);
  background: rgba(15,23,42,0.85);
  color: #e2e8f0;
}
.menu-close-btn span {
  font-size: 1.35rem;
  line-height: 1;
}

.nav {
  flex: 1;
  padding: 14px 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 18px;
  background: rgba(255,255,255,0.72);
  color: #0f172a;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease, color 0.22s ease;
  text-align: left;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
}
.dark .nav-item {
  background: rgba(15,23,42,0.42);
  color: #e5eef9;
  border-color: rgba(255,255,255,0.03);
}
.nav-item:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(255,255,255,0.95));
  border-color: rgba(6,182,212,0.14);
  box-shadow: 0 12px 24px rgba(6,182,212,0.1);
}
.dark .nav-item:hover {
  background: linear-gradient(135deg, rgba(34,211,238,0.12), rgba(15,23,42,0.9));
  border-color: rgba(34,211,238,0.14);
  box-shadow: 0 14px 24px rgba(0,0,0,0.2);
}
.nav-item.active {
  background: linear-gradient(135deg, rgba(6,182,212,0.16), rgba(99,102,241,0.08), rgba(255,255,255,0.9));
  border-color: rgba(6,182,212,0.18);
  color: #06b6d4;
  box-shadow: 0 16px 28px rgba(6,182,212,0.14);
}
.dark .nav-item.active {
  color: #67e8f9;
  background: linear-gradient(135deg, rgba(34,211,238,0.14), rgba(99,102,241,0.08), rgba(15,23,42,0.9));
  border-color: rgba(34,211,238,0.18);
}
.nav-item.active::after {
  content: '';
  position: absolute;
  right: 14px;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  transform: translateY(-50%);
  box-shadow: 0 0 0 6px rgba(6,182,212,0.08);
}
.dark .nav-item.active::after {
  box-shadow: 0 0 0 6px rgba(34,211,238,0.08);
}
.nav-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.2rem;
  background: linear-gradient(145deg, rgba(255,255,255,0.92), rgba(240,249,255,0.96));
  border: 1px solid rgba(6,182,212,0.12);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 16px rgba(15,23,42,0.05);
}
.dark .nav-icon {
  background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(17,24,39,0.9));
  border-color: rgba(34,211,238,0.1);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 16px rgba(0,0,0,0.18);
}
.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 18px 14px 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
  background: linear-gradient(180deg, rgba(248,250,252,0.82), rgba(255,255,255,0.96));
}
.dark .sidebar-footer { 
  border-top-color: rgba(255,255,255,0.06);
  background: linear-gradient(180deg, rgba(15,23,42,0.5), rgba(17,24,39,0.82));
}

.admin-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255,255,255,0.92), rgba(248,250,252,0.95));
  border: 1px solid rgba(6,182,212,0.12);
  box-shadow: 0 10px 24px rgba(15,23,42,0.06);
}
.dark .admin-chip {
  background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(17,24,39,0.92));
  border-color: rgba(34,211,238,0.1);
  box-shadow: 0 12px 24px rgba(0,0,0,0.2);
}
.admin-avatar {
  width: 48px; height: 48px;
  border-radius: 16px;
  object-fit: cover;
  border: 2px solid rgba(6,182,212,0.2);
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(15,23,42,0.08);
}
.admin-avatar-fallback {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(6,182,212,0.16), rgba(99,102,241,0.14));
  font-weight: 800;
  font-size: 1rem;
  color: #06b6d4;
  letter-spacing: 0.05em;
}
.admin-info { display: flex; flex-direction: column; min-width: 0; }
.admin-name { font-weight: 900; font-size: 1rem; color: var(--text-primary); line-height: 1.15; }
.admin-email { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }

.sidebar-actions {
  display: flex;
}
.action-btn {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.92));
  color: #475569;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 800;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 22px rgba(15,23,42,0.06);
}
.dark .action-btn { 
  background: linear-gradient(145deg, rgba(15,23,42,0.92), rgba(17,24,39,0.9)); 
  border-color: rgba(255,255,255,0.1);
  color: #cbd5e1;
}
.action-btn:hover { 
  background: linear-gradient(145deg, rgba(255,255,255,1), rgba(240,249,255,0.96));
  color: #06b6d4;
  border-color: #06b6d4;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(6,182,212,0.14);
}
.dark .action-btn:hover {
  background: linear-gradient(145deg, rgba(6,182,212,0.12), rgba(15,23,42,0.92));
}
.action-btn.logout:hover { 
  background: linear-gradient(145deg, rgba(254,242,242,0.96), rgba(255,255,255,0.96)); 
  border-color: rgba(239,68,68,0.4); 
  color: #ef4444; 
  box-shadow: 0 14px 28px rgba(239,68,68,0.14);
}
.dark .action-btn.logout:hover {
  background: linear-gradient(145deg, rgba(127,29,29,0.26), rgba(15,23,42,0.94));
}
.action-btn span {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(6,182,212,0.08);
}
.dark .action-btn span {
  background: rgba(34,211,238,0.1);
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 16px;
  flex-wrap: wrap;
}
.dark .topbar { background: #111827; border-bottom-color: rgba(255,255,255,0.06); }
.page-title { font-size: 1.35rem; font-weight: 800; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #94a3b8; margin: 0; }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 999px;
  font-size: 0.82rem; font-weight: 700;
}
.status-pill.online { background: rgba(16,185,129,0.12); color: #059669; }
.status-pill.offline { background: rgba(239,68,68,0.12); color: #ef4444; }
.dark .status-pill.online { color: #34d399; }
.dark .status-pill.offline { color: #fca5a5; }
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.theme-toggle {
  width: 40px; height: 40px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.dark .theme-toggle { border-color: rgba(255,255,255,0.08); }
.theme-toggle:hover { background: rgba(6,182,212,0.08); }

/* ===== Sections ===== */
.section {
  padding: 24px 32px 40px;
  animation: fadeUp 0.3s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== Overview ===== */
.overview-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  margin-bottom: 24px;
  border-radius: 24px;
  border: 1px solid rgba(6,182,212,0.12);
  background:
    radial-gradient(circle at top right, rgba(56,189,248,0.16), transparent 34%),
    linear-gradient(145deg, rgba(255,255,255,0.98), rgba(240,249,255,0.92));
  box-shadow: 0 18px 40px rgba(14,116,144,0.08);
}
.dark .overview-head {
  border-color: rgba(103,232,249,0.12);
  background:
    radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 36%),
    linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.88));
  box-shadow: 0 18px 40px rgba(2,6,23,0.32);
}
.overview-copy {
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.overview-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(6,182,212,0.1);
  color: #0891b2;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.dark .overview-kicker {
  background: rgba(34,211,238,0.16);
  color: #67e8f9;
}
.overview-title {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 2rem);
  line-height: 1.15;
  font-weight: 900;
}
.overview-text {
  margin: 0;
  max-width: 58ch;
  color: #64748b;
  font-size: 0.98rem;
  line-height: 1.7;
}
.dark .overview-text {
  color: #94a3b8;
}
.overview-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.overview-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,0.06);
  background: rgba(255,255,255,0.82);
  color: #0f172a;
  font-size: 0.88rem;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(15,23,42,0.06);
}
.dark .overview-badge {
  border-color: rgba(255,255,255,0.08);
  background: rgba(15,23,42,0.72);
  color: #e2e8f0;
}
.overview-badge.online {
  color: #047857;
}
.overview-badge.offline {
  color: #dc2626;
}
.overview-badge.neutral {
  color: #0369a1;
}
.dark .overview-badge.online {
  color: #6ee7b7;
}
.dark .overview-badge.offline {
  color: #fda4af;
}
.dark .overview-badge.neutral {
  color: #7dd3fc;
}
.overview-badge-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 6px rgba(16,185,129,0.12);
}
.overview-badge.offline .overview-badge-dot {
  box-shadow: 0 0 0 6px rgba(239,68,68,0.12);
}
.overview-badge.neutral .overview-badge-dot {
  box-shadow: 0 0 0 6px rgba(14,165,233,0.12);
}

/* ===== Stat Grid ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}
.stat-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 126px;
  padding: 20px 22px;
  border-radius: 22px;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92));
  border: 1px solid rgba(15,23,42,0.06);
  box-shadow: 0 16px 36px rgba(15,23,42,0.06);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}
.stat-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, rgba(6,182,212,0.82), rgba(99,102,241,0.8));
}
.dark .stat-card {
  background:
    linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92));
  border-color: rgba(255,255,255,0.06);
  box-shadow: 0 18px 40px rgba(2,6,23,0.28);
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 44px rgba(15,23,42,0.12);
  border-color: rgba(6,182,212,0.24);
}
.stat-icon-bg {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
}
.stat-card.cyan::before { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
.stat-card.blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.stat-card.purple::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.stat-card.green::before { background: linear-gradient(90deg, #10b981, #34d399); }
.stat-card.orange::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.stat-card.pink::before { background: linear-gradient(90deg, #ec4899, #f472b6); }
.stat-card.cyan .stat-icon-bg { background: linear-gradient(145deg, rgba(6,182,212,0.16), rgba(207,250,254,0.96)); }
.stat-card.blue .stat-icon-bg { background: linear-gradient(145deg, rgba(59,130,246,0.16), rgba(219,234,254,0.96)); }
.stat-card.purple .stat-icon-bg { background: linear-gradient(145deg, rgba(139,92,246,0.16), rgba(237,233,254,0.96)); }
.stat-card.green .stat-icon-bg { background: linear-gradient(145deg, rgba(16,185,129,0.16), rgba(209,250,229,0.96)); }
.stat-card.orange .stat-icon-bg { background: linear-gradient(145deg, rgba(245,158,11,0.16), rgba(254,243,199,0.96)); }
.stat-card.pink .stat-icon-bg { background: linear-gradient(145deg, rgba(236,72,153,0.16), rgba(252,231,243,0.96)); }
.dark .stat-card.cyan .stat-icon-bg { background: linear-gradient(145deg, rgba(6,182,212,0.18), rgba(8,47,73,0.92)); }
.dark .stat-card.blue .stat-icon-bg { background: linear-gradient(145deg, rgba(59,130,246,0.18), rgba(30,41,59,0.96)); }
.dark .stat-card.purple .stat-icon-bg { background: linear-gradient(145deg, rgba(139,92,246,0.18), rgba(49,46,129,0.88)); }
.dark .stat-card.green .stat-icon-bg { background: linear-gradient(145deg, rgba(16,185,129,0.18), rgba(6,78,59,0.9)); }
.dark .stat-card.orange .stat-icon-bg { background: linear-gradient(145deg, rgba(245,158,11,0.18), rgba(120,53,15,0.9)); }
.dark .stat-card.pink .stat-icon-bg { background: linear-gradient(145deg, rgba(236,72,153,0.18), rgba(80,7,36,0.88)); }
.stat-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.stat-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.stat-value {
  font-size: clamp(1.4rem, 2vw, 2rem);
  font-weight: 900;
  line-height: 1.05;
}
.stat-meta {
  font-size: 0.84rem;
  color: #64748b;
}
.dark .stat-meta {
  color: #94a3b8;
}

/* ===== Panel ===== */
.panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92));
  border: 1px solid rgba(15,23,42,0.06);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 16px 36px rgba(15,23,42,0.06);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, rgba(6,182,212,0.45), transparent 82%);
}
.dark .panel {
  background: linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92));
  border-color: rgba(255,255,255,0.06);
  box-shadow: 0 18px 40px rgba(2,6,23,0.26);
}
.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.panel-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
}
.panel > .panel-title {
  margin-bottom: 16px;
}
.panel-desc {
  color: #94a3b8;
  margin: 6px 0 0;
  font-size: 0.92rem;
  line-height: 1.6;
}
.panel > .panel-desc {
  margin: 0 0 20px;
}
.panel-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}

/* ===== Buttons ===== */
.btn-primary {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #06b6d4, #6366f1);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(6,182,212,0.25); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-lg { padding: 14px 32px; font-size: 1rem; }
.btn-outline {
  padding: 12px 24px;
  border: 2px solid rgba(0,0,0,0.1);
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
}
.dark .btn-outline { border-color: rgba(255,255,255,0.1); }
.btn-outline:hover { border-color: #ef4444; color: #ef4444; }

/* ===== Quick Actions ===== */
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.quick-action {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  min-height: 92px;
  border: 1px solid rgba(15,23,42,0.06);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(255,255,255,0.92), rgba(240,249,255,0.86));
  color: inherit;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.94rem;
  text-align: left;
  transition: all 0.25s ease;
  box-shadow: 0 10px 22px rgba(15,23,42,0.05);
}
.dark .quick-action {
  border-color: rgba(255,255,255,0.06);
  background: linear-gradient(160deg, rgba(15,23,42,0.86), rgba(17,24,39,0.9));
}
.quick-action:hover {
  background: linear-gradient(160deg, rgba(236,254,255,0.96), rgba(224,242,254,0.92));
  border-color: rgba(6,182,212,0.32);
  transform: translateY(-3px);
  box-shadow: 0 16px 30px rgba(6,182,212,0.12);
}
.dark .quick-action:hover {
  background: linear-gradient(160deg, rgba(8,47,73,0.52), rgba(15,23,42,0.94));
}
.quick-action > span {
  font-size: 1.25rem;
}

/* ===== Log ===== */
.log-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.log-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(15,23,42,0.06);
  border-radius: 16px;
  background: rgba(248,250,252,0.78);
}
.dark .log-item {
  border-color: rgba(255,255,255,0.06);
  background: rgba(15,23,42,0.6);
}
.log-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(6,182,212,0.1);
  font-size: 1.1rem;
}
.dark .log-icon {
  background: rgba(34,211,238,0.14);
}
.log-body {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.log-msg {
  font-size: 0.92rem;
  font-weight: 600;
}
.log-time {
  font-size: 0.8rem;
  color: #94a3b8;
  white-space: nowrap;
}

/* ===== Export Controls ===== */
.export-controls { display: flex; flex-direction: column; gap: 16px; }
.input-row { display: flex; gap: 16px; flex-wrap: wrap; }
.input-group {
  display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 120px;
}
.input-group label { font-size: 0.82rem; font-weight: 700; color: #64748b; }
.dark .input-group label { color: #94a3b8; }
.input-group input, .setting-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 2px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  font-size: 0.95rem;
  background: transparent;
  color: inherit;
  transition: border-color 0.2s;
}
.dark .input-group input, .dark .setting-input { border-color: rgba(255,255,255,0.1); }
.input-group input:focus, .setting-input:focus { outline: none; border-color: #06b6d4; }

.quick-range-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.quick-range-btns button {
  padding: 8px 16px;
  border: 2px solid rgba(6,182,212,0.3);
  border-radius: 10px;
  background: transparent;
  color: #06b6d4;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-range-btns button:hover { background: #06b6d4; color: #fff; }
.export-info { font-size: 0.9rem; color: #64748b; }
.dark .export-info { color: #94a3b8; }

/* ===== Data Table ===== */
.table-wrap { overflow-x: auto; border-radius: 12px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th {
  padding: 12px 14px;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: #fff;
  text-align: left;
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.data-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.dark .data-table td { border-bottom-color: rgba(255,255,255,0.05); }
.data-table tbody tr:hover { background: rgba(6,182,212,0.04); }
.empty-row { text-align: center; color: #94a3b8; padding: 24px !important; }

/* ===== Devices ===== */
.device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.device-card {
  display: flex; align-items: center; gap: 14px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.06);
  background: rgba(0,0,0,0.01);
  transition: all 0.25s;
}
.dark .device-card { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
.device-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.device-icon { font-size: 1.6rem; }
.device-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.device-info strong { font-size: 0.92rem; }
.device-id { font-size: 0.75rem; color: #64748b; font-family: monospace; }
.device-type { font-size: 0.78rem; color: #94a3b8; }
.device-status-wrap { display: flex; align-items: center; gap: 6px; }
.device-status-dot { width: 8px; height: 8px; border-radius: 50%; }
.device-status-dot.online { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }
.device-status-dot.warning { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
.device-status-dot.offline { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.4); }
.device-status-text { font-size: 0.82rem; font-weight: 600; }
.device-last { font-size: 0.72rem; color: #94a3b8; white-space: nowrap; }

/* ===== Alerts ===== */
.alert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.alert-card {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.06);
  transition: all 0.25s;
}
.dark .alert-card { border-color: rgba(255,255,255,0.06); }
.alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.alert-icon { font-size: 1.4rem; }
.alert-inputs { display: flex; gap: 12px; margin-bottom: 12px; }
.alert-inputs .input-group { flex: 1; }
.alert-status {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
}
.alert-ok { background: rgba(16,185,129,0.1); color: #059669; }
.dark .alert-ok { color: #34d399; }
.alert-danger { background: rgba(239,68,68,0.1); color: #ef4444; }
.dark .alert-danger { color: #fca5a5; }

/* ===== Settings ===== */
.settings-list { display: flex; flex-direction: column; gap: 4px; }
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  flex-wrap: wrap;
}
.dark .setting-row { border-bottom-color: rgba(255,255,255,0.05); }
.setting-info { flex: 1; min-width: 200px; }
.setting-info strong { display: block; font-size: 0.92rem; }
.setting-info span { font-size: 0.82rem; color: #94a3b8; }
.setting-input { width: 150px; text-align: right; }
.setting-input.wide { width: 300px; text-align: left; font-family: monospace; font-size: 0.82rem; }

/* Toggle Switch */
.toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.15);
  border-radius: 28px;
  transition: 0.3s;
}
.dark .toggle-slider { background: rgba(255,255,255,0.12); }
.toggle-slider::before {
  content: '';
  position: absolute;
  height: 22px; width: 22px;
  left: 3px; bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}
.toggle-switch input:checked + .toggle-slider { background: #06b6d4; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(22px); }

/* ===== Info Grid ===== */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.info-item {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.06);
  display: flex; flex-direction: column; gap: 4px;
}
.dark .info-item { border-color: rgba(255,255,255,0.06); }
.info-item span { font-size: 0.78rem; color: #94a3b8; }
.info-item strong { font-size: 0.92rem; }

/* ===== Responsive ===== */
/* ===== Responsive ===== */
@media (max-width: 900px) {
  .admin { flex-direction: column; }
  
  /* Sidebar as Drawer */
  .sidebar {
    position: fixed;
    top: 0;
    left: -280px; /* Hidden by default */
    width: 280px;
    height: 100vh;
    z-index: 200;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background: #fff;
    box-shadow: 10px 0 30px rgba(0,0,0,0.1);
    overflow-y: auto;
    border-right: none;
  }
  .dark .sidebar { background: #111827; box-shadow: 10px 0 30px rgba(0,0,0,0.4); }
  .sidebar.mobile-open { transform: translateX(280px); }

  .sidebar-brand { 
    margin: 14px 14px 10px;
    padding: 16px;
    justify-content: space-between;
  }
  .brand-logo-wrap { width: 46px; height: 46px; }
  .brand-logo { width: 28px; height: 28px; }
  .brand-title { font-size: 1.1rem; }
  .brand-role { font-size: 0.7rem; }
  
  .menu-close-btn {
    display: flex;
  }

  .nav { padding: 16px 12px 18px; gap: 10px; flex-direction: column; }
  .nav-item { padding: 14px 16px; width: 100%; border-radius: 18px; }
  .nav-label { display: block; }
  .nav-icon { width: 42px; height: 42px; font-size: 1.25rem; }

  .sidebar-footer { 
    display: block; 
    margin-top: auto; 
    padding: 20px 14px 18px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
  .dark .sidebar-footer { border-top-color: rgba(255,255,255,0.08); }

  .mobile-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 150;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Top Bar & Burger */
  .topbar {
    padding: 14px 20px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: #fff;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    position: sticky; top: 0; z-index: 100;
  }
  .dark .topbar { background: #111827; border-bottom-color: rgba(255,255,255,0.06); }
  
  .topbar-left { display: flex; align-items: center; gap: 16px; }
  .topbar-info { display: flex; flex-direction: column; }
  
  .burger-btn {
    display: flex; flex-direction: column; gap: 4px;
    width: 42px; height: 42px;
    padding: 10px;
    border: 1px solid rgba(0,0,0,0.08); border-radius: 10px;
    background: transparent; cursor: pointer;
    transition: 0.2s;
  }
  .dark .burger-btn { border-color: rgba(255,255,255,0.08); }
  .burger-btn span {
    display: block; width: 100%; height: 2px;
    background: var(--text-primary);
    border-radius: 4px; transition: 0.3s;
  }
  .burger-btn:hover { background: rgba(6,182,212,0.08); border-color: #06b6d4; }
  
  .page-title { font-size: 1rem; text-align: left; }
  .page-subtitle { font-size: 0.7rem; text-align: left; }
  
  .topbar-right { width: auto; justify-content: flex-end; }
  .status-pill { padding: 6px 12px; font-size: 0.7rem; }
  
  .overview-head {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px;
  }
  .overview-badges {
    justify-content: flex-start;
  }

  .section { padding: 20px 16px 40px; }
}

@media (max-width: 600px) {
  .overview-head {
    padding: 20px 18px;
  }
  .overview-title {
    font-size: 1.2rem;
  }
  .overview-badges {
    width: 100%;
  }
  .stat-grid { grid-template-columns: 1fr; }
  .stat-card {
    min-height: 112px;
    padding: 18px;
  }
  .panel { padding: 20px 16px; }
  .log-body {
    flex-direction: column;
    align-items: flex-start;
  }
  .input-row { flex-direction: column; }
  .setting-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .setting-input { width: 100% !important; text-align: left; }
  .panel-actions { flex-direction: column; }
  .btn-primary, .btn-outline { width: 100%; justify-content: center; }
}
</style>
