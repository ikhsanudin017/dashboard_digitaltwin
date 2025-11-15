import { ref } from 'vue'
import mqtt from 'mqtt'

export function useMQTT() {
  const mqttConnected = ref(false)
  const sensorData = ref({
    temperature: 0,
    humidity: 0
  })
  
  let client = null

  const connectMQTT = () => {
    const brokerUrl = 'wss://02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud:8884/mqtt'
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
      
      // Subscribe ke SEMUA topic untuk debugging
      client.subscribe('#', (err) => {
        if (!err) console.log('✅ Subscribed: # (ALL TOPICS)')
      })
      
      console.log('⏳ Waiting for ESP32 data...')
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
        
        // Update temperature dan humidity
        if (data.suhu !== undefined) {
          sensorData.value.temperature = parseFloat(data.suhu)
          console.log('🌡️ Temperature:', sensorData.value.temperature)
        }
        if (data.kelembaban !== undefined) {
          sensorData.value.humidity = parseFloat(data.kelembaban)
          console.log('💧 Humidity:', sensorData.value.humidity)
        }
        
        console.log('✅ Updated:', sensorData.value)
      } catch (e) {
        console.error('❌ Parse error:', e.message)
      }
      console.log('📨 ========================================')
    })

    client.on('error', (err) => {
      console.error('❌', err.message)
      mqttConnected.value = false
    })
  }

  const disconnectMQTT = () => {
    if (client) client.end()
    mqttConnected.value = false
  }

  return {
    mqttConnected,
    sensorData,
    connectMQTT,
    disconnectMQTT
  }
}
