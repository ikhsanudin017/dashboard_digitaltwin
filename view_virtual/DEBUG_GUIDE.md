# 🔍 Panduan Debugging MQTT & ESP32

## Cara Cek Data dari ESP32

### 1. Buka Browser Console (F12)

1. Buka dashboard di browser
2. Tekan **F12** atau klik kanan → **Inspect** → **Console**
3. Console akan menampilkan semua log dan error

### 2. Cek Koneksi MQTT

Di console, cari log berikut:

✅ **Jika MQTT terhubung:**
```
✅ MQTT Connected
📡 Subscribed to: gedung/lantai1/listrik
📡 Subscribed to: gedung/lantai1/suhu
📡 Subscribed to: sensor/suhu
...
```

❌ **Jika MQTT tidak terhubung:**
```
❌ MQTT Error: ...
⚠️ MQTT tidak terhubung, menggunakan mode DEMO
```

### 3. Cek Data yang Diterima

Ketika ESP32 mengirim data, Anda akan melihat log seperti ini:

```
📨 Received from topic "sensor/suhu": {"temperature":25.5,"humidity":65.0}
✅ Parsed JSON data: {temperature: 25.5, humidity: 65.0}
🌡️ Updated temperature: 25.5
💧 Updated humidity: 65.0
✅ Sensor data updated: {temperature: 25.5, humidity: 65.0, ...}
```

### 4. Format Data yang Didukung

Dashboard mendukung berbagai format field name:

**Format 1 (Recommended):**
```json
{"temperature": 25.5, "humidity": 65.0}
```

**Format 2:**
```json
{"temp": 25.5, "hum": 65.0}
```

**Format 3 (Bahasa Indonesia):**
```json
{"suhu": 25.5, "kelembaban": 65.0}
```

### 5. Topik yang Didukung

Dashboard otomatis subscribe ke topik berikut:
- `sensor/dht11/data` ⭐ **Topik dari ESP32 DHT11 Anda**
- `sensor/dht11`
- `gedung/lantai1/suhu`
- `sensor/suhu`
- `sensor/temperature`
- `sensor/temp`
- `esp32/sensor`
- `digitaltwin/sensor`
- `#` (semua topik)

**Catatan:** ESP32 Anda menggunakan topik `sensor/dht11/data` dengan format:
```json
{"suhu": 25.5, "kelembaban": 65.0}
```

### 6. Troubleshooting

#### ❌ Tidak ada log "📨 Received from topic"
**Kemungkinan:**
- ESP32 belum publish data
- Topik yang digunakan ESP32 tidak sesuai
- ESP32 belum terhubung ke MQTT

**Solusi:**
- Pastikan ESP32 sudah terhubung ke MQTT broker yang sama
- Cek topik yang digunakan ESP32 di kode Arduino/ESP32
- Pastikan ESP32 publish ke salah satu topik yang di-subscribe

#### ❌ Ada log tapi format error
**Kemungkinan:**
- Data bukan format JSON
- Format JSON tidak valid

**Solusi:**
- Pastikan ESP32 mengirim data dalam format JSON yang valid
- Contoh format yang benar: `{"temperature": 25.5}`
- Contoh format yang salah: `temperature: 25.5` atau `25.5`

#### ❌ Suhu online tapi kelembaban offline
**Kemungkinan:**
- ESP32 tidak mengirim data kelembaban
- Field name berbeda

**Solusi:**
- Cek log di console, lihat data apa yang diterima
- Pastikan ESP32 mengirim field `humidity`, `hum`, atau `kelembaban`
- Jika field name berbeda, tambahkan ke kode atau ubah di ESP32

### 7. Contoh Kode ESP32 yang Benar

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

#define DHT_PIN 4
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Connect to WiFi
  WiFi.begin("SSID", "PASSWORD");
  
  // Connect to MQTT
  client.setServer("02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud", 8883);
  client.connect("ESP32_Client", "digitaltwin", "Twindigital1");
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  // Format JSON yang benar
  String json = "{\"temperature\":" + String(temp) + ",\"humidity\":" + String(hum) + "}";
  
  // Publish ke topik
  client.publish("sensor/suhu", json.c_str());
  
  delay(5000); // Kirim setiap 5 detik
}
```

### 8. Test Manual dengan MQTT Client

Anda bisa test menggunakan MQTT client seperti:
- **MQTT.fx** (Desktop)
- **MQTT Explorer** (Desktop)
- **MQTT Client** (Mobile)

Publish test message:
- **Topic:** `sensor/suhu`
- **Message:** `{"temperature": 25.5, "humidity": 65.0}`

Jika dashboard menerima, berarti koneksi MQTT berfungsi.

### 9. Filter Console Log

Di browser console, Anda bisa filter log:
- Ketik `MQTT` untuk melihat log MQTT saja
- Ketik `Received` untuk melihat data yang diterima
- Ketik `Updated` untuk melihat data yang ter-update

### 10. Screenshot untuk Debug

Jika masih ada masalah, screenshot:
1. Console log (F12)
2. Kode ESP32 yang mengirim data
3. Topik yang digunakan ESP32

Dengan informasi ini, saya bisa membantu troubleshoot lebih lanjut!

