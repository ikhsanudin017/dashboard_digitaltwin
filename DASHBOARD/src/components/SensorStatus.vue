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
    required: true
  }
})

const temperature = computed(() => props.sensorData.temperature || 0)
const humidity = computed(() => props.sensorData.humidity || 0)
const voltage = computed(() => 0)
const current = computed(() => 0)
const power = computed(() => 0)

const formatValue = (value) => {
  return Number(value || 0).toFixed(1)
}

const getStatusClass = (type) => {
  const value = props.sensorData[type]
  const num = parseFloat(value)
  
  if (!value || isNaN(num)) return 'status-offline'
  
  if (type === 'temperature') {
    if (num > 0 && num < 100) return 'status-online'
  }
  if (type === 'humidity') {
    if (num > 0 && num <= 100) return 'status-online'
  }
  
  return 'status-offline'
}
</script>

<style scoped>
.sensor-status {
  width: 100%;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.sensor-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  animation: cardFadeIn 0.6s ease-out backwards;
}

.sensor-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.sensor-card:hover::before {
  opacity: 1;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.sensor-card:nth-child(1) { animation-delay: 0.1s; }
.sensor-card:nth-child(2) { animation-delay: 0.2s; }
.sensor-card:nth-child(3) { animation-delay: 0.3s; }
.sensor-card:nth-child(4) { animation-delay: 0.4s; }
.sensor-card:nth-child(5) { animation-delay: 0.5s; }

.sensor-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
}

.sensor-card.temperature {
  border-color: rgba(231, 76, 60, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 245, 245, 0.95) 100%);
}

.sensor-card.temperature:hover {
  border-color: #e74c3c;
  box-shadow: 0 16px 40px rgba(231, 76, 60, 0.25);
}

.sensor-card.temperature::before {
  color: #e74c3c;
}

.sensor-card.humidity {
  border-color: rgba(52, 152, 219, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 250, 255, 0.95) 100%);
}

.sensor-card.humidity:hover {
  border-color: #3498db;
  box-shadow: 0 16px 40px rgba(52, 152, 219, 0.25);
}

.sensor-card.humidity::before {
  color: #3498db;
}

.sensor-card.voltage {
  border-color: rgba(155, 89, 182, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 245, 255, 0.95) 100%);
}

.sensor-card.voltage:hover {
  border-color: #9b59b6;
  box-shadow: 0 16px 40px rgba(155, 89, 182, 0.25);
}

.sensor-card.voltage::before {
  color: #9b59b6;
}

.sensor-card.current {
  border-color: rgba(243, 156, 18, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 250, 245, 0.95) 100%);
}

.sensor-card.current:hover {
  border-color: #f39c12;
  box-shadow: 0 16px 40px rgba(243, 156, 18, 0.25);
}

.sensor-card.current::before {
  color: #f39c12;
}

.sensor-card.power {
  border-color: rgba(39, 174, 96, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 255, 250, 0.95) 100%);
}

.sensor-card.power:hover {
  border-color: #27ae60;
  box-shadow: 0 16px 40px rgba(39, 174, 96, 0.25);
}

.sensor-card.power::before {
  color: #27ae60;
}

.sensor-icon {
  font-size: 48px;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
  animation: iconFloat 3s ease-in-out infinite;
}

.sensor-card:hover .sensor-icon {
  transform: scale(1.1) rotate(5deg);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.sensor-info {
  flex: 1;
}

.sensor-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sensor-value {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 5px;
  line-height: 1.2;
  transition: all 0.3s;
}

.sensor-card:hover .sensor-value {
  transform: scale(1.05);
}

.sensor-desc {
  font-size: 11px;
  color: #95a5a6;
  font-weight: 500;
}

.sensor-status-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  animation: pulseGlow 2s infinite;
  border: 2px solid white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
}

.status-online {
  background: #27ae60;
  box-shadow: 0 0 12px #27ae60, 0 0 24px rgba(39, 174, 96, 0.4);
}

.status-offline {
  background: #e74c3c;
  box-shadow: 0 0 12px #e74c3c, 0 0 24px rgba(231, 76, 60, 0.4);
}

.status-warning {
  background: #f39c12;
  box-shadow: 0 0 12px #f39c12, 0 0 24px rgba(243, 156, 18, 0.4);
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

@media (max-width: 768px) {
  .sensor-grid {
    grid-template-columns: 1fr;
  }

  .sensor-card {
    padding: 20px;
  }

  .sensor-icon {
    font-size: 40px;
  }

  .sensor-value {
    font-size: 24px;
  }
}
</style>





