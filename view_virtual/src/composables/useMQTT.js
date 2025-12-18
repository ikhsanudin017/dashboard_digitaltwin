import { ref, watch } from 'vue'
import mqtt from 'mqtt'
import axios from 'axios'

const STORAGE_KEY = 'sensor_last_data'

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
  
  let client = null
  
  // Fetch latest data from Azure Storage Table
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
      console.log('☁️ Fetching latest data from Azure Storage Table (SensorTelemetry)...')
      const response = await axios.get(`${azureUrl}/telemetry/latest`, {
        timeout: 10000
      })
      
      const result = response.data
      
      if (result.success && result.data) {
        const data = result.data
        console.log('✅ Got latest data from Azure Storage:', data)
        
        sensorData.value = {
          temperature: parseFloat(data.suhu) || 0,
          humidity: parseFloat(data.kelembaban) || 0,
          voltage: parseFloat(data.tegangan) || 0,
          current: parseFloat(data.arus) || 0,
          power: parseFloat(data.daya) || 0,
          voltageStatus: data.status_tegangan || 'unknown',
          currentStatus: data.status_arus || 'unknown',
          peopleCount: sensorData.value.peopleCount,
          lastPeopleUpdate: sensorData.value.lastPeopleUpdate
        }
        
        console.log('📊 Dashboard updated with Azure Storage data')
        console.log('🕐 Last update from Azure:', data.timestamp)
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
      // Fallback ke localStorage
      const cached = loadLastData()
      if (cached) {
        sensorData.value = cached
        console.log('💾 Loaded from localStorage (Azure error)')
      }
      return false
    }
  }

  const connectMQTT = () => {
    const brokerUrl = 'wss://aa736fd1494847d087ef6244a8428cf9.s1.eu.hivemq.cloud:8884/mqtt'
    const username = 'digitaltwin'
    const password = 'Digitaltwin1'
    
    console.log('🔌 Connecting...')
    
    client = mqtt.connect(brokerUrl, {
      username,
      password,
      clientId: `vue_${Date.now()}`,
      clean: true
    })

    client.on('connect', () => {
      console.log('✅ CONNECTED!')
      mqttConnected.value = true
      
      // Subscribe ke topic spesifik
      client.subscribe('sensor/dht11/data', (err) => {
        if (!err) console.log('✅ Subscribed: sensor/dht11/data')
      })
      
      // Subscribe ke topic people counter
      client.subscribe('sensor/camera/people', (err) => {
        if (!err) console.log('✅ Subscribed: sensor/camera/people')
      })
      
      // Subscribe ke SEMUA topic untuk debugging
      client.subscribe('#', (err) => {
        if (!err) console.log('✅ Subscribed: # (ALL TOPICS)')
      })
      
      console.log('⏳ Waiting for ESP32 data...')
      
      // Fetch latest data from Azure Storage on connect
      console.log('🔄 Loading last known data from Azure Storage...')
      fetchLatestFromAzure()
    })

    client.on('message', (topic, payload) => {
      const msg = payload.toString()
      console.log('📨 ========================================')
      console.log('📨 MESSAGE RECEIVED!')
      console.log('📨 Topic:', topic)
      console.log('📨 Payload:', msg)
      console.log('📨 Time:', new Date().toLocaleTimeString())
      
      try {
        const data = JSON.parse(msg)
        console.log('📨 Parsed:', data)
        
        const nextData = {
          ...sensorData.value
        }
        
        if (data.suhu !== undefined) {
          nextData.temperature = parseFloat(data.suhu)
          console.log('🌡️ Temperature:', nextData.temperature)
        }
        if (data.kelembaban !== undefined) {
          nextData.humidity = parseFloat(data.kelembaban)
          console.log('💧 Humidity:', nextData.humidity)
        }
        if (data.tegangan !== undefined) {
          nextData.voltage = parseFloat(data.tegangan)
          console.log('🔌 Voltage:', nextData.voltage)
        }
        if (data.arus !== undefined) {
          nextData.current = parseFloat(data.arus)
          console.log('⚡ Current:', nextData.current)
        }
        if (data.daya !== undefined) {
          const parsedPower = parseFloat(data.daya)
          if (!isNaN(parsedPower)) {
            nextData.power = parsedPower
            console.log('💡 Power (payload):', nextData.power)
          }
        }
        if (data.status_tegangan) {
          nextData.voltageStatus = data.status_tegangan
          console.log('📡 Voltage status:', nextData.voltageStatus)
        }
        if (data.status_arus) {
          nextData.currentStatus = data.status_arus
          console.log('📡 Current status:', nextData.currentStatus)
        }
        
        // Handle people counter data
        if (data.jumlahOrang !== undefined) {
          nextData.peopleCount = parseInt(data.jumlahOrang)
          nextData.lastPeopleUpdate = new Date().toLocaleTimeString()
          console.log('👥 People Count:', nextData.peopleCount)
        }
        
        if ((!data.daya || nextData.power === 0) && (nextData.voltage > 0) && (nextData.current > 0)) {
          nextData.power = parseFloat((nextData.voltage * nextData.current).toFixed(1))
          console.log('💡 Power (computed):', nextData.power)
        }
        
        sensorData.value = { ...nextData }
        console.log('✅ Updated (LIVE):', sensorData.value)
      } catch (e) {
        console.error('❌ Parse error:', e.message)
      }
      console.log('📨 ========================================')
    })

    client.on('error', (err) => {
      console.error('❌ MQTT Error:', err.message)
      mqttConnected.value = false
      // JANGAN reset sensorData - biarkan data terakhir tetap tampil
      console.log('⚠️ Connection error, keeping last known data')
    })

    client.on('close', () => {
      console.log('⚠️ MQTT Connection closed')
      mqttConnected.value = false
      // JANGAN reset sensorData - biarkan data terakhir tetap tampil
      console.log('💾 Keeping last known data on dashboard')
    })

    client.on('offline', () => {
      console.log('⚠️ MQTT Offline')
      mqttConnected.value = false
      // JANGAN reset sensorData - biarkan data terakhir tetap tampil
      console.log('💾 Keeping last known data on dashboard')
    })
  }

  const disconnectMQTT = () => {
    if (client) client.end()
    mqttConnected.value = false
    // JANGAN reset sensorData saat disconnect manual
  }

  return {
    mqttConnected,
    sensorData,
    connectMQTT,
    disconnectMQTT,
    fetchLatestFromAzure
  }
}
