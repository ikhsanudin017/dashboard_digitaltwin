import { ref, watch, onUnmounted } from 'vue'

const STORAGE_KEY = 'sensor_last_data'

// Azure Function Configuration (IoT Hub data via Azure Storage)
const AZURE_FUNCTION_URL = import.meta.env.VITE_AZURE_FUNCTION_URL || 'https://func-digitaltwin-2026.azurewebsites.net/api'

// Polling interval in milliseconds (5 seconds for near real-time)
const POLLING_INTERVAL = 5000

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
  // Renamed internally but keeping export name for compatibility
  const mqttConnected = ref(false) // Now represents "polling active"
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
  
  let pollingTimer = null
  let isPolling = false
  
  // Auto-save ke localStorage setiap ada perubahan data
  watch(sensorData, (newData) => {
    saveLastData(newData)
  }, { deep: true })

  // Fetch latest data from Azure Function (via IoT Hub → Storage)
  const fetchLatestData = async () => {
    try {
      const response = await fetch(`${AZURE_FUNCTION_URL}/telemetry/latest`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const data = result.data
        const nextData = { ...sensorData.value }
        
        // Update sensor data from Azure Storage
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
        
        // Compute power if not provided
        if (nextData.power === 0 && nextData.voltage > 0 && nextData.current > 0) {
          nextData.power = parseFloat((nextData.voltage * nextData.current).toFixed(1))
        }
        
        sensorData.value = nextData
        
        console.log('🌡️ Data updated from Azure IoT Hub:', {
          temperature: nextData.temperature,
          humidity: nextData.humidity,
          voltage: nextData.voltage,
          current: nextData.current,
          power: nextData.power,
          timestamp: data.timestamp
        })
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error fetching from Azure:', error.message)
      return false
    }
  }

  // Fetch people count from Azure Function
  const fetchPeopleCount = async () => {
    try {
      const response = await fetch(`${AZURE_FUNCTION_URL}/telemetry/people?limit=1`)
      
      if (!response.ok) return false
      
      const result = await response.json()
      
      if (result.success && result.data && result.data.length > 0) {
        const latestPeople = result.data[0]
        sensorData.value.peopleCount = parseInt(latestPeople.peopleCount) || 0
        sensorData.value.lastPeopleUpdate = latestPeople.timestamp || new Date().toLocaleTimeString()
        
        console.log('👥 People count updated:', sensorData.value.peopleCount)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error fetching people count:', error.message)
      return false
    }
  }

  // Start polling for data
  const connectMQTT = () => {
    console.log('🔌 Starting Azure IoT Hub polling...')
    console.log('📡 Azure Function URL:', AZURE_FUNCTION_URL)
    
    // Load cached data first
    const cached = loadLastData()
    if (cached) {
      sensorData.value = cached
      console.log('💾 Loaded cached data from localStorage')
    }
    
    // Fetch immediately
    fetchLatestData().then(success => {
      if (success) {
        mqttConnected.value = true
        console.log('✅ Connected to Azure IoT Hub (via polling)!')
      }
    })
    
    fetchPeopleCount()
    
    // Start polling interval
    if (!pollingTimer) {
      isPolling = true
      pollingTimer = setInterval(async () => {
        if (!isPolling) return
        
        const success = await fetchLatestData()
        mqttConnected.value = success
        
        // Fetch people count less frequently (every 3rd poll = 15 seconds)
        if (Math.random() < 0.33) {
          await fetchPeopleCount()
        }
      }, POLLING_INTERVAL)
      
      console.log(`🔄 Polling started (every ${POLLING_INTERVAL / 1000}s)`)
    }
  }

  // Stop polling
  const disconnectMQTT = () => {
    isPolling = false
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
    mqttConnected.value = false
    console.log('⚠️ Stopped Azure IoT Hub polling')
  }

  // For compatibility with existing code
  const fetchLatestFromAzure = async () => {
    return await fetchLatestData()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnectMQTT()
  })

  return {
    mqttConnected,
    sensorData,
    connectMQTT,
    disconnectMQTT,
    fetchLatestFromAzure
  }
}
