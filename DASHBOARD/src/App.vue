<template>
  <div class="app">
    <header class="header">
      <div class="container">
        <h1>🏢 Digital Twin Dashboard</h1>
        <div class="header-info">
          <div class="status-badge" :class="mqttConnected ? 'connected' : 'disconnected'">
            <span class="status-dot"></span>
            {{ mqttConnected ? 'MQTT Terhubung' : 'Mode DEMO' }}
          </div>
          <div class="timestamp">
            {{ currentTime }}
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import DigitalTwin3D from './components/DigitalTwin3D.vue'
import SensorStatus from './components/SensorStatus.vue'
import TemperatureChart from './components/TemperatureChart.vue'
import ElectricityChart from './components/ElectricityChart.vue'
import PeopleChart from './components/PeopleChart.vue'
import DataTable from './components/DataTable.vue'
import { useMQTT } from './composables/useMQTT'
import { useAPI } from './composables/useAPI'

const { 
  mqttConnected, 
  sensorData, 
  peopleCount, 
  connectMQTT, 
  disconnectMQTT 
} = useMQTT()

// Watch untuk debug - pastikan data ter-update
watch(() => sensorData.value, (newData, oldData) => {
  console.log('📊 App.vue - sensorData WATCH TRIGGERED!')
  console.log('📊 Old data:', oldData)
  console.log('📊 New data:', newData)
  console.log('📊 Temperature changed:', oldData?.temperature, '→', newData.temperature)
  console.log('📊 Humidity changed:', oldData?.humidity, '→', newData.humidity)
  console.log('📊 Is reactive?', sensorData.value === newData)
}, { deep: true, immediate: true })

const { 
  temperatureData, 
  electricityData, 
  peopleData, 
  fetchHistoricalData 
} = useAPI()

const currentTime = ref(new Date().toLocaleString('id-ID'))

// Update waktu setiap detik
let timeInterval = null

onMounted(async () => {
  // Fetch data historis
  await fetchHistoricalData()
  
  // Connect MQTT (akan otomatis fallback ke demo mode jika gagal)
  await connectMQTT()
  
  // Update waktu
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
}

.header {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header h1 {
  font-size: 28px;
  color: #2c3e50;
  margin: 0;
}

.header-info {
  display: flex;
  gap: 20px;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.status-badge.connected {
  background: #d4edda;
  color: #155724;
}

.status-badge.disconnected {
  background: #f8d7da;
  color: #721c24;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

.status-badge.connected .status-dot {
  background: #27ae60;
}

.status-badge.disconnected .status-dot {
  background: #e74c3c;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timestamp {
  color: #7f8c8d;
  font-size: 14px;
}

.test-btn {
  padding: 6px 12px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s;
}

.test-btn:hover {
  background: #2980b9;
  transform: translateY(-1px);
}

.main {
  padding-bottom: 40px;
}

.card h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

@media (max-width: 768px) {
  .header .container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>

