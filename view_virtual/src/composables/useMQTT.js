import { ref, watch } from 'vue'
import axios from 'axios'

const STORAGE_KEY = 'sensor_last_data'
const POLLING_INTERVAL = 5000 // Poll Azure setiap 5 detik

// Simpan data ke localStorage sebagai backup
const saveLastData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('❌ Failed to save to localStorage:', e)
  }
}

// Load data terakhir dari localStorage (sebagai fallback)
const loadLastData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('❌ Failed to load from localStorage:', e)
  }
  return null
}

export function useMQTT() {
  const mqttConnected = ref(false)
  const sensorData = ref({
    temperature: 0,
    humidity: 0,
    voltage: 0,
    current: 0,
    power: 0,
    voltageStatus: 'unknown',
    currentStatus: 'unknown',
    peopleCount: 0,
    lastPeopleUpdate: null
  })
  
  // Auto-save ke localStorage setiap ada perubahan data
  watch(sensorData, (newData) => {
    saveLastData(newData)
  }, { deep: true })
  
  let pollingInterval = null
  
  // Fetch latest data from Azure Storage Table via Azure Function
  const fetchLatestFromAzure = async () => {
    const azureUrl = import.meta.env.VITE_AZURE_FUNCTION_URL
    if (!azureUrl) {
      console.log('⚠️ Azure Function URL not configured, using localStorage')
      const cached = loadLastData()
      if (cached) {
        sensorData.value = cached
        console.log('💾 Loaded from localStorage')
      }
      return false
    }
    
    try {
      console.log('☁️ Fetching latest data from Azure IoT Hub Storage...')
      const response = await axios.get(`${azureUrl}/telemetry/latest`, {
        timeout: 10000
      })
      
      const result = response.data
      
      if (result.success && result.data) {
        const data = result.data
        console.log('✅ Got latest data from Azure:', data)
        
        const nextData = { ...sensorData.value }
        
        // Update sensor data
        if (data.suhu !== undefined) {
          nextData.temperature = parseFloat(data.suhu) || 0
        }
        if (data.kelembaban !== undefined) {
          nextData.humidity = parseFloat(data.kelembaban) || 0
        }
        if (data.tegangan !== undefined) {
          nextData.voltage = parseFloat(data.tegangan) || 0
        }
        if (data.arus !== undefined) {
          nextData.current = parseFloat(data.arus) || 0
        }
        if (data.daya !== undefined) {
          nextData.power = parseFloat(data.daya) || 0
        }
        if (data.status_tegangan) {
          nextData.voltageStatus = data.status_tegangan
        }
        if (data.status_arus) {
          nextData.currentStatus = data.status_arus
        }
        
        // Handle people counter data
        if (data.jumlahOrang !== undefined) {
          nextData.peopleCount = parseInt(data.jumlahOrang) || 0
          nextData.lastPeopleUpdate = data.timestamp || new Date().toLocaleTimeString()
        }
        
        // Compute power if not provided
        if ((!data.daya || nextData.power === 0) && nextData.voltage > 0 && nextData.current > 0) {
          nextData.power = parseFloat((nextData.voltage * nextData.current).toFixed(1))
        }
        
        sensorData.value = nextData
        mqttConnected.value = true
        
        console.log('📊 Dashboard updated with Azure IoT Hub data')
        console.log('🕐 Last update:', data.timestamp || new Date().toLocaleTimeString())
        return true
      } else {
        console.log('⚠️ No data from Azure, trying localStorage')
        const cached = loadLastData()
        if (cached) {
          sensorData.value = cached
          console.log('💾 Loaded from localStorage')
        }
      }
      
      return false
    } catch (error) {
      console.error('❌ Failed to fetch from Azure:', error.message)
      mqttConnected.value = false
      
      // Fallback ke localStorage
      const cached = loadLastData()
      if (cached) {
        sensorData.value = cached
        console.log('💾 Loaded from localStorage (Azure error)')
      }
      return false
    }
  }

  // Connect = Start polling Azure IoT Hub data
  const connectMQTT = () => {
    console.log('🔌 Connecting to Azure IoT Hub...')
    
    // Fetch immediately on connect
    fetchLatestFromAzure()
    
    // Start polling every 5 seconds for real-time updates
    pollingInterval = setInterval(() => {
      fetchLatestFromAzure()
    }, POLLING_INTERVAL)
    
    console.log(`✅ Azure IoT Hub polling started (every ${POLLING_INTERVAL/1000}s)`)
    console.log('📡 Data source: ESP32 → Azure IoT Hub → Azure Storage → Dashboard')
  }

  // Disconnect = Stop polling
  const disconnectMQTT = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
    mqttConnected.value = false
    console.log('⚠️ Azure IoT Hub polling stopped')
    console.log('💾 Keeping last known data on dashboard')
  }

  return {
    mqttConnected,
    sensorData,
    connectMQTT,
    disconnectMQTT,
    fetchLatestFromAzure
  }
}
