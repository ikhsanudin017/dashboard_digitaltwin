# 📋 Konfigurasi ESP32 untuk MQTT

## ✅ Format Data yang Benar

ESP32 Anda sudah menggunakan format yang benar:
```cpp
JsonDocument doc;
doc["suhu"] = round(suhuCelsius * 10) / 10.0;  // 1 desimal
doc["kelembaban"] = round(kelembaban * 10) / 10.0;  // 1 desimal

char jsonBuffer[128];
serializeJson(doc, jsonBuffer);
```

Format JSON yang dihasilkan: `{"suhu":27.5,"kelembaban":65.0}`

## 🔧 Yang Perlu Dicek di ESP32

### 1. Pastikan Topik MQTT Benar
```cpp
const char* mqtt_topic = "sensor/dht11/data";  // ⭐ HARUS INI!
```

**JANGAN:**
- `sensor/dht11` (tanpa /data)
- `dht11/data` (tanpa sensor/)
- Topik lain

### 2. Pastikan MQTT Broker Benar
```cpp
const char* mqtt_server = "02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud";
const int mqtt_port = 8884;  // Port untuk WSS
const char* mqtt_username = "digitaltwin";
const char* mqtt_password = "Twindigital1";
```

### 3. Pastikan Menggunakan WSS (WebSocket Secure)
```cpp
WiFiClientSecure espClient;
PubSubClient client(espClient);
espClient.setInsecure();  // Untuk development, atau set CA certificate
```

Atau jika menggunakan library yang support WSS langsung:
```cpp
const char* mqtt_broker = "wss://02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud:8884/mqtt";
```

### 4. Pastikan Interval Pengiriman Data
```cpp
unsigned long lastMsg = 0;
const unsigned long interval = 5000;  // Kirim data setiap 5 detik

void loop() {
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    // Kirim data
  }
}
```

## 🐛 Debugging ESP32

### Cek Serial Monitor
Pastikan ada log seperti ini:
```
WiFi connected
IP address: 192.168.x.x
Connecting to MQTT...
MQTT connected!
JSON: {"suhu":27.5,"kelembaban":65.0}
✓ Data terkirim ke MQTT
=================================
```

### Jika Tidak Ada Log "✓ Data terkirim ke MQTT"
- Cek apakah `client.publish()` return true
- Cek apakah MQTT client connected
- Cek apakah topik benar
- Cek apakah JSON buffer cukup besar (128 bytes)

### Jika Ada Log "✗ Gagal mengirim data ke MQTT"
- Cek koneksi MQTT (apakah masih connected?)
- Cek apakah broker menerima koneksi
- Cek credentials MQTT
- Cek apakah ada error di Serial Monitor

## 📝 Contoh Kode ESP32 Lengkap

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT credentials
const char* mqtt_server = "02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud";
const int mqtt_port = 8884;
const char* mqtt_username = "digitaltwin";
const char* mqtt_password = "Twindigital1";
const char* mqtt_topic = "sensor/dht11/data";  // ⭐ PENTING!

// DHT sensor
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Connect MQTT
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  while (!client.connected()) {
    if (client.connect("ESP32Client", mqtt_username, mqtt_password)) {
      Serial.println("MQTT connected");
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void loop() {
  client.loop();
  
  static unsigned long lastMsg = 0;
  unsigned long now = millis();
  
  if (now - lastMsg > 5000) {  // Kirim setiap 5 detik
    lastMsg = now;
    
    float suhuCelsius = dht.readTemperature();
    float kelembaban = dht.readHumidity();
    
    if (isnan(suhuCelsius) || isnan(kelembaban)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    
    // Buat JSON document
    JsonDocument doc;
    doc["suhu"] = round(suhuCelsius * 10) / 10.0;
    doc["kelembaban"] = round(kelembaban * 10) / 10.0;
    
    // Serialize JSON ke string
    char jsonBuffer[128];
    serializeJson(doc, jsonBuffer);
    
    // Tampilkan JSON yang akan dikirim
    Serial.print("JSON: ");
    Serial.println(jsonBuffer);
    Serial.print("Topic: ");
    Serial.println(mqtt_topic);
    
    // Publish data ke MQTT
    if (client.publish(mqtt_topic, jsonBuffer)) {
      Serial.println("✓ Data terkirim ke MQTT");
    } else {
      Serial.println("✗ Gagal mengirim data ke MQTT");
      Serial.print("MQTT state: ");
      Serial.println(client.state());
    }
    
    Serial.println("=================================");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming messages if needed
}
```

## ✅ Checklist

- [ ] Topik: `sensor/dht11/data` (bukan yang lain)
- [ ] Format JSON: `{"suhu":27.5,"kelembaban":65.0}`
- [ ] MQTT broker: `02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud`
- [ ] Port: `8884` (WSS)
- [ ] Username: `digitaltwin`
- [ ] Password: `Twindigital1`
- [ ] Serial Monitor menampilkan "✓ Data terkirim ke MQTT"
- [ ] Data dikirim setiap beberapa detik (5-10 detik)

