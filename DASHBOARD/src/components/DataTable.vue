<template>
  <div class="data-table">
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Suhu (°C)</th>
            <th>Kelembaban (%)</th>
            <th>Tegangan (V)</th>
            <th>Arus (A)</th>
            <th>Daya (W)</th>
            <th>Jumlah Orang</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ currentTime }}</td>
            <td>{{ formatValue(sensorData.temperature) }}</td>
            <td>{{ formatValue(sensorData.humidity) }}</td>
            <td>{{ formatValue(sensorData.voltage) }}</td>
            <td>{{ formatValue(sensorData.current) }}</td>
            <td>{{ formatValue(sensorData.power) }}</td>
            <td>{{ peopleCount }}</td>
            <td>
              <span class="status-badge" :class="getOverallStatus()">
                {{ getOverallStatusText() }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="table-summary">
      <div class="summary-item">
        <div class="summary-label">Rata-rata Suhu</div>
        <div class="summary-value">{{ formatValue(sensorData.temperature) }}°C</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Konsumsi</div>
        <div class="summary-value">{{ formatValue(sensorData.power) }}W</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Kapasitas Ruangan</div>
        <div class="summary-value">{{ peopleCount }} / 20</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({})
  },
  peopleCount: {
    type: Number,
    default: 0
  }
})

const currentTime = ref(new Date().toLocaleString('id-ID'))
let timeInterval = null

// Watch untuk debug
watch(() => props.sensorData, (newData) => {
  console.log('📊 DataTable component received update:', newData)
}, { deep: true, immediate: true })

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleString('id-ID')
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

const formatValue = (value) => {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toFixed(2)
}

const getOverallStatus = () => {
  const temp = parseFloat(props.sensorData.temperature) || 0
  const voltage = parseFloat(props.sensorData.voltage) || 0
  const humidity = parseFloat(props.sensorData.humidity) || 0
  
  // Cek apakah ada data valid
  const hasValidData = (temp > -50 && temp < 100) || (humidity >= 0 && humidity <= 100) || (voltage > 0)
  
  if (!hasValidData) {
    return 'status-offline'
  }
  
  if (temp > 30 || temp < 15 || (voltage > 0 && (voltage > 250 || voltage < 200))) {
    return 'status-warning'
  }
  
  return 'status-online'
}

const getOverallStatusText = () => {
  const status = getOverallStatus()
  if (status === 'status-online') return 'Normal'
  if (status === 'status-warning') return 'Perhatian'
  return 'Offline'
}
</script>

<style scoped>
.data-table {
  width: 100%;
}

.table-responsive {
  overflow-x: auto;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

tbody tr {
  border-bottom: 1px solid #e9ecef;
  transition: background 0.2s;
}

tbody tr:hover {
  background: #f8f9fa;
}

tbody tr:last-child {
  border-bottom: none;
}

td {
  padding: 15px;
  font-size: 14px;
  color: #2c3e50;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-online {
  background: #d4edda;
  color: #155724;
}

.status-badge.status-warning {
  background: #fff3cd;
  color: #856404;
}

.status-badge.status-offline {
  background: #f8d7da;
  color: #721c24;
}

.table-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.summary-item {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  border: 2px solid #dee2e6;
}

.summary-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .table-responsive {
    font-size: 12px;
  }
  
  th, td {
    padding: 10px 8px;
  }
  
  .table-summary {
    grid-template-columns: 1fr;
  }
}
</style>





