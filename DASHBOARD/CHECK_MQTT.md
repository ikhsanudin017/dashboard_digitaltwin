# 🔍 Cara Cek MQTT Data

## 1. Test dengan Script (Recommended)

### A. Test Subscribe (Menerima Data)
Buka terminal dan jalankan:
```bash
npm run test-mqtt
```

Script ini akan:
- Connect ke MQTT broker
- Subscribe ke semua topik
- Menampilkan data suhu di terminal setiap kali ada data masuk

**Jika tidak ada data muncul:**
- ESP32 mungkin tidak mengirim data
- Topik yang digunakan ESP32 berbeda
- Koneksi ESP32 ke MQTT bermasalah

### B. Test Publish (Mengirim Data Test)
Buka terminal baru dan jalankan:
```bash
npm run test-publish
```

Script ini akan:
- Connect ke MQTT broker
- Publish data test ke topik `sensor/dht11/data`
- Data: `{"suhu": 27.5, "kelembaban": 65.0}`

**Jika test-publish berhasil:**
- MQTT broker berfungsi dengan baik
- Koneksi dari komputer ke broker OK
- Jika test-mqtt.js sedang berjalan, harusnya data muncul di terminal

## 2. Cek ESP32

### A. Pastikan ESP32 Terhubung ke WiFi
- Cek serial monitor ESP32
- Pastikan ada log "WiFi connected"
- Pastikan IP address muncul

### B. Pastikan ESP32 Terhubung ke MQTT
- Cek serial monitor ESP32
- Pastikan ada log "MQTT connected" atau "Connected to MQTT"
- Pastikan tidak ada error MQTT

### C. Pastikan ESP32 Mengirim Data
- Cek serial monitor ESP32
- Pastikan ada log "Publishing data" atau "Sending data"
- Pastikan data dikirim ke topik yang benar: `sensor/dht11/data`

### D. Cek Format Data ESP32
Pastikan ESP32 mengirim data dalam format JSON:
```json
{"suhu": 27, "kelembaban": 65}
```

Atau:
```json
{"temperature": 27, "humidity": 65}
```

## 3. Cek Topik MQTT

### Topik yang Di-subscribe:
- `sensor/dht11/data` ⭐ (utama)
- `sensor/dht11`
- `sensor/suhu`
- `sensor/temperature`
- `sensor/temp`
- `sensor/data`
- `#` (semua topik)

### Pastikan ESP32 Publish ke Topik yang Benar:
ESP32 harus publish ke salah satu topik di atas, paling baik: `sensor/dht11/data`

## 4. Test dengan MQTT Client Online

Gunakan HiveMQ WebSocket Client untuk test:
1. Buka: https://www.hivemq.com/demos/websocket-client/
2. Connect dengan:
   - Host: `02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud`
   - Port: `8884`
   - Username: `digitaltwin`
   - Password: `Twindigital1`
3. Subscribe ke topik: `sensor/dht11/data`
4. Publish data test ke topik: `sensor/dht11/data`
   - Message: `{"suhu": 27, "kelembaban": 65}`
5. Cek apakah data muncul di subscription

## 5. Debugging Checklist

- [ ] ESP32 terhubung ke WiFi?
- [ ] ESP32 terhubung ke MQTT broker?
- [ ] ESP32 mengirim data secara periodik?
- [ ] Topik yang digunakan ESP32 benar? (`sensor/dht11/data`)
- [ ] Format data JSON benar? (`{"suhu": 27, "kelembaban": 65}`)
- [ ] Kredensial MQTT benar? (username: `digitaltwin`, password: `Twindigital1`)
- [ ] Broker URL benar? (`wss://02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud:8884/mqtt`)
- [ ] Test dengan `npm run test-publish` berhasil?
- [ ] Test dengan `npm run test-mqtt` menerima data?

## 6. Troubleshooting

### Jika test-publish berhasil tapi test-mqtt tidak menerima:
- Cek apakah topik sama
- Cek apakah ada filter di broker
- Cek apakah subscription berhasil

### Jika ESP32 tidak terhubung:
- Cek WiFi credentials
- Cek MQTT credentials
- Cek koneksi internet ESP32
- Cek serial monitor untuk error

### Jika ESP32 terhubung tapi tidak mengirim data:
- Cek kode ESP32, pastikan ada fungsi publish
- Cek interval pengiriman data
- Cek apakah sensor DHT11 terhubung dengan benar
- Cek apakah ada error di serial monitor

