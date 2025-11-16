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
            <div class="status-badge" :class="mqttConnected ? 'connected' : 'disconnected'">
              <span class="status-dot"></span>
              <span class="status-text">{{ mqttConnected ? 'MQTT Terhubung' : 'Mode DEMO' }}</span>
            </div>
            
            <button v-if="mqttConnected" @click="testSendData" class="test-btn">
              <span class="btn-icon">🧪</span>
              <span class="btn-text">Test Kirim Data</span>
            </button>
            
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
            />
          </div>
          
          <div class="card">
            <h2>📊 Status Sensor Real-time</h2>
            <SensorStatus :sensor-data="sensorData" />
          </div>
        </div>

        <!-- Row 2: Grafik Data Historis -->
        <div class="grid grid-3">
          <div class="card">
            <h2>🌡️ Suhu (24 Jam)</h2>
            <TemperatureChart :data="temperatureData" />
          </div>
          
          <div class="card">
            <h2>⚡ Konsumsi Listrik (7 Hari)</h2>
            <ElectricityChart :data="electricityData" />
          </div>
          
          <div class="card">
            <h2>👥 Jumlah Orang (Real-time)</h2>
            <PeopleChart :data="peopleData" />
          </div>
        </div>

        <!-- Row 3: Detail Data -->
        <div class="card">
          <h2>📋 Detail Data Sensor</h2>
          <DataTable :sensor-data="sensorData" :people-count="peopleCount" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DigitalTwin3D from './components/DigitalTwin3D.vue'
import SensorStatus from './components/SensorStatus.vue'
import TemperatureChart from './components/TemperatureChart.vue'
import ElectricityChart from './components/PeopleChart.vue'
import PeopleChart from './components/PeopleChart.vue'
import DataTable from './components/DataTable.vue'
import { useMQTT } from './composables/useMQTT'

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

const currentTime = ref(new Date().toLocaleString('id-ID'))

// Update waktu setiap detik
let timeInterval = null

const testSendData = () => {
  // Test function - bisa diisi dengan logic test jika diperlukan
  console.log('Test send data clicked')
}

onMounted(() => {
  connectMQTT()
  
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleString('id-ID')
  }, 1000)
})

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
  background: #ffffff;
  padding: 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
  animation: slideDown 0.5s ease-out;
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

.test-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.test-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.5s, height 0.5s;
}

.test-btn:hover::before {
  width: 200px;
  height: 200px;
}

.test-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.test-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 16px;
  line-height: 1;
}

.btn-text {
  font-weight: 600;
}

.timestamp {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2c3e50;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  white-space: nowrap;
  transition: all 0.3s ease;
}

.timestamp:hover {
  background: #e9ecef;
  border-color: rgba(0, 0, 0, 0.12);
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
  color: #2c3e50;
  position: relative;
  padding-bottom: 12px;
  font-weight: 700;
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
  .test-btn,
  .timestamp {
    font-size: 12px;
    padding: 8px 14px;
  }

  .btn-text {
    display: none;
  }

  .test-btn {
    padding: 8px 12px;
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
  .test-btn,
  .timestamp {
    width: 100%;
    justify-content: center;
  }
}
</style>

