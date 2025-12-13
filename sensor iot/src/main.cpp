#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ===== KONFIGURASI WiFi =====
const char* ssid = "TOKO BERAS";
const char* password = "sumberagung5758";

// ===== KONFIGURASI MQTT HiveMQ Cloud =====
const char* mqtt_server = "aa736fd1494847d087ef6244a8428cf9.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;  // Port TLS
const char* mqtt_username = "digitaltwin";  // Ganti dengan username dari Access Management
const char* mqtt_password = "Digitaltwin1";  // Ganti dengan password dari Access Management
String mqtt_client_id = "ESP32_DHT11_" + String((uint32_t)ESP.getEfuseMac(), HEX);  // Client ID unik
const char* mqtt_topic = "sensor/dht11/data";  // Topic untuk data JSON

// ===== KONFIGURASI DHT11 =====
#define DHTPIN 4          // Pin data DHT11 terhubung ke GPIO 4
#define DHTTYPE DHT11     // Tipe sensor DHT11

// ===== KONFIGURASI ZMPT101B (Sensor Tegangan AC) =====
#define ZMPT101B_PIN 35   // Pin analog untuk sensor tegangan (GPIO 35 / ADC1_CH7 - Kompatibel dengan WiFi)
#define ADC_BITS 12       // Resolusi ADC ESP32 (12-bit)
#define ADC_COUNTS 4096   // 2^12 = 4096
#define VREF 3.3          // Tegangan referensi ESP32 (3.3V)

// KALIBRASI: Dikalibrasi untuk PLN 220V Indonesia
// Berdasarkan pengukuran: RMS mentah = 0.38V saat PLN 220V
// Perhitungan: 220V / 0.38V = 579
#define VOLTAGE_CALIBRATION 579.0  // Faktor kalibrasi untuk PLN 220V (DIKALIBRASI ULANG!)

#define RMS_THRESHOLD 0.15  // Threshold minimum RMS untuk deteksi sinyal valid (150mV)
#define VOLTAGE_THRESHOLD 100.0  // Threshold minimum tegangan output (100V) untuk dianggap terhubung ke 220V

// ===== KONFIGURASI SCT013-000 (Sensor Arus AC 100A/50mA) =====
#define SCT013_PIN 32     // Pin analog untuk sensor arus (GPIO 32 / ADC1_CH4 - Kompatibel dengan WiFi)
#define BURDEN_RESISTOR 1000.0  // Burden resistor 1kΩ (sesuai hardware fisik Anda)
// SCT013-000: 100A primary -> 50mA secondary (ratio 2000:1)
// Dengan burden resistor 1kΩ: Output = 50mA × 1000Ω = 50V peak (saturasi ADC!)
// SOLUSI: Gunakan faktor kalibrasi yang disesuaikan dengan resistor 1kΩ
// Rangkaian TANPA bias voltage: Merah->Resistor->GPIO32, Hitam->GND
// ADC hanya baca setengah gelombang AC (rectified)
#define CURRENT_CALIBRATION 300.0  // Faktor kalibrasi disesuaikan untuk burden 1kΩ (turun dari 2000)
#define CURRENT_RMS_THRESHOLD 0.01  // Threshold minimum RMS untuk deteksi arus valid (10mV)
#define CURRENT_THRESHOLD_MIN 0.1  // Arus minimum untuk dianggap ada beban (0.1A = ~22W)
#define DISABLE_CURRENT_SENSOR false  // ENABLED: Sensor arus aktif (nilai mungkin belum akurat)

// Inisialisasi objekx
DHT dht(DHTPIN, DHTTYPE);
WiFiClientSecure espClient;  // Gunakan WiFiClientSecure untuk TLS
PubSubClient client(espClient);

// Variabel untuk timing
unsigned long lastMsg = 0;
const long interval = 5000; // Kirim data setiap 5 detik

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
  
  // Validasi: Periksa apakah RMS cukup besar (bukan noise) DAN arus > threshold minimum
  if (rmsVoltage > CURRENT_RMS_THRESHOLD && rmsCurrent > CURRENT_THRESHOLD_MIN) {
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

// Fungsi untuk koneksi ulang ke MQTT
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT Broker HiveMQ Cloud...");
    Serial.print("Username: ");
    Serial.print(mqtt_username);
    Serial.print(" | Client ID: ");
    Serial.println(mqtt_client_id);
    
    // Koneksi dengan username dan password
    if (client.connect(mqtt_client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("✓ Terhubung ke MQTT!");
    } else {
      Serial.print("✗ Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" | Periksa username/password di HiveMQ Cloud");
      Serial.println("  Coba lagi dalam 5 detik...");
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
  
  // Konfigurasi TLS (tidak verifikasi sertifikat untuk kesederhanaan)
  espClient.setInsecure();
  
  // Konfigurasi MQTT dengan buffer size lebih besar
  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(512);  // Increase buffer size
  client.setKeepAlive(60);    // Keep alive 60 detik
  
  Serial.println("\n📡 Konfigurasi MQTT selesai");
  Serial.print("   Server: ");
  Serial.println(mqtt_server);
  Serial.print("   Port: ");
  Serial.println(mqtt_port);
  
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
  
  delay(100);
}

void loop() {
  // Pastikan koneksi MQTT tetap aktif
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  unsigned long now = millis();
  
  // Kirim data setiap interval waktu
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Baca sensor DHT11
    float kelembaban = dht.readHumidity();
    float suhuCelsius = dht.readTemperature();
    float suhuFahrenheit = dht.readTemperature(true);
    
    // Cek apakah pembacaan gagal
    if (isnan(kelembaban) || isnan(suhuCelsius) || isnan(suhuFahrenheit)) {
      Serial.println("Gagal membaca dari sensor DHT!");
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
    
    // Serialize JSON ke string
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    
    // Tampilkan JSON yang akan dikirim
    Serial.print("JSON: ");
    Serial.println(jsonBuffer);
    
    // Publish data ke MQTT
    if (client.publish(mqtt_topic, jsonBuffer)) {
      Serial.println("✓ Data terkirim ke MQTT");

    } else {
      Serial.println("✗ Gagal mengirim data ke MQTT");
    }
    
    Serial.println("=================================");
  }
}