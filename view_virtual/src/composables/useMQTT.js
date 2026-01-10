import { ref, watch } from 'vue'
import mqtt from 'mqtt'

const STORAGE_KEY = 'sensor_last_data'

// HiveMQ Cloud Configuration
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://aa736fd1494847d087ef6244a8428cf9.s1.eu.hivemq.cloud:8884/mqtt'
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME || 'digitaltwin'
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD || 'Digitaltwin1'

// Topics to subscribe
const SENSOR_TOPIC = 'sensor/dht11/data'
const PEOPLE_TOPIC = 'sensor/camera/people'

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
  
  let client = null
  
  // Auto-save ke localStorage setiap ada perubahan data
  watch(sensorData, (newData) => {
    saveLastData(newData)
  }, { deep: true })

  // Handle incoming MQTT messages
  const handleMessage = (topic, message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log(`📨 MQTT message on ${topic}:`, data)
      
      const nextData = { ...sensorData.value }
      
      if (topic === SENSOR_TOPIC || topic.includes('dht11') || topic.includes('sensor')) {
        // ESP32 Sensor Data
        if (data.suhu !== undefined) {
          nextData.temperature = parseFloat(data.suhu) || 0
        }
        if (data.temperature !== undefined) {
          nextData.temperature = parseFloat(data.temperature) || 0
        }
        if (data.kelembaban !== undefined) {
          nextData.humidity = parseFloat(data.kelembaban) || 0
        }
        if (data.humidity !== undefined) {
          nextData.humidity = parseFloat(data.humidity) || 0
        }
        if (data.tegangan !== undefined) {
          nextData.voltage = parseFloat(data.tegangan) || 0
        }
        if (data.voltage !== undefined) {
          nextData.voltage = parseFloat(data.voltage) || 0
        }
        if (data.arus !== undefined) {
          nextData.current = parseFloat(data.arus) || 0
        }
        if (data.current !== undefined) {
          nextData.current = parseFloat(data.current) || 0
        }
        if (data.daya !== undefined) {
          nextData.power = parseFloat(data.daya) || 0
        }
        if (data.power !== undefined) {
          nextData.power = parseFloat(data.power) || 0
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
        
        console.log('🌡️ Sensor data updated:', {
          temperature: nextData.temperature,
          humidity: nextData.humidity,
          voltage: nextData.voltage,
          current: nextData.current,
          power: nextData.power
        })
      }
      
      if (topic === PEOPLE_TOPIC || topic.includes('people') || topic.includes('camera')) {
        // Raspberry Pi People Counter Data
        if (data.jumlahOrang !== undefined) {
          nextData.peopleCount = parseInt(data.jumlahOrang) || 0
        }
        if (data.count !== undefined) {
          nextData.peopleCount = parseInt(data.count) || 0
        }
        if (data.peopleCount !== undefined) {
          nextData.peopleCount = parseInt(data.peopleCount) || 0
        }
        nextData.lastPeopleUpdate = data.timestamp || new Date().toLocaleTimeString()
        
        console.log('👥 People count updated:', nextData.peopleCount)
      }
      
      sensorData.value = nextData
      
    } catch (error) {
      console.error('❌ Error parsing MQTT message:', error)
    }
  }

  // Connect to MQTT broker
  const connectMQTT = () => {
    console.log('🔌 Connecting to HiveMQ MQTT broker...')
    console.log('📡 Broker:', MQTT_BROKER_URL)
    
    // Load cached data first
    const cached = loadLastData()
    if (cached) {
      sensorData.value = cached
      console.log('💾 Loaded cached data from localStorage')
    }
    
    try {
      client = mqtt.connect(MQTT_BROKER_URL, {
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
        clientId: `dashboard_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        rejectUnauthorized: true
      })
      
      client.on('connect', () => {
        console.log('✅ Connected to HiveMQ MQTT broker!')
        mqttConnected.value = true
        
        // Subscribe to topics
        client.subscribe([SENSOR_TOPIC, PEOPLE_TOPIC, 'sensor/#'], { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ Subscribe error:', err)
          } else {
            console.log('📬 Subscribed to topics:', [SENSOR_TOPIC, PEOPLE_TOPIC, 'sensor/#'])
          }
        })
      })
      
      client.on('message', handleMessage)
      
      client.on('error', (error) => {
        console.error('❌ MQTT Error:', error.message)
        mqttConnected.value = false
      })
      
      client.on('close', () => {
        console.log('⚠️ MQTT connection closed')
        mqttConnected.value = false
      })
      
      client.on('reconnect', () => {
        console.log('🔄 Reconnecting to MQTT broker...')
      })
      
      client.on('offline', () => {
        console.log('📴 MQTT client offline')
        mqttConnected.value = false
      })
      
    } catch (error) {
      console.error('❌ Failed to connect to MQTT:', error)
      mqttConnected.value = false
    }
  }

  // Disconnect from MQTT broker
  const disconnectMQTT = () => {
    if (client) {
      client.end(true)
      client = null
    }
    mqttConnected.value = false
    console.log('⚠️ Disconnected from MQTT broker')
  }

  // For compatibility with existing code
  const fetchLatestFromAzure = async () => {
    // This is now handled by MQTT real-time updates
    return mqttConnected.value
  }

  return {
    mqttConnected,
    sensorData,
    connectMQTT,
    disconnectMQTT,
    fetchLatestFromAzure
  }
}
