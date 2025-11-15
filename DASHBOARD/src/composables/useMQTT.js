import { ref, nextTick } from 'vue'
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
    // Konfigurasi MQTT HiveMQ Cloud
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud:8884/mqtt'
    const username = import.meta.env.VITE_MQTT_USERNAME || 'digitaltwin'
    const password = import.meta.env.VITE_MQTT_PASSWORD || 'Twindigital1'
    
    // Jika belum dikonfigurasi, langsung jalankan demo mode
    if (brokerUrl.includes('your-broker') || username === 'your-username') {
      if (DEMO_MODE && !demoInterval) {
        console.log('⚠️ MQTT belum dikonfigurasi, menggunakan mode DEMO')
        startDemoMode()
      }
      return
    }
    
    try {

      console.log('🔌 Connecting to MQTT broker...')
      console.log('🔌 Broker URL:', brokerUrl)
      console.log('🔌 Username:', username)
      console.log('🔌 Password:', password ? '***' : 'not set')
      
      client = mqtt.connect(brokerUrl, {
        username,
        password,
        clientId: `dashboard_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 5000,
        keepalive: 60,
        connectTimeout: 10000
      })

      client.on('connect', () => {
        console.log('✅' + '='.repeat(60))
        console.log('✅ MQTT CONNECTED SUCCESSFULLY!')
        console.log('✅ Broker:', brokerUrl)
        console.log('✅ Client ID:', client.options.clientId)
        console.log('✅' + '='.repeat(60))
        mqttConnected.value = true
        
        // Stop demo mode jika MQTT terhubung - PASTIKAN BENAR-BENAR STOP
        if (demoInterval) {
          console.log('🛑 Stopping DEMO mode - MQTT connected')
          clearInterval(demoInterval)
          demoInterval = null
          console.log('✅ DEMO mode stopped')
        }
        
        // Subscribe ke semua topik yang mungkin digunakan
        const topics = [
          'sensor/dht11/data',      // ⭐ Topik utama dari ESP32 DHT11
          'sensor/dht11',            // Alternatif topik DHT11
          'gedung/lantai1/listrik',
          'gedung/lantai1/suhu',
          'gedung/lantai1/orang',
          'sensor/suhu',
          'sensor/temperature',
          'sensor/temp',
          'sensor/data',
          'esp32/sensor',
          'esp32/data',
          'digitaltwin/sensor',
          'digitaltwin/data'
        ]
        
        // Subscribe ke topik spesifik
        topics.forEach(topic => {
          client.subscribe(topic, { qos: 0 }, (err) => {
            if (!err) {
              console.log(`📡 ✅ Subscribed to: ${topic}`)
              if (topic === 'sensor/dht11/data') {
                console.log('⭐ DHT11 topic subscribed successfully!')
              }
            } else {
              console.error(`❌ Failed to subscribe to ${topic}:`, err)
            }
          })
        })
        
        // Subscribe ke wildcard untuk catch-all (untuk debugging)
        client.subscribe('#', { qos: 0 }, (err) => {
          if (!err) {
            console.log('📡 ✅ Subscribed to: # (all topics) - for debugging')
          }
        })
      })

      client.on('message', (topic, message) => {
        try {
          // PASTIKAN DEMO MODE TIDAK BERJALAN saat ada data real
          if (demoInterval) {
            console.log('🛑 Stopping DEMO mode - real MQTT data received!')
            clearInterval(demoInterval)
            demoInterval = null
          }
          
          console.log('📨' + '='.repeat(70))
          console.log('📨 MQTT MESSAGE RECEIVED!')
          console.log('📨 Topic:', topic)
          console.log('📨 Message buffer:', message)
          console.log('📨 Message type:', typeof message)
          
          const rawMessage = message.toString()
          console.log('📨 Raw message (string):', rawMessage)
          console.log('📨 Message length:', rawMessage.length)
          
          // Log khusus untuk DHT11 dengan highlight
          if (topic.includes('dht11') || topic === 'sensor/dht11/data') {
            console.log('⭐' + '='.repeat(50))
            console.log('⭐ DHT11 DATA DETECTED!')
            console.log('⭐ Topic:', topic)
            console.log('⭐ Raw message:', rawMessage)
            console.log('⭐ Message type:', typeof rawMessage)
            console.log('⭐ Message length:', rawMessage.length)
            console.log('⭐' + '='.repeat(50))
          }
          
          let data
          try {
            data = JSON.parse(rawMessage)
            console.log('✅ Parsed JSON data:', data)
            console.log('📊 JSON keys:', Object.keys(data))
            
            // Log khusus untuk DHT11 dengan field suhu/kelembaban
            if (topic.includes('dht11')) {
              console.log('🔍 DHT11 - suhu field:', data.suhu)
              console.log('🔍 DHT11 - kelembaban field:', data.kelembaban)
              console.log('🔍 DHT11 - temperature field:', data.temperature)
              console.log('🔍 DHT11 - humidity field:', data.humidity)
            }
          } catch (parseError) {
            // Jika bukan JSON, coba parse sebagai number atau string
            console.warn('⚠️ Not JSON format, trying to parse as number/string')
            console.warn('⚠️ Parse error:', parseError.message)
            const numValue = parseFloat(rawMessage)
            if (!isNaN(numValue)) {
              // Jika hanya angka, anggap sebagai temperature
              data = { temperature: numValue }
              console.log('✅ Parsed as number (temperature):', numValue)
            } else {
              console.error('❌ Cannot parse message:', rawMessage)
              return
            }
          }
          
          // Auto-detect dan update data sensor
          let dataUpdated = false
          
          // Khusus untuk DHT11: update suhu dan kelembaban sekaligus jika ada
          console.log('🔍 Checking DHT11 condition...')
          console.log('🔍 Topic:', topic)
          console.log('🔍 Topic includes dht11?', topic.includes('dht11'))
          console.log('🔍 Topic includes sensor?', topic.includes('sensor'))
          console.log('🔍 All data keys:', Object.keys(data))
          console.log('🔍 data.suhu exists?', data.suhu !== undefined, '| value:', data.suhu, '| type:', typeof data.suhu)
          console.log('🔍 data.kelembaban exists?', data.kelembaban !== undefined, '| value:', data.kelembaban, '| type:', typeof data.kelembaban)
          console.log('🔍 data.temperature exists?', data.temperature !== undefined, '| value:', data.temperature)
          console.log('🔍 data.humidity exists?', data.humidity !== undefined, '| value:', data.humidity)
          console.log('🔍 Condition (topic dht11 + suhu/kelembaban):', topic.includes('dht11') && (data.suhu !== undefined || data.kelembaban !== undefined))
          console.log('🔍 Condition (topic sensor + suhu/kelembaban):', topic.includes('sensor') && (data.suhu !== undefined || data.kelembaban !== undefined))
          console.log('🔍 Condition (any topic + suhu/kelembaban):', (data.suhu !== undefined || data.kelembaban !== undefined))
          
          // Lebih fleksibel: terima data DHT11 dari topik apapun yang mengandung 'dht11' atau 'sensor', atau jika ada field suhu/kelembaban
          const isDHT11Topic = topic.includes('dht11') || topic.includes('sensor')
          const hasDHT11Data = data.suhu !== undefined || data.kelembaban !== undefined || 
                                (data.temperature !== undefined && data.humidity !== undefined)
          
          console.log('🔍 Final condition - isDHT11Topic:', isDHT11Topic, '| hasDHT11Data:', hasDHT11Data)
          
          if (isDHT11Topic && hasDHT11Data) {
            console.log('⭐' + '='.repeat(60))
            console.log('⭐ PROCESSING DHT11 DATA')
            console.log('⭐ Raw data.suhu:', data.suhu, '| type:', typeof data.suhu)
            console.log('⭐ Raw data.kelembaban:', data.kelembaban, '| type:', typeof data.kelembaban)
            
            const updates = {}
            
            // Process temperature - support multiple field names
            const tempValue = data.suhu !== undefined ? data.suhu : 
                             (data.temperature !== undefined ? data.temperature : 
                             (data.temp !== undefined ? data.temp : undefined))
            
            if (tempValue !== undefined && tempValue !== null) {
              const tempNum = parseFloat(tempValue)
              if (!isNaN(tempNum)) {
                updates.temperature = tempNum
                console.log('🌡️ DHT11 - Temperature parsed from', 
                  data.suhu !== undefined ? 'suhu' : (data.temperature !== undefined ? 'temperature' : 'temp'),
                  ':', tempNum)
              } else {
                console.error('❌ DHT11 - Temperature is NaN:', tempValue)
              }
            } else {
              console.warn('⚠️ DHT11 - Temperature field missing or null')
              console.warn('⚠️   Checked: suhu, temperature, temp')
            }
            
            // Process humidity - support multiple field names
            const humValue = data.kelembaban !== undefined ? data.kelembaban : 
                            (data.humidity !== undefined ? data.humidity : 
                            (data.hum !== undefined ? data.hum : undefined))
            
            if (humValue !== undefined && humValue !== null) {
              const humNum = parseFloat(humValue)
              if (!isNaN(humNum)) {
                updates.humidity = humNum
                console.log('💧 DHT11 - Humidity parsed from',
                  data.kelembaban !== undefined ? 'kelembaban' : (data.humidity !== undefined ? 'humidity' : 'hum'),
                  ':', humNum)
              } else {
                console.error('❌ DHT11 - Humidity is NaN:', humValue)
              }
            } else {
              console.warn('⚠️ DHT11 - Humidity field missing or null')
              console.warn('⚠️   Checked: kelembaban, humidity, hum')
            }
            
            console.log('⭐ Updates object:', updates)
            console.log('⭐ Current sensorData before update:', JSON.stringify(sensorData.value))
            
            if (Object.keys(updates).length > 0) {
              // PASTIKAN DEMO MODE TIDAK BERJALAN
              if (demoInterval) {
                console.log('🛑 Stopping DEMO mode - real data incoming!')
                clearInterval(demoInterval)
                demoInterval = null
              }
              
              // Force update dengan object baru - PASTIKAN SEMUA FIELD ADA
              const currentData = sensorData.value || {}
              const newData = {
                temperature: updates.temperature !== undefined ? updates.temperature : (currentData.temperature ?? 0),
                humidity: updates.humidity !== undefined ? updates.humidity : (currentData.humidity ?? 0),
                voltage: currentData.voltage ?? 0,
                current: currentData.current ?? 0,
                power: currentData.power ?? 0
              }
              
              console.log('⭐ Creating new sensorData object...')
              console.log('⭐ Updates to apply:', updates)
              console.log('⭐ Current data before:', JSON.stringify(currentData))
              console.log('⭐ New data object:', JSON.stringify(newData))
              
              // CRITICAL: Replace entire object untuk trigger reactivity
              console.log('🔄 BEFORE UPDATE - sensorData.value:', JSON.stringify(sensorData.value))
              console.log('🔄 BEFORE UPDATE - sensorData.value reference:', sensorData.value)
              
              // Force new object reference dengan spread operator
              const oldRef = sensorData.value
              sensorData.value = { ...newData }
              
              console.log('🔄 AFTER UPDATE - sensorData.value:', JSON.stringify(sensorData.value))
              console.log('🔄 AFTER UPDATE - sensorData.value reference:', sensorData.value)
              console.log('🔄 Reference changed?', oldRef !== sensorData.value)
              console.log('🔄 sensorData.value.temperature:', sensorData.value.temperature)
              console.log('🔄 sensorData.value.humidity:', sensorData.value.humidity)
              
              dataUpdated = true
              
              // Verify update dengan delay untuk memastikan reactivity
              setTimeout(() => {
                console.log('⏰ DELAYED CHECK - sensorData.value:', JSON.stringify(sensorData.value))
                console.log('⏰ DELAYED CHECK - temperature:', sensorData.value.temperature)
                console.log('⏰ DELAYED CHECK - humidity:', sensorData.value.humidity)
              }, 100)
              
              console.log('⭐ DHT11 data updated successfully!')
              console.log('⭐' + '='.repeat(60))
            } else {
              console.error('❌ DHT11 - No valid updates to apply!')
              console.error('❌ Updates object was empty:', updates)
            }
          }
          
          // Deteksi data suhu/temperature (prioritas tinggi)
          // Support: temperature, temp, suhu (dari ESP32 DHT11)
          const hasTemp = data.temperature !== undefined || data.temp !== undefined || data.suhu !== undefined
          
          if (hasTemp && !topic.includes('dht11')) {
            const temp = data.temperature || data.temp || data.suhu
            console.log('🌡️ Found temperature field!')
            console.log('🌡️   Field name:', data.temperature !== undefined ? 'temperature' : (data.temp !== undefined ? 'temp' : 'suhu'))
            console.log('🌡️   Value:', temp, '| Type:', typeof temp)
            
            // Terima semua nilai termasuk 0 (karena suhu bisa 0 derajat)
            if (temp !== null && temp !== undefined) {
              const tempNum = parseFloat(temp)
              if (!isNaN(tempNum)) {
                // PASTIKAN DEMO MODE TIDAK BERJALAN
                if (demoInterval) {
                  console.log('🛑 Stopping DEMO mode - real data incoming!')
                  clearInterval(demoInterval)
                  demoInterval = null
                }
                
                // Force update dengan membuat object baru untuk trigger reactivity
                const oldTemp = sensorData.value.temperature
                
                // Update dengan Object.assign untuk memastikan reactivity
                // Preserve semua nilai yang sudah ada
                sensorData.value = Object.assign({}, sensorData.value, {
                  temperature: tempNum
                })
                
                dataUpdated = true
                console.log('🌡️ ✅ SUCCESS! Temperature updated:', oldTemp, '→', sensorData.value.temperature, '°C')
                console.log('🌡️ Full sensorData object:', JSON.stringify(sensorData.value))
                if (topic.includes('dht11')) {
                  console.log('⭐ DHT11 temperature data processed successfully!')
                }
              } else {
                console.error('❌ Temperature value is not a valid number:', temp)
              }
            } else {
              console.error('❌ Temperature value is null or undefined')
            }
          } else {
            console.warn('⚠️ No temperature field found!')
            console.warn('⚠️ Available fields in data:', Object.keys(data))
            console.warn('⚠️ Full data object:', JSON.stringify(data))
          }
          
          // Deteksi data kelembaban/humidity
          // Support: humidity, hum, kelembaban (dari ESP32 DHT11)
          const hasHum = data.humidity !== undefined || data.hum !== undefined || data.kelembaban !== undefined
          
          if (hasHum && !topic.includes('dht11')) {
            const hum = data.humidity || data.hum || data.kelembaban
            console.log('💧 Found humidity field!')
            console.log('💧   Field name:', data.humidity !== undefined ? 'humidity' : (data.hum !== undefined ? 'hum' : 'kelembaban'))
            console.log('💧   Value:', hum, '| Type:', typeof hum)
            
            // Terima semua nilai termasuk 0 (karena kelembaban bisa 0%)
            if (hum !== null && hum !== undefined) {
              const humNum = parseFloat(hum)
              if (!isNaN(humNum)) {
              // PASTIKAN DEMO MODE TIDAK BERJALAN
              if (demoInterval) {
                console.log('🛑 Stopping DEMO mode - real data incoming!')
                clearInterval(demoInterval)
                demoInterval = null
              }
              
              // Force update dengan membuat object baru untuk trigger reactivity
              const oldHum = sensorData.value.humidity

              // Update dengan Object.assign untuk memastikan reactivity
              // Preserve semua nilai yang sudah ada
              sensorData.value = Object.assign({}, sensorData.value, {
                humidity: humNum
              })
                
                dataUpdated = true
                console.log('💧 ✅ SUCCESS! Humidity updated:', oldHum, '→', sensorData.value.humidity, '%')
                console.log('💧 Full sensorData object:', JSON.stringify(sensorData.value))
                if (topic.includes('dht11')) {
                  console.log('⭐ DHT11 humidity data processed successfully!')
                }
              } else {
                console.error('❌ Humidity value is not a valid number:', hum)
              }
            } else {
              console.error('❌ Humidity value is null or undefined')
            }
          } else {
            console.warn('⚠️ No humidity field found!')
            console.warn('⚠️ Available fields in data:', Object.keys(data))
          }
          
          // Deteksi data listrik
          if (data.voltage !== undefined || data.tegangan !== undefined) {
            sensorData.value.voltage = parseFloat(data.voltage || data.tegangan || 0)
            dataUpdated = true
          }
          if (data.current !== undefined || data.arus !== undefined) {
            sensorData.value.current = parseFloat(data.current || data.arus || 0)
            dataUpdated = true
          }
          if (data.power !== undefined || data.daya !== undefined) {
            sensorData.value.power = parseFloat(data.power || data.daya || 0)
            dataUpdated = true
          } else if (sensorData.value.voltage && sensorData.value.current) {
            sensorData.value.power = sensorData.value.voltage * sensorData.value.current
          }
          
          // Deteksi data jumlah orang
          if (data.count !== undefined || data.people !== undefined || data.orang !== undefined) {
            peopleCount.value = parseInt(data.count || data.people || data.orang || 0)
            dataUpdated = true
          }
          
          if (dataUpdated) {
            console.log('✅' + '='.repeat(60))
            console.log('✅ REAL-TIME MQTT DATA UPDATED SUCCESSFULLY!')
            console.log('✅ Source: ESP32 via MQTT (NOT DEMO MODE)')
            console.log('✅ Topic:', topic)
            console.log('📊 Current sensor values:', {
              temperature: sensorData.value.temperature,
              humidity: sensorData.value.humidity,
              voltage: sensorData.value.voltage,
              current: sensorData.value.current,
              power: sensorData.value.power,
              peopleCount: peopleCount.value
            })
            console.log('📊 Full sensorData.value object:', JSON.stringify(sensorData.value))
            console.log('✅' + '='.repeat(60))
          } else {
            console.warn('⚠️' + '='.repeat(60))
            console.warn('⚠️ NO DATA WAS UPDATED FROM THIS MESSAGE!')
            console.warn('⚠️ Topic:', topic)
            console.warn('⚠️ Data object:', JSON.stringify(data))
            console.warn('⚠️ Available keys:', Object.keys(data))
            console.warn('⚠️ data.suhu:', data.suhu, '| type:', typeof data.suhu)
            console.warn('⚠️ data.kelembaban:', data.kelembaban, '| type:', typeof data.kelembaban)
            console.warn('⚠️ data.temperature:', data.temperature, '| type:', typeof data.temperature)
            console.warn('⚠️ data.humidity:', data.humidity, '| type:', typeof data.humidity)
            console.warn('⚠️ Topic includes dht11?', topic.includes('dht11'))
            console.warn('⚠️' + '='.repeat(60))
          }
        } catch (error) {
          console.error('❌ Error processing MQTT message:', error)
          console.error('Topic:', topic)
          console.error('Raw message:', message.toString())
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
    // JANGAN JALANKAN DEMO MODE JIKA MQTT SUDAH TERHUBUNG
    if (mqttConnected.value) {
      console.log('⚠️ MQTT sudah terhubung, DEMO MODE DIBATALKAN')
      return
    }
    
    if (demoInterval) {
      console.log('⚠️ Demo mode sudah berjalan, tidak akan start lagi')
      return
    }
    
    console.log('🎮' + '='.repeat(60))
    console.log('🎮 MODE DEMO AKTIF - Data dummy akan ditampilkan')
    console.log('🎮 PERINGATAN: Ini adalah data dummy, bukan data real dari MQTT!')
    console.log('🎮' + '='.repeat(60))
    
    // Set initial values dengan Object.assign untuk reactivity
    sensorData.value = Object.assign({}, sensorData.value, {
      temperature: 25.5,
      humidity: 65.0,
      voltage: 220.5,
      current: 2.3,
      power: 507.15
    })
    peopleCount.value = 5
    
    // Update data setiap 2 detik dengan variasi
    demoInterval = setInterval(() => {
      // PASTIKAN BERHENTI JIKA MQTT SUDAH TERHUBUNG
      if (mqttConnected.value) {
        console.log('🛑' + '='.repeat(60))
        console.log('🛑 STOPPING DEMO MODE - MQTT CONNECTED!')
        console.log('🛑 Data sekarang akan berasal dari MQTT real-time')
        console.log('🛑' + '='.repeat(60))
        clearInterval(demoInterval)
        demoInterval = null
        return
      }
      
      // Simulasi data dengan Object.assign untuk reactivity
      sensorData.value = Object.assign({}, sensorData.value, {
        // Simulasi data suhu (20-30°C)
        temperature: parseFloat((20 + Math.random() * 10).toFixed(2)),
        // Simulasi kelembaban (50-80%)
        humidity: parseFloat((50 + Math.random() * 30).toFixed(2)),
        // Simulasi tegangan (210-230V)
        voltage: parseFloat((210 + Math.random() * 20).toFixed(2)),
        // Simulasi arus (1.5-3.5A)
        current: parseFloat((1.5 + Math.random() * 2).toFixed(2))
      })
      
      // Hitung daya
      sensorData.value = Object.assign({}, sensorData.value, {
        power: parseFloat((sensorData.value.voltage * sensorData.value.current).toFixed(2))
      })
      
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

