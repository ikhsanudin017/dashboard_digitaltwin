// Script untuk test PUBLISH data ke MQTT (simulasi ESP32)
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
  clientId: `test_publisher_${Math.random().toString(16).substr(2, 8)}`,
  clean: true
})

client.on('connect', () => {
  console.log('✅ MQTT Connected Successfully!')
  console.log('')
  console.log('📤 Testing PUBLISH data...')
  console.log('')
  
  // Test publish data DHT11
  const testData = {
    suhu: 27.5,
    kelembaban: 65.0
  }
  
  const topic = 'sensor/dht11/data'
  const message = JSON.stringify(testData)
  
  console.log('📤 Publishing to topic:', topic)
  console.log('📤 Data:', message)
  console.log('')
  
  client.publish(topic, message, { qos: 0 }, (err) => {
    if (err) {
      console.error('❌ Failed to publish:', err)
    } else {
      console.log('✅ Data published successfully!')
      console.log('✅ Topic:', topic)
      console.log('✅ Message:', message)
      console.log('')
      console.log('💡 If you have test-mqtt.js running, you should see the data there!')
      console.log('💡 If you have dashboard open, you should see the data update!')
    }
    
    // Close connection after publish
    setTimeout(() => {
      console.log('')
      console.log('👋 Closing connection...')
      client.end()
      process.exit(0)
    }, 1000)
  })
})

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error)
  process.exit(1)
})

