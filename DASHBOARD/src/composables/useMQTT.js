import { ref } from 'vue'
import mqtt from 'mqtt'

export function useMQTT() {
  const mqttConnected = ref(false)
  const sensorData = ref({
    temperature: 0,
    humidity: 0,
    voltage: 0,
    current: 0,
    power: 0
  })
  const peopleCount = ref(0)
  
  let client = null
  let demoInterval = null
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false' // Default true untuk demo

  const connectMQTT = async () => {
    // Cek apakah MQTT sudah dikonfigurasi
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://your-broker.hivemq.cloud:8884/mqtt'
    const username = import.meta.env.VITE_MQTT_USERNAME || 'your-username'
    const password = import.meta.env.VITE_MQTT_PASSWORD || 'your-password'
    
    // Jika belum dikonfigurasi, langsung jalankan demo mode
    if (brokerUrl.includes('your-broker') || username === 'your-username') {
      if (DEMO_MODE && !demoInterval) {
        console.log('⚠️ MQTT belum dikonfigurasi, menggunakan mode DEMO')
        startDemoMode()
      }
      return
    }
    
    try {

      client = mqtt.connect(brokerUrl, {
        username,
        password,
        clientId: `dashboard_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 5000
      })

      client.on('connect', () => {
        console.log('✅ MQTT Connected')
        mqttConnected.value = true
        
        // Stop demo mode jika MQTT terhubung
        if (demoInterval) {
          clearInterval(demoInterval)
          demoInterval = null
        }
        
        // Subscribe ke semua topik
        client.subscribe('gedung/lantai1/listrik', (err) => {
          if (!err) console.log('📡 Subscribed to: gedung/lantai1/listrik')
        })
        
        client.subscribe('gedung/lantai1/suhu', (err) => {
          if (!err) console.log('📡 Subscribed to: gedung/lantai1/suhu')
        })
        
        client.subscribe('gedung/lantai1/orang', (err) => {
          if (!err) console.log('📡 Subscribed to: gedung/lantai1/orang')
        })
      })

      client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString())
          
          if (topic === 'gedung/lantai1/listrik') {
            sensorData.value.voltage = data.voltage || 0
            sensorData.value.current = data.current || 0
            sensorData.value.power = data.power || (data.voltage * data.current)
          } else if (topic === 'gedung/lantai1/suhu') {
            sensorData.value.temperature = data.temperature || 0
            sensorData.value.humidity = data.humidity || 0
          } else if (topic === 'gedung/lantai1/orang') {
            peopleCount.value = data.count || 0
          }
        } catch (error) {
          console.error('Error parsing MQTT message:', error)
        }
      })

      client.on('error', (error) => {
        console.error('❌ MQTT Error:', error)
        mqttConnected.value = false
      })

      client.on('close', () => {
        console.log('🔌 MQTT Disconnected')
        mqttConnected.value = false
      })

      client.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting...')
      })
      
      // Jika koneksi gagal, jalankan demo mode
      client.on('error', () => {
        if (DEMO_MODE && !demoInterval) {
          startDemoMode()
        }
      })
      
      // Timeout untuk koneksi (3 detik) - jika belum terhubung, jalankan demo
      setTimeout(() => {
        if (!mqttConnected.value && DEMO_MODE && !demoInterval) {
          console.log('⚠️ MQTT tidak terhubung, menggunakan mode DEMO')
          startDemoMode()
        }
      }, 3000)
    } catch (error) {
      console.error('Failed to connect MQTT:', error)
      mqttConnected.value = false
      if (DEMO_MODE && !demoInterval) {
        startDemoMode()
      }
    }
  }

  const startDemoMode = () => {
    if (demoInterval) return // Sudah berjalan
    
    console.log('🎮 Mode DEMO aktif - Data dummy akan ditampilkan')
    
    // Set initial values (langsung update agar terlihat)
    sensorData.value.temperature = 25.5
    sensorData.value.humidity = 65.0
    sensorData.value.voltage = 220.5
    sensorData.value.current = 2.3
    sensorData.value.power = 507.15
    peopleCount.value = 5
    
    // Update data setiap 2 detik dengan variasi
    demoInterval = setInterval(() => {
      // Simulasi data suhu (20-30°C)
      sensorData.value.temperature = parseFloat((20 + Math.random() * 10).toFixed(2))
      
      // Simulasi kelembaban (50-80%)
      sensorData.value.humidity = parseFloat((50 + Math.random() * 30).toFixed(2))
      
      // Simulasi tegangan (210-230V)
      sensorData.value.voltage = parseFloat((210 + Math.random() * 20).toFixed(2))
      
      // Simulasi arus (1.5-3.5A)
      sensorData.value.current = parseFloat((1.5 + Math.random() * 2).toFixed(2))
      
      // Hitung daya
      sensorData.value.power = parseFloat((sensorData.value.voltage * sensorData.value.current).toFixed(2))
      
      // Simulasi jumlah orang (0-15)
      peopleCount.value = Math.floor(Math.random() * 16)
    }, 2000)
  }

  const disconnectMQTT = () => {
    if (client) {
      client.end()
      client = null
      mqttConnected.value = false
    }
    if (demoInterval) {
      clearInterval(demoInterval)
      demoInterval = null
    }
  }

  return {
    mqttConnected,
    sensorData,
    peopleCount,
    connectMQTT,
    disconnectMQTT
  }
}

