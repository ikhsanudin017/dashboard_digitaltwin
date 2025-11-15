<template>
  <div class="sensor-status">
    <div class="sensor-grid">
      <div class="sensor-card temperature">
        <div class="sensor-icon">🌡️</div>
        <div class="sensor-info">
          <div class="sensor-label">Suhu</div>
          <div class="sensor-value">{{ formatValue(temperature) }}°C</div>
          <div class="sensor-desc">DHT22 Sensor</div>
        </div>
        <div class="sensor-status-indicator" :class="getStatusClass('temperature')"></div>
      </div>

      <div class="sensor-card humidity">
        <div class="sensor-icon">💧</div>
        <div class="sensor-info">
          <div class="sensor-label">Kelembaban</div>
          <div class="sensor-value">{{ formatValue(humidity) }}%</div>
          <div class="sensor-desc">DHT22 Sensor</div>
        </div>
        <div class="sensor-status-indicator" :class="getStatusClass('humidity')"></div>
      </div>

      <div class="sensor-card voltage">
        <div class="sensor-icon">🔌</div>
        <div class="sensor-info">
          <div class="sensor-label">Tegangan</div>
          <div class="sensor-value">{{ formatValue(voltage) }}V</div>
          <div class="sensor-desc">ZMPT101B Sensor</div>
        </div>
        <div class="sensor-status-indicator" :class="getStatusClass('voltage')"></div>
      </div>

      <div class="sensor-card current">
        <div class="sensor-icon">⚡</div>
        <div class="sensor-info">
          <div class="sensor-label">Arus</div>
          <div class="sensor-value">{{ formatValue(current) }}A</div>
          <div class="sensor-desc">SCT-013 Sensor</div>
        </div>
        <div class="sensor-status-indicator" :class="getStatusClass('current')"></div>
      </div>

      <div class="sensor-card power">
        <div class="sensor-icon">💡</div>
        <div class="sensor-info">
          <div class="sensor-label">Daya</div>
          <div class="sensor-value">{{ formatValue(power) }}W</div>
          <div class="sensor-desc">Konsumsi Listrik</div>
        </div>
        <div class="sensor-status-indicator" :class="getStatusClass('power')"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({
      temperature: 0,
      humidity: 0,
      voltage: 0,
      current: 0,
      power: 0
    })
  }
})

// Computed untuk memastikan reactivity
const temperature = computed(() => props.sensorData?.temperature ?? 0)
const humidity = computed(() => props.sensorData?.humidity ?? 0)
const voltage = computed(() => props.sensorData?.voltage ?? 0)
const current = computed(() => props.sensorData?.current ?? 0)
const power = computed(() => props.sensorData?.power ?? 0)

const formatValue = (value) => {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toFixed(2)
}

// Watch untuk debug
watch(() => props.sensorData, (newData, oldData) => {
  console.log('📊 SensorStatus - WATCH TRIGGERED!')
  console.log('📊 Old props:', oldData)
  console.log('📊 New props:', newData)
  console.log('📊 Temperature in props:', props.sensorData?.temperature)
  console.log('📊 Humidity in props:', props.sensorData?.humidity)
  console.log('📊 Computed temperature:', temperature.value)
  console.log('📊 Computed humidity:', humidity.value)
}, { deep: true, immediate: true })

const getStatusClass = (type) => {
  const value = props.sensorData[type]
  
  // Debug log
  console.log(`🔍 getStatusClass(${type}):`, value, '| type:', typeof value)
  
  // Jika value null atau undefined, berarti offline
  if (value === null || value === undefined) {
    console.log(`⚠️ ${type} is null/undefined - OFFLINE`)
    return 'status-offline'
  }
  
  const numValue = parseFloat(value)
  
  // Jika bukan angka valid, offline
  if (isNaN(numValue)) {
    console.log(`⚠️ ${type} is NaN - OFFLINE`)
    return 'status-offline'
  }
  
  if (type === 'temperature') {
    // Suhu valid antara -50 sampai 100 derajat (termasuk 0)
    if (numValue >= -50 && numValue <= 100) {
      if (numValue > 30 || numValue < 15) {
        console.log(`✅ ${type} = ${numValue}°C - WARNING (out of range)`)
        return 'status-warning'
      }
      console.log(`✅ ${type} = ${numValue}°C - ONLINE`)
      return 'status-online'
    }
    console.log(`❌ ${type} = ${numValue}°C - OFFLINE (out of valid range)`)
    return 'status-offline'
  }
  
  if (type === 'humidity') {
    // Kelembaban valid antara 0-100% (termasuk 0)
    if (numValue >= 0 && numValue <= 100) {
      console.log(`✅ ${type} = ${numValue}% - ONLINE`)
      return 'status-online'
    }
    console.log(`❌ ${type} = ${numValue}% - OFFLINE (out of valid range)`)
    return 'status-offline'
  }
  
  if (type === 'voltage') {
    // Tegangan valid jika > 0
    if (numValue > 0) {
      if (numValue > 250 || numValue < 200) return 'status-warning'
      return 'status-online'
    }
    return 'status-offline'
  }
  
  if (type === 'current' || type === 'power') {
    // Arus dan daya valid jika >= 0
    if (numValue >= 0) return 'status-online'
    return 'status-offline'
  }
  
  // Default: online jika ada nilai valid
  return 'status-online'
}
</script>

<style scoped>
.sensor-status {
  width: 100%;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.sensor-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sensor-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sensor-card.temperature {
  border-color: #e74c3c;
}

.sensor-card.humidity {
  border-color: #3498db;
}

.sensor-card.voltage {
  border-color: #9b59b6;
}

.sensor-card.current {
  border-color: #f39c12;
}

.sensor-card.power {
  border-color: #27ae60;
}

.sensor-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.sensor-info {
  flex: 1;
}

.sensor-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 5px;
  font-weight: 600;
  text-transform: uppercase;
}

.sensor-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 3px;
}

.sensor-desc {
  font-size: 11px;
  color: #95a5a6;
}

.sensor-status-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-online {
  background: #27ae60;
  box-shadow: 0 0 8px #27ae60;
}

.status-offline {
  background: #e74c3c;
  box-shadow: 0 0 8px #e74c3c;
}

.status-warning {
  background: #f39c12;
  box-shadow: 0 0 8px #f39c12;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

@media (max-width: 768px) {
  .sensor-grid {
    grid-template-columns: 1fr;
  }
}
</style>





