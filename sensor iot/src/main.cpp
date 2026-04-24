#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>
#include <mbedtls/base64.h>
#include <time.h>

#ifdef __has_include
#if __has_include("secrets.h")
#include "secrets.h"
#endif
#endif

#ifndef WIFI_SSID
#define WIFI_SSID "CHANGE_ME_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "CHANGE_ME_WIFI_PASSWORD"
#endif

#ifndef IOT_HUB_NAME
#define IOT_HUB_NAME "CHANGE_ME_IOT_HUB_NAME"
#endif

#ifndef IOT_DEVICE_ID
#define IOT_DEVICE_ID "CHANGE_ME_DEVICE_ID"
#endif

#ifndef IOT_DEVICE_KEY
#define IOT_DEVICE_KEY "CHANGE_ME_DEVICE_KEY"
#endif

// ===== AZURE IoT Hub ROOT CERTIFICATE =====
// DigiCert Global Root G2 - Required for Azure IoT Hub TLS
const char* azure_root_ca = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMCcit2BnLWsKjaSi2cEMoH0KVLJ8DP/vACgRqAeq0wDVnQHlPv+l3F5nGL6
ibHn/g9d7VoTvZ/gMZJedj7evkS6fLvNf/R3PG1kLCwLEomJMzBfOKx8TWSPXpLn
dS8ongPpfOPi4/fOHNBwPHAYw/TLKHDip3LyN3t/DAHI+QyH0EQNF7xR9HHQGP23
m0ao57w+czK/tz5WLnSH9wiWD18lPMPdmY+j3PCn93wdYdGU3GcLfoxJZ5Cb5FDk
tvALPBOjks61ihRdDLXgQy/wr+H+Km8RpFVXiJHH/t9DAggndkuYB8RgHny3DnGx
p1U=
-----END CERTIFICATE-----
)EOF";

// ===== KONFIGURASI WiFi =====
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// ===== KONFIGURASI AZURE IoT Hub =====
// Dapatkan nilai-nilai ini dari Azure Portal > IoT Hub > Devices
const char* iotHubName = IOT_HUB_NAME;        // Nama IoT Hub (tanpa .azure-devices.net)
const char* deviceId = IOT_DEVICE_ID;         // Device ID yang terdaftar di IoT Hub
const char* deviceKey = IOT_DEVICE_KEY;       // Primary Key device

// MQTT Configuration untuk Azure IoT Hub
String mqtt_server = String(iotHubName) + ".azure-devices.net";
const int mqtt_port = 8883;  // Port MQTT over TLS (wajib untuk Azure)
String mqtt_username = mqtt_server + "/" + String(deviceId) + "/?api-version=2021-04-12";
// Topic dengan properties: content-type = application/json
String mqtt_topic = "devices/" + String(deviceId) + "/messages/events/$.ct=application%2Fjson&$.ce=utf-8";

// ===== KONFIGURASI DHT11 =====
#define DHTPIN 4     // Pin data DHT11 terhubung ke GPIO 4
#define DHTTYPE DHT11     // Tipe sensor DHT11

// ===== SENSOR TEGANGAN ZMPT101B =====
// Pin: GPIO 35 (ADC1_CH7) - Kompatibel dengan WiFi
// Kalibrasi: 220V PLN Indonesia
#define ZMPT101B_PIN 35
#define ADC_BITS 12
#define ADC_COUNTS 4096       // 2^12 = 4096
#define VREF 3.3              // Tegangan referensi ESP32
#define VOLTAGE_CALIBRATION 579.0  // Faktor kalibrasi (220V / 0.38V RMS)
#define RMS_THRESHOLD 0.25    // Threshold minimum RMS (filter noise)
#define VOLTAGE_THRESHOLD 150.0  // Minimum tegangan valid

// ===== SENSOR ARUS SCT013-000 (100A/50mA) =====
// Pin: GPIO 32 (ADC1_CH4) - Kompatibel dengan WiFi
// Rangkaian: Merah->Resistor 1kΩ->GPIO32, Hitam->GND (tanpa bias)
#define SCT013_PIN 32
#define BURDEN_RESISTOR 1000.0    // 1kΩ burden resistor
#define CURRENT_CALIBRATION 300.0 // Faktor kalibrasi untuk burden 1kΩ
#define CURRENT_RMS_THRESHOLD 0.01  // Threshold minimum RMS arus
#define CURRENT_THRESHOLD_MIN 0.1   // Arus minimum (0.1A = ~22W)
#define DISABLE_CURRENT_SENSOR false

// Inisialisasi objek
DHT dht(DHTPIN, DHTTYPE);
WiFiClientSecure espClient;  // Gunakan WiFiClientSecure untuk TLS
PubSubClient client(espClient);

// Variabel untuk SAS Token
String sasToken = "";
unsigned long sasTokenExpiry = 0;

// Variabel untuk timing
unsigned long lastMsg = 0;
const long interval = 5000; // Kirim data setiap 5 detik
const unsigned long SAS_TOKEN_REFRESH_WINDOW = 120; // Refresh 2 menit sebelum expiry

// Counter untuk statistik
unsigned long successCount = 0;
unsigned long failCount = 0;

String getIsoTimestampUTC() {
  time_t now = time(nullptr);
  struct tm timeInfo;

  if (!gmtime_r(&now, &timeInfo)) {
    return "";
  }

  char buffer[32];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  return String(buffer);
}

void ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("\n⚠️ WiFi terputus, mencoba konek ulang...");
  WiFi.disconnect(true, true);
  delay(250);
  setupWiFi();
}

// Struktur untuk hasil pembacaan tegangan
struct VoltageReading {
  float voltage;      // Tegangan terukur (V)
  float rms;          // Nilai RMS mentah
  int adcRaw;         // Nilai ADC mentah
  bool isConnected;   // Status koneksi sensor
};

// Struktur untuk hasil pembacaan arus
struct CurrentReading {
  float current;      // Arus terukur (A)
  float rms;          // Nilai RMS mentah (V)
  int adcRaw;         // Nilai ADC mentah
  bool isConnected;   // Status koneksi sensor
  float power;        // Daya (W) = Tegangan × Arus
};

// Fungsi untuk membaca tegangan AC (RMS) dengan validasi
VoltageReading readACVoltage() {
  VoltageReading result;
  
  // Ambil banyak sampel untuk menangkap gelombang AC
  // PLN Indonesia: 50Hz = 20ms per cycle, sample 2000 untuk ~10 cycle (akurasi lebih baik)
  int numSamples = 2000;
  float sumSquares = 0;
  long sumADC = 0;
  
  for (int i = 0; i < numSamples; i++) {
    // Baca nilai ADC
    int adcValue = analogRead(ZMPT101B_PIN);
    sumADC += adcValue;
    
    // Konversi ADC ke tegangan (0-3.3V)
    float voltage = (adcValue * VREF) / ADC_COUNTS;
    
    // Kurangi offset DC (karena sensor output sekitar 1.65V untuk 0V AC)
    float voltageAC = voltage - (VREF / 2.0);
    
    // Kuadratkan nilai untuk perhitungan RMS
    sumSquares += (voltageAC * voltageAC);
    
    delayMicroseconds(200);  // Delay kecil untuk sampling (5kHz sampling rate)
  }
  
  // Hitung nilai RMS (Root Mean Square)
  float rms = sqrt(sumSquares / numSamples);
  
  // Hitung rata-rata ADC
  int avgADC = sumADC / numSamples;
  
  // Kalibrasi ke tegangan AC sebenarnya (220V)
  float actualVoltage = rms * VOLTAGE_CALIBRATION;
  
  // Validasi: Periksa apakah RMS cukup besar (bukan noise)
  // Dan tegangan hasil kalibrasi melewati threshold
  result.rms = rms;
  result.adcRaw = avgADC;
  
  if (rms > RMS_THRESHOLD && actualVoltage > VOLTAGE_THRESHOLD) {
    result.voltage = actualVoltage;
    result.isConnected = true;
  } else {
    // Jika di bawah threshold, anggap tidak ada sinyal (noise)
    result.voltage = 0.0;
    result.isConnected = false;
  }
  
  return result;
}

// Fungsi untuk membaca arus AC (RMS) dari SCT013-000
// Rangkaian sederhana: Merah->Resistor 62Ω->GPIO32, Hitam->GND (tanpa bias voltage)
CurrentReading readACCurrent() {
  CurrentReading result;
  
  // Ambil banyak sampel untuk menangkap gelombang AC
  // Dengan rangkaian tanpa bias, ADC hanya baca sisi positif (half-wave rectified)
  int numSamples = 2000;
  float sumSquares = 0;
  long sumADC = 0;
  int maxADC = 0;
  
  for (int i = 0; i < numSamples; i++) {
    // Baca nilai ADC
    int adcValue = analogRead(SCT013_PIN);
    sumADC += adcValue;
    if (adcValue > maxADC) maxADC = adcValue;
    
    // Konversi ADC ke tegangan (0-3.3V)
    float voltage = (adcValue * VREF) / ADC_COUNTS;
    
    // Untuk rangkaian tanpa bias, tidak perlu kurangi offset DC
    // ADC sudah baca dari 0V (ground reference)
    
    // Kuadratkan nilai untuk perhitungan RMS
    sumSquares += (voltage * voltage);
    
    delayMicroseconds(200);  // Delay kecil untuk sampling (5kHz sampling rate)
  }
  
  // Hitung nilai RMS (Root Mean Square) dalam volt
  float rmsVoltage = sqrt(sumSquares / numSamples);
  
  // Hitung rata-rata ADC
  int avgADC = sumADC / numSamples;
  
  // Konversi RMS voltage ke RMS current
  // I_rms = V_rms / R_burden
  // Kemudian scale berdasarkan ratio SCT013: 100A primary / 0.05A secondary = 2000:1
  float rmsCurrent = (rmsVoltage / BURDEN_RESISTOR) * CURRENT_CALIBRATION;
  
  // Simpan hasil
  result.rms = rmsVoltage;
  result.adcRaw = avgADC;
  
  // Validasi: Periksa kondisi sensor
  // ADC saturasi (>4090) menandakan sensor tidak terhubung dengan benar atau floating
  // RMS > 3.0V juga menandakan ADC saturasi (noise karena pin floating)
  if (avgADC > 4090 || rmsVoltage > 3.0) {
    // ADC saturasi = pin floating / tidak terhubung
    result.current = 0.0;
    result.isConnected = false;
  } else if (rmsVoltage > CURRENT_RMS_THRESHOLD && rmsCurrent > CURRENT_THRESHOLD_MIN) {
    result.current = rmsCurrent;
    result.isConnected = true;
  } else {
    // Jika di bawah threshold, anggap tidak ada arus (noise atau no-load)
    result.current = 0.0;
    result.isConnected = false;
  }
  
  result.power = 0.0;  // Akan dihitung di loop() dengan data tegangan
  
  return result;
}

// Fungsi untuk koneksi WiFi
void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi terhubung!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// Fungsi untuk generate SAS Token untuk Azure IoT Hub
String generateSasToken(const char* key, String url, long expiry) {
  // URL encode
  url.toLowerCase();
  String stringToSign = url + "\n" + String(expiry);
  
  // Decode Base64 key menggunakan mbedtls
  size_t keyLength = strlen(key);
  size_t decodedKeyLength = 0;
  unsigned char decodedKey[64];
  
  mbedtls_base64_decode(decodedKey, sizeof(decodedKey), &decodedKeyLength, 
                        (const unsigned char*)key, keyLength);
  
  // HMAC-SHA256
  unsigned char hmacResult[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
  mbedtls_md_hmac_starts(&ctx, decodedKey, decodedKeyLength);
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)stringToSign.c_str(), stringToSign.length());
  mbedtls_md_hmac_finish(&ctx, hmacResult);
  mbedtls_md_free(&ctx);
  
  // Encode result to Base64 menggunakan mbedtls
  unsigned char encodedSignature[64];
  size_t encodedLength = 0;
  mbedtls_base64_encode(encodedSignature, sizeof(encodedSignature), &encodedLength, 
                        hmacResult, 32);
  
  String signature = String((char*)encodedSignature);
  
  // URL encode signature
  signature.replace("+", "%2B");
  signature.replace("=", "%3D");
  signature.replace("/", "%2F");
  
  // Create SAS token
  String sasToken = "SharedAccessSignature sr=" + url + "&sig=" + signature + "&se=" + String(expiry);
  
  return sasToken;
}

// Fungsi untuk koneksi ulang ke Azure IoT Hub
void reconnectMQTT() {
  ensureWiFiConnected();

  while (!client.connected()) {
    Serial.println("\nMenghubungkan ke Azure IoT Hub...");
    Serial.print("Hub: ");
    Serial.println(mqtt_server);
    Serial.print("Device ID: ");
    Serial.println(deviceId);
    
    // Test DNS resolution
    IPAddress ip;
    Serial.print("📡 Resolving DNS... ");
    if (WiFi.hostByName(mqtt_server.c_str(), ip)) {
      Serial.print("OK! IP: ");
      Serial.println(ip);
    } else {
      Serial.println("GAGAL! DNS tidak bisa di-resolve");
      Serial.println("  Coba lagi dalam 5 detik...");
      delay(5000);
      continue;
    }
    
    // Test TCP connection ke port 8883
    Serial.print("🔌 Testing TCP port 8883... ");
    WiFiClient testClient;
    if (testClient.connect(mqtt_server.c_str(), 8883)) {
      Serial.println("OK! Port terbuka");
      testClient.stop();
    } else {
      Serial.println("GAGAL! Port 8883 diblokir atau timeout");
      Serial.println("  Kemungkinan firewall/router memblokir koneksi IoT");
      Serial.println("  Coba lagi dalam 5 detik...");
      delay(5000);
      continue;
    }
    
    // Generate SAS Token jika expired atau belum ada
    unsigned long currentTime = time(nullptr);
    if (sasToken == "" || currentTime >= (sasTokenExpiry - SAS_TOKEN_REFRESH_WINDOW)) {
      Serial.println("Generating new SAS Token...");
      sasTokenExpiry = currentTime + 3600; // Token valid untuk 1 jam
      String resourceUri = mqtt_server + "/devices/" + String(deviceId);
      sasToken = generateSasToken(deviceKey, resourceUri, sasTokenExpiry);
      Serial.println("✓ SAS Token generated");
    }
    
    // Koneksi dengan SAS Token
    if (client.connect(deviceId, mqtt_username.c_str(), sasToken.c_str())) {
      Serial.println("✓ Terhubung ke Azure IoT Hub!");
    } else {
      Serial.print("✗ Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" | Periksa konfigurasi IoT Hub");
      Serial.println("  Error codes:");
      Serial.println("  -4: Connection timeout");
      Serial.println("  -3: Connection lost");
      Serial.println("  -2: Connect failed");
      Serial.println("   5: Connection refused (bad credentials)");
      Serial.println("\n  Coba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

void setup() {
  // Inisialisasi komunikasi serial
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n===========================================");
  Serial.println("ESP32 Digital Twin - Monitoring Sensor");
  Serial.println("DHT11 + ZMPT101B + SCT013-000");
  Serial.println("Tegangan AC 220V + Arus AC 100A");
  Serial.println("===========================================");
  
  Serial.println("⚠️  KESELAMATAN: Pastikan sensor terpasang dengan benar!");
  Serial.println("   ZMPT101B:");
  Serial.println("   - Input: Fase & Netral dari stopkontak 220V");
  Serial.println("   - Output: VCC, GND, OUT ke ESP32 GPIO35");
  Serial.println("   SCT013-000:");
  Serial.println("   - Clamp pada kabel FASE beban yang aktif");
  Serial.println("   - Kabel MERAH: Resistor 62Ω -> ESP32 GPIO32");
  Serial.println("   - Kabel HITAM: ESP32 GND");
  Serial.println("   - JANGAN hubungkan 220V langsung ke ESP32!\n");
  
  // Inisialisasi sensor DHT
  dht.begin();
  
  // Inisialisasi ADC untuk sensor tegangan
  analogReadResolution(ADC_BITS);  // Set resolusi ADC 12-bit
  analogSetAttenuation(ADC_11db);  // Set atenuasi untuk range 0-3.3V
  
  // Koneksi WiFi
  setupWiFi();
  
  // Sinkronisasi waktu dengan NTP (diperlukan untuk SAS Token)
  Serial.println("\n⏰ Sinkronisasi waktu dengan NTP...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  time_t now = time(nullptr);
  int retry = 0;
  while (now < 8 * 3600 * 2 && retry < 15) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    retry++;
  }
  if (now < 8 * 3600 * 2) {
    Serial.println("\n✗ Gagal sinkronisasi waktu!");
    Serial.println("  Restart ESP32 atau periksa koneksi internet");
  } else {
    Serial.println("\n✓ Waktu tersinkronisasi");
    Serial.print("  Current time: ");
    Serial.println(ctime(&now));
  }
  
  // Konfigurasi TLS dengan Root CA Certificate Azure IoT Hub
  Serial.println("🔐 Mengkonfigurasi TLS dengan Azure Root CA...");
  espClient.setCACert(azure_root_ca);
  espClient.setTimeout(30);    // TLS timeout 30 detik (untuk slow networks)
  espClient.setHandshakeTimeout(30); // TLS handshake timeout
  
  // Konfigurasi MQTT dengan buffer size lebih besar untuk Azure IoT Hub
  client.setServer(mqtt_server.c_str(), mqtt_port);
  client.setBufferSize(1024);  // Buffer lebih besar untuk JSON + overhead
  client.setKeepAlive(60);     // Keep alive 60 detik (lebih responsif)
  client.setSocketTimeout(60); // Socket timeout 60 detik (lebih toleran)
  
  Serial.println("\n📡 Konfigurasi Azure IoT Hub selesai");
  Serial.print("   IoT Hub: ");
  Serial.println(mqtt_server);
  Serial.print("   Port: ");
  Serial.println(mqtt_port);
  Serial.print("   Device ID: ");
  Serial.println(deviceId);
  
  Serial.println("\n🔧 STATUS KALIBRASI:");
  Serial.println("   TEGANGAN (ZMPT101B):");
  Serial.println("   ✓ Sudah dikalibrasi untuk PLN 220V Indonesia");
  Serial.println("   ✓ Faktor kalibrasi: 680 (220V / 0.32V RMS)");
  Serial.println("   ARUS (SCT013-000):");
  Serial.println("   ✓ Burden resistor: 62 ohm (rangkaian sederhana tanpa bias)");
  Serial.println("   ✓ Ratio: 2000:1 (100A primary / 50mA secondary)");
  Serial.println("   ✓ Threshold: 0.05V RMS (~0.8A minimum)\n");
  Serial.println("   📌 CARA KALIBRASI ARUS:");
  Serial.println("   1. Jepit SCT013 pada kabel FASE beban (misal: lampu 100W)");
  Serial.println("   2. Nyalakan beban dan catat 'RMS mentah (I)' dari Serial Monitor");
  Serial.println("   3. Hitung arus sebenarnya: I = P/V (100W/220V = 0.45A)");
  Serial.println("   4. Jika tidak akurat, sesuaikan: BURDEN_RESISTOR = (RMS_mentah × 2000) / Arus_sebenarnya");
  Serial.println("   5. Contoh: RMS=0.014V, Arus=0.45A -> R = (0.014×2000)/0.45 = 62Ω\n");
  
  // Koneksi awal ke MQTT
  reconnectMQTT();
  
  delay(100);
}

void loop() {
  ensureWiFiConnected();

  unsigned long currentEpoch = time(nullptr);
  if (sasToken != "" && currentEpoch > 0 && currentEpoch >= (sasTokenExpiry - SAS_TOKEN_REFRESH_WINDOW)) {
    Serial.println("\n⏳ SAS Token hampir expired, refresh koneksi MQTT...");
    client.disconnect();
    sasToken = "";
  }

  // Maintain koneksi MQTT - panggil loop() sesering mungkin
  client.loop();
  
  // Cek koneksi hanya jika terputus
  if (!client.connected()) {
    Serial.println("\n⚠️ Koneksi MQTT terputus, reconnecting...");
    reconnectMQTT();
  }
  
  // Panggil client.loop() lagi untuk process incoming messages
  client.loop();
  
  unsigned long now = millis();
  
  // Kirim data setiap interval waktu
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Baca sensor DHT11 dengan retry
    float kelembaban = NAN;
    float suhuCelsius = NAN;
    float suhuFahrenheit = NAN;
    
    // Retry hingga 3x jika gagal baca
    for (int retry = 0; retry < 3; retry++) {
      kelembaban = dht.readHumidity();
      suhuCelsius = dht.readTemperature();
      suhuFahrenheit = dht.readTemperature(true);
      
      if (!isnan(kelembaban) && !isnan(suhuCelsius)) {
        break;  // Berhasil baca, keluar dari loop
      }
      delay(500);  // Tunggu 500ms sebelum retry
    }
    
    // Cek apakah pembacaan gagal setelah retry
    if (isnan(kelembaban) || isnan(suhuCelsius) || isnan(suhuFahrenheit)) {
      Serial.println("⚠️ Gagal membaca DHT11! Cek:");
      Serial.println("   1. Kabel DATA di GPIO 4");
      Serial.println("   2. VCC ke 3.3V atau 5V");
      Serial.println("   3. GND ke GND");
      Serial.println("   4. Pull-up resistor 10kΩ (DATA-VCC)");
      Serial.print("   Pin DHT: GPIO ");
      Serial.println(DHTPIN);
      return;
    }
    
    // Hitung heat index
    float heatIndexC = dht.computeHeatIndex(suhuCelsius, kelembaban, false);
    
    // Baca tegangan AC dengan validasi
    VoltageReading voltageData = readACVoltage();
    
    // Baca arus AC dengan validasi
    CurrentReading currentData;
    if (DISABLE_CURRENT_SENSOR) {
      // Sensor arus di-disable, set nilai default
      currentData.current = 0.0;
      currentData.rms = 0.0;
      currentData.adcRaw = 0;
      currentData.isConnected = false;
      currentData.power = 0.0;
    } else {
      currentData = readACCurrent();
    }
    
    // Hitung daya (Power) jika kedua sensor terhubung
    float power = 0.0;
    if (voltageData.isConnected && currentData.isConnected) {
      power = voltageData.voltage * currentData.current;  // P = V × I (apparent power)
      currentData.power = power;
    }
    
    // Tampilkan ke Serial Monitor
    Serial.println("=================================");
    Serial.print("Kelembaban: ");
    Serial.print(kelembaban);
    Serial.println(" %");
    
    Serial.print("Suhu: ");
    Serial.print(suhuCelsius);
    Serial.println(" °C");
    
    Serial.print("Heat Index: ");
    Serial.print(heatIndexC);
    Serial.println(" °C");
    
    Serial.print("Tegangan AC (RMS): ");
    Serial.print(voltageData.voltage);
    Serial.print(" V | Status: ");
    Serial.println(voltageData.isConnected ? "Terhubung" : "Tidak terhubung (noise)");
    
    Serial.print("RMS mentah (V): ");
    Serial.print(voltageData.rms, 4);
    Serial.print(" V | ADC Raw Avg: ");
    Serial.println(voltageData.adcRaw);
    
    Serial.print("Arus AC (RMS): ");
    Serial.print(currentData.current, 2);
    Serial.print(" A | Status: ");
    Serial.println(currentData.isConnected ? "Terhubung" : "Tidak terhubung (noise)");
    
    Serial.print("RMS mentah (I): ");
    Serial.print(currentData.rms, 4);
    Serial.print(" V | ADC Raw Avg: ");
    Serial.println(currentData.adcRaw);
    
    Serial.print("Daya (Power): ");
    Serial.print(power, 1);
    Serial.println(" W");
    
    // Buat JSON document
     JsonDocument doc;
     doc["suhu"] = round(suhuCelsius * 10) / 10.0;  // 1 desimal
     doc["kelembaban"] = round(kelembaban * 10) / 10.0;  // 1 desimal
     doc["tegangan"] = round(voltageData.voltage * 10) / 10.0;  // 1 desimal
     doc["arus"] = round(currentData.current * 100) / 100.0;  // 2 desimal
     doc["daya"] = round(power * 10) / 10.0;  // 1 desimal
     doc["status_tegangan"] = voltageData.isConnected ? "terhubung" : "tidak_terhubung";
     doc["status_arus"] = currentData.isConnected ? "terhubung" : "tidak_terhubung";
     doc["deviceId"] = deviceId;
     doc["timestamp"] = getIsoTimestampUTC();
    
    // Serialize JSON ke string
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    
    // Tampilkan JSON yang akan dikirim
    Serial.print("JSON: ");
    Serial.println(jsonBuffer);
    
    // Pastikan koneksi masih aktif sebelum publish
    if (!client.connected()) {
      Serial.println("⚠️ Koneksi terputus, reconnecting sebelum kirim...");
      reconnectMQTT();
    }
    
    // Publish data ke Azure IoT Hub
    if (client.publish(mqtt_topic.c_str(), jsonBuffer, false)) {
      successCount++;
      Serial.print("✓ Data terkirim! (Total sukses: ");
      Serial.print(successCount);
      Serial.print(", Gagal: ");
      Serial.print(failCount);
      Serial.println(")");
      
      // Maintain connection setelah publish - panggil loop() beberapa kali
      for (int i = 0; i < 10; i++) {
        client.loop();
        delay(50);
      }
     } else {
       failCount++;
       Serial.println("✗ Gagal mengirim data ke Azure IoT Hub");
       Serial.print("   MQTT State: ");
       Serial.println(client.state());
       Serial.println("   Memaksa reconnect untuk percobaan berikutnya...");
       client.disconnect();
       sasToken = "";
     }
    
    Serial.println("=================================");
  }
  
  // Maintain MQTT connection saat idle
  client.loop();
  delay(100);
}
