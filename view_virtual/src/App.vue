<template>
  <div class="app">
    <header class="header">
      <div class="header-container">
        <div class="header-left">
          <div class="logo">
            <div class="logo-icon">🏢</div>
            <h1 class="logo-text">Digital Twin Dashboard</h1>
          </div>
        </div>
        
        <div class="header-right">
          <div class="header-actions">
            <button @click="toggleTheme" class="theme-toggle" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">
              <span class="theme-icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
              <span class="theme-text">{{ isDarkMode ? 'Light' : 'Dark' }}</span>
            </button>
            
            <div class="status-badge" :class="mqttConnected ? 'connected' : 'disconnected'">
              <span class="status-dot"></span>
              <span class="status-text">{{ mqttConnected ? 'MQTT Terhubung' : 'Mode DEMO' }}</span>
            </div>
            
            <div class="timestamp">
              <span class="time-icon">🕐</span>
              <span class="time-text">{{ currentTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <!-- Row 1: 3D Visualization dan Status Sensor -->
        <div class="grid grid-2" style="margin-bottom: 20px;">
          <div class="card">
            <h2>🎯 Digital Twin 3D</h2>
            <DigitalTwin3D 
              :sensor-data="sensorData"
              :people-count="peopleCount"
              :is-dark-mode="isDarkMode"
            />
          </div>
          
          <div class="card">
            <h2>📊 Status Sensor Real-time</h2>
            <SensorStatus :sensor-data="sensorData" />
          </div>
        </div>

        <!-- Row 1.5: Camera Stream -->
        <div class="card" style="margin-bottom: 20px;">
          <h2>📹 Live Camera Stream - People Counter</h2>
          <CameraStream />
        </div>

        <!-- Row 2: Grafik Data Historis -->
        <div class="grid grid-3">
          <div class="card">
            <h2>🌡️ Suhu (24 Jam)</h2>
            <TemperatureChart :data="temperatureData" :is-dark-mode="isDarkMode" />
          </div>
          
          <div class="card">
            <h2>⚡ Konsumsi Listrik (7 Hari)</h2>
            <ElectricityChart :data="electricityData" :is-dark-mode="isDarkMode" />
          </div>
          
          <div class="card">
            <h2>👥 Jumlah Orang (Real-time)</h2>
            <PeopleChart :data="peopleData" :is-dark-mode="isDarkMode" />
          </div>
        </div>

        <!-- Row 3: Detail Data -->
        <div class="card">
          <h2>📋 Detail Data Sensor</h2>
          <DataTable 
            :sensor-data="sensorData" 
            :people-count="peopleCount"
            :total-energy="totalEnergyWh"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import DigitalTwin3D from './components/DigitalTwin3D.vue'
import SensorStatus from './components/SensorStatus.vue'
import TemperatureChart from './components/TemperatureChart.vue'
import ElectricityChart from './components/ElectricityChart.vue'
import PeopleChart from './components/PeopleChart.vue'
import DataTable from './components/DataTable.vue'
import CameraStream from './components/CameraStream.vue'
import { useMQTT } from './composables/useMQTT'

// Dark Mode / Light Mode Toggle
const isDarkMode = ref(false)

// Load theme preference from localStorage
const loadTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark'
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkMode.value = prefersDark
  }
  applyTheme()
}

// Apply theme to document
const applyTheme = () => {
  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

// Toggle theme
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
  applyTheme()
}

const { 
  mqttConnected, 
  sensorData, 
  connectMQTT, 
  disconnectMQTT 
} = useMQTT()

// Data dummy untuk chart (nanti bisa diganti dengan real data)
const temperatureData = ref({ labels: [], values: [] })
const electricityData = ref({ labels: [], values: [] })
const peopleData = ref({ labels: [], values: [] })
const peopleCount = ref(0)
const totalEnergyWh = ref(0)

const currentTime = ref(new Date().toLocaleString('id-ID'))

// Update waktu setiap detik
let timeInterval = null
let lastPowerTimestamp = Date.now()

onMounted(() => {
  loadTheme()
  connectMQTT()
  
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleString('id-ID')
  }, 1000)
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleThemeChange = (e) => {
    if (!localStorage.getItem('theme')) {
      isDarkMode.value = e.matches
      applyTheme()
    }
  }
  mediaQuery.addEventListener('change', handleThemeChange)
})

const MAX_POINTS = 60

const addDataPoint = (targetRef, value) => {
  if (value === undefined || value === null || isNaN(value)) return
  const timestamp = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  const labels = [...(targetRef.value.labels || []), timestamp]
  const values = [...(targetRef.value.values || []), parseFloat(value.toFixed(2))]
  
  if (labels.length > MAX_POINTS) {
    labels.shift()
    values.shift()
  }
  
  targetRef.value = { labels, values }
}

watch(sensorData, (newData) => {
  if (!newData) return
  if (typeof newData.temperature === 'number') {
    addDataPoint(temperatureData, newData.temperature)
  }
  if (typeof newData.power === 'number') {
    addDataPoint(electricityData, newData.power)
    
    const now = Date.now()
    const deltaHours = (now - lastPowerTimestamp) / 3600000
    if (deltaHours > 0 && deltaHours < 1) {
      totalEnergyWh.value += newData.power * deltaHours
    }
    lastPowerTimestamp = now
  }
  if (typeof newData.peopleCount === 'number') {
    peopleCount.value = newData.peopleCount
    addDataPoint(peopleData, newData.peopleCount)
  }
}, { deep: true })

onUnmounted(() => {
  disconnectMQTT()
  if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  position: relative;
}

.header {
  background: var(--bg-header);
  padding: 0;
  box-shadow: 0 2px 12px var(--shadow-sm);
  margin-bottom: 30px;
  border-bottom: 1px solid var(--border-dark);
  position: sticky;
  top: 0;
  z-index: 100;
  animation: slideDown 0.5s ease-out;
  transition: background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.header-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.logo:hover .logo-icon {
  transform: rotate(5deg) scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.logo-text {
  font-size: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.3px;
  animation: gradientShift 3s ease infinite;
  background-size: 200% 200%;
  white-space: nowrap;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.header-right {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px var(--shadow-sm);
  white-space: nowrap;
}

.theme-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--shadow-md);
  border-color: var(--border-color-hover);
}

.theme-icon {
  font-size: 16px;
  transition: transform 0.3s ease;
}

.theme-toggle:hover .theme-icon {
  transform: scale(1.1) rotate(10deg);
}

.theme-text {
  font-weight: 600;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-badge.connected {
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.95) 0%, rgba(46, 213, 115, 0.95) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-badge.disconnected {
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.95) 0%, rgba(235, 77, 75, 0.95) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: pulseGlow 2s infinite;
  flex-shrink: 0;
}

.status-badge.connected .status-dot {
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(39, 174, 96, 0.6);
}

.status-badge.disconnected .status-dot {
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(231, 76, 60, 0.6);
}

.status-text {
  font-weight: 600;
}

@keyframes pulseGlow {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.8; 
    transform: scale(1.15);
  }
}

.timestamp {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-dark);
  white-space: nowrap;
  transition: all 0.3s ease;
}

.timestamp:hover {
  background: var(--bg-card);
  border-color: var(--border-color-hover);
}

.time-icon {
  font-size: 14px;
  opacity: 0.9;
}

.time-text {
  font-weight: 500;
  letter-spacing: 0.3px;
}

.main {
  padding-bottom: 40px;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card h2 {
  font-size: 22px;
  margin-bottom: 24px;
  color: var(--text-primary);
  position: relative;
  padding-bottom: 12px;
  font-weight: 700;
  transition: color 0.3s ease;
}

.card h2::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  animation: expandLine 0.5s ease-out;
}

@keyframes expandLine {
  from {
    width: 0;
  }
  to {
    width: 60px;
  }
}

@media (max-width: 768px) {
  .header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px 20px;
  }

  .header-left {
    width: 100%;
  }

  .logo-text {
    font-size: 20px;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
  }

  .status-badge,
  .timestamp {
    font-size: 12px;
    padding: 8px 14px;
  }

}

@media (max-width: 480px) {
  .header-container {
    padding: 12px 16px;
  }

  .logo {
    gap: 10px;
  }

  .logo-text {
    font-size: 18px;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .status-badge,
  .timestamp {
    width: 100%;
    justify-content: center;
  }
}
</style>

