// Script untuk test MQTT dan tampilkan data suhu di terminal
import mqtt from 'mqtt'

// Konfigurasi MQTT HiveMQ Cloud
const brokerUrl = 'wss://02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud:8884/mqtt'
const username = 'digitaltwin'
const password = 'Twindigital1'

console.log('🔌 Connecting to MQTT broker...')
console.log('🔌 Broker:', brokerUrl)
console.log('🔌 Username:', username)
console.log('')

const client = mqtt.connect(brokerUrl, {
  username,
  password,
  clientId: `test_${Math.random().toString(16).substr(2, 8)}`,
  clean: true,
  reconnectPeriod: 5000
})

client.on('connect', () => {
  console.log('✅ MQTT Connected Successfully!')
  console.log('📡 Subscribing to topics...')
  console.log('')
  
  // Subscribe ke semua topik yang mungkin
  const topics = [
    'sensor/dht11/data',
    'sensor/dht11',
    'sensor/suhu',
    'sensor/temperature',
    'sensor/temp',
    'sensor/data',
    '#'
  ]
  
  topics.forEach(topic => {
    client.subscribe(topic, { qos: 0 }, (err) => {
      if (!err) {
        console.log(`✅ Subscribed to: ${topic}`)
      } else {
        console.error(`❌ Failed to subscribe to ${topic}:`, err)
      }
    })
  })
  
  console.log('')
  console.log('⏳ Waiting for MQTT messages...')
  console.log('💡 Make sure ESP32 is sending data!')
  console.log('')
})

client.on('message', (topic, message) => {
  try {
    const rawMessage = message.toString()
    console.log('📨' + '='.repeat(70))
    console.log('📨 MQTT MESSAGE RECEIVED!')
    console.log('📨 Topic:', topic)
    console.log('📨 Raw message:', rawMessage)
    
    // Parse JSON
    let data
    try {
      data = JSON.parse(rawMessage)
      console.log('✅ Parsed JSON:', JSON.stringify(data, null, 2))
    } catch (parseError) {
      console.log('⚠️ Not JSON format, raw message:', rawMessage)
      return
    }
    
    // Cari data suhu (prioritas: suhu dari ESP32)
    const suhu = data.suhu !== undefined ? data.suhu : (data.temperature || data.temp)
    const kelembaban = data.kelembaban !== undefined ? data.kelembaban : (data.humidity || data.hum)
    
    if (suhu !== undefined) {
      console.log('')
      console.log('🌡️' + '='.repeat(70))
      console.log('🌡️ SUHU/TEMPERATURE DETECTED!')
      console.log('🌡️ Nilai:', suhu, '°C')
      console.log('🌡️ Type:', typeof suhu)
      console.log('🌡️ Field name:', data.suhu !== undefined ? 'suhu (from ESP32)' : (data.temperature !== undefined ? 'temperature' : 'temp'))
      if (data.suhu !== undefined) {
        console.log('✅ Format ESP32 detected! (suhu field)')
      }
      console.log('🌡️' + '='.repeat(70))
      console.log('')
    }
    
    if (kelembaban !== undefined) {
      console.log('💧' + '='.repeat(70))
      console.log('💧 KELEMBABAN/HUMIDITY DETECTED!')
      console.log('💧 Nilai:', kelembaban, '%')
      console.log('💧 Type:', typeof kelembaban)
      console.log('💧 Field name:', data.kelembaban !== undefined ? 'kelembaban (from ESP32)' : (data.humidity !== undefined ? 'humidity' : 'hum'))
      if (data.kelembaban !== undefined) {
        console.log('✅ Format ESP32 detected! (kelembaban field)')
      }
      console.log('💧' + '='.repeat(70))
      console.log('')
    }
    
    if (suhu === undefined && kelembaban === undefined) {
      console.log('⚠️ No temperature or humidity data found in message')
      console.log('⚠️ Available fields:', Object.keys(data))
    }
    
    console.log('📨' + '='.repeat(70))
    console.log('')
  } catch (error) {
    console.error('❌ Error processing message:', error)
  }
})

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error)
})

client.on('close', () => {
  console.log('🔌 MQTT Disconnected')
})

client.on('reconnect', () => {
  console.log('🔄 MQTT Reconnecting...')
})

// Handle exit
process.on('SIGINT', () => {
  console.log('')
  console.log('👋 Disconnecting from MQTT...')
  client.end()
  process.exit(0)
})

console.log('Press Ctrl+C to exit')
console.log('')

