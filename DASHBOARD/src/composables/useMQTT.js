import { ref } from 'vue'
import mqtt from 'mqtt'

export function useMQTT() {
  const mqttConnected = ref(false)
  const sensorData = ref({
    temperature: 0,
    humidity: 0,
    voltage: 0,
    current: 0,
    power: 0,
    voltageStatus: 'unknown',
    currentStatus: 'unknown'
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
        
        if ((!data.daya || nextData.power === 0) && (nextData.voltage > 0) && (nextData.current > 0)) {
          nextData.power = parseFloat((nextData.voltage * nextData.current).toFixed(1))
          console.log('💡 Power (computed):', nextData.power)
        }
        
        sensorData.value = { ...nextData }
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
