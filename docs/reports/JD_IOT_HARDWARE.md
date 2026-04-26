# Jobdesk: IoT / Hardware (Embedded Systems)

**Penanggung Jawab:** IoT / Embedded Engineer
**Jobdesk Code:** IOT-01

---

## 1. Overview

Tim IoT/Hardware bertanggung jawab untuk semua firmware embedded, sensor integration, device-to-cloud communication, dan closed-loop control yang berjalan di edge devices (ESP32 dan Raspberry Pi).

### Tools & Stack

| Tool | Fungsi |
|------|--------|
| PlatformIO | Build system ESP32 |
| Arduino framework | ESP32 firmware |
| C++ (Arduino) | Firmware language |
| mbedtls | HMAC-SHA256 for SAS token |
| PubSubClient | MQTT client for ESP32 |
| IRremoteESP8266 | IR transmit/receive |
| Python 3 | Raspberry Pi software |
| paho-mqtt | MQTT client for Raspberry Pi |
| YOLOv3-tiny | People detection model |
| Flask + Waitress | HTTP server (Raspberry Pi) |

---

## 2. Yang Sudah Ada (Fungsional)

### 2.1 ESP32 Firmware

**File:** `sensor iot/src/main.cpp` (2051 lines)
**Build target:** PlatformIO `esp32dev`

#### Hardware Configuration

| Sensor | Model | GPIO Pin | Fungsi |
|--------|-------|----------|--------|
| DHT11 | Temperature/Humidity | GPIO 14 | Suhu & kelembaban ruangan |
| ZMPT101B | Voltage sensor | GPIO 35 (ADC1_CH7) | Tegangan AC 220V |
| SCT013-000 | Current clamp 100A/50mA | GPIO 32 (ADC1_CH4) | Arus AC |
| KY-022 | IR Receiver (VS1838B) | GPIO 27 | Capture AC remote codes |
| IR LED + NPN Transistor | IR Transmitter | GPIO 4 | Kirim AC command |

#### Calibration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `VOLTAGE_CALIBRATION` | 153.0 | Target 220V PLN Indonesia |
| `CURRENT_CALIBRATION` | 300.0 | Burden resistor 1000Ω |
| `RMS_THRESHOLD` | 0.25V | Minimum voltage detection |
| `CURRENT_THRESHOLD_MIN` | 0.1A | Minimum current measurement |
| `ADC_RESOLUTION` | 12-bit (4096) | ADC resolution |

#### Features yang Sudah Ada

- [x] MQTT over TLS ke Azure IoT Hub (port 8883)
- [x] SAS token generation (HMAC-SHA256 via mbedtls)
- [x] NTP sync untuk timestamp UTC
- [x] IR capture dari AC remote (KY-022)
- [x] IR transmit via LED + transistor NPN
- [x] Raw IR profile storage di NVS/Preferences
- [x] Closed-loop AC control (heat-index, hysteresis)
- [x] Cloud C2D command support (`target_temp`, `power`, `mode`, `fan`, `setpoint`)
- [x] Serial CLI dengan 30+ commands
- [x] Auto WiFi reconnect
- [x] Flash persistence untuk IR profiles
- [x] Multiple AC model support (Gree YBOFB, YAW1F, YX1FSF)

#### Telemetry Payload (MQTT → Azure IoT Hub)

```json
{
  "suhu": 27.5,
  "kelembaban": 65.0,
  "tegangan": 220.0,
  "arus": 0.45,
  "daya": 99.0,
  "status_tegangan": "terhubung",
  "status_arus": "terhubung",
  "deviceId": "ESP32_ENERGY_MONITOR_001",
  "timestamp": "2026-04-26T10:30:00Z",
  "heat_index": 29.8,
  "closed_loop_enabled": true,
  "target_temp": 24.0,
  "target_source": "ml",
  "control_band": "cooling",
  "ac_power": "on",
  "ac_mode": "cool",
  "ac_setpoint": 24
}
```

### 2.2 Raspberry Pi Camera (People Counter)

**File:** `sensor iot/raspberry-pi/people_counter_yolo.py` (802 lines)
**Model:** YOLOv3-tiny + Haar Cascade face detection

#### Hardware

| Component | Specification |
|-----------|---------------|
| Camera | USB Webcam 1280×720 HD |
| AI Model | YOLOv3-tiny (person detection) |
| Face Detection | Haar Cascade |
| SBC | Raspberry Pi 3/4/5 |
| Publish Interval | 5 detik |

#### Detection Parameters

| Parameter | Value |
|-----------|-------|
| Confidence threshold | 40% |
| NMS threshold | 0.4 |
| YOLO input size | 416×416 |
| Skip frames | 2 |
| Min face size | 50px |
| Min person height | 100px |

#### Flask Server Endpoints

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/video_feed` | GET | MJPEG stream (multipart/x-mixed-replace) |
| `/count` | GET | Current people count JSON |
| `/status` | GET | Detection status |
| `/snapshot` | GET | Current frame as image |

---

## 3. Yang Perlu Ditambahkan (Gap Analysis)

### 3.1 Multi-Actuator Control — PRIORITY TINGGI

**Masalah:** Hanya AC yang bisa dikontrol. Tidak ada kontrol untuk lampu, blind, atau fan tambahan.

**Fitur yang dibutuhkan:**

| Actuator | Method | Control Signal |
|----------|--------|----------------|
| AC (existing) | IR LED | IR code transmission |
| Lights | Relay / Smart plug | On/Off via GPIO |
| Blinds/Motor | Servo / Relay | Open/Close angle |
| Exhaust Fan | Relay | On/Off |
| HVAC Damper | Servo | 0-100% opening |

**File baru:**

```cpp
// sensor iot/src/actuators.h
class LightActuator {
  int pin;
  bool state;
public:
  void on();
  void off();
  void toggle();
};

class ServoActuator {
  int pin;
  int angle; // 0-180
public:
  void setAngle(int degrees);
  void open();
  void close();
};
```

**Modifikasi `main.cpp`:**

```cpp
// Tambahkan actuator definitions
#define LIGHT_PIN 16
#define BLIND_SERVO_PIN 17

// Command parsing untuk multi-actuator
void handleMultiActuatorCommand(JsonObject doc) {
  if (doc.containsKey("light")) setLight(doc["light"]);
  if (doc.containsKey("blind")) setBlind(doc["blind"]);
}
```

### 3.2 Occupancy Feedback Loop — PRIORITY TINGGI

**Masalah:** ESP32 closed-loop control tidak menerima occupancy data. People count hanya di camera, tidak pernah sampai ke ESP32.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **ESP32 → Fetch People Count** | ESP32 poll Azure Function `/telemetry/people` |
| **Occupancy-Aware Control** | AC target temp adjust berdasarkan jumlah orang |
| **People Threshold** | Jika > 10 orang, boost cooling capacity |
| **Away Mode** | Jika 0 orang > 30 menit, raise temp ke 28°C |

**Modifikasi `main.cpp`:**

```cpp
// Tambahkan fetchPeopleCount dari Azure
void fetchOccupancyFromCloud() {
  HTTPClient http;
  http.begin(azureFunctionUrl + "/telemetry/people?limit=1");
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    // Parse JSON, update occupancy variable
  }
  http.end();
}

// Integrasi ke closed-loop
void applyClosedLoopControl() {
  // ...
  if (occupancy > 10) {
    // Boost cooling: lower target by 1°C
    effectiveTarget = targetTemp - 1.0;
  }
  // ...
}
```

### 3.3 Device Provisioning Service (DPS) — PRIORITY SEDANG

**Masalah:** Semua device credentials di-hardcode di `include/secrets.h`. Menambah device baru butuh flash manual.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Azure IoT Hub DPS** | Automatic device provisioning |
| **X.509 Certificate Auth** | Device authentication via certificate |
| **Group Enrollment** | Provision multiple devices at once |
| **TPM Provisioning** | Optional: TPM-based secure provisioning |

### 3.4 ESP32 OTA Firmware Update — PRIORITY SEDANG

**Masalah:** Firmware update butuh physical access ke ESP32 via USB/serial.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **OTA via WiFi** | Download firmware dari Azure Blob Storage |
| **Firmware Version Check** | Periodic check untuk new version |
| **Rollback Capability** | Revert ke previous firmware jika update fail |
| **Delta Updates** | Efficient update via delta compression |

**File baru:**

```cpp
// sensor iot/src/ota_update.h
class OTAUpdater {
  const char* firmware_url;
  const char* current_version;

public:
  void checkForUpdate();
  void downloadAndUpdate();
  void rollback();
};
```

### 3.5 Edge ML Inference — PRIORITY SEDANG

**Masalah:** Semua ML inference dilakukan di cloud. Tidak ada local inference di ESP32.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **MicroML/TFLite Micro** | Lightweight ML inference di ESP32 |
| **Local AC Recommendation** | Rule-based recommendation langsung di ESP32 |
| **Anomaly Detection** | Detect sensor anomalies locally |
| **Power Optimization** | Local prediction untuk optimize AC operation |

**Implementation path:**

1. Train compact model (decision tree atau rule-based)
2. Convert ke C header array
3. Embed di ESP32 flash
4. Call local inference di `applyClosedLoopControl()`

### 3.6 Safety Limits & Override — PRIORITY SEDANG

**Masalah:** Tidak ada explicit safety bounds. AC bisa running terlalu lama atau temp terlalu rendah.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Min OFF Time** | 3 menit minimum antara AC on cycles |
| **Max ON Time** | 8 jam max, auto turn off |
| **Temp Cutout** | Turn off AC jika temp < 18°C |
| **Manual Override Detection** | Deteksi jika user pakai remote manual |
| **Safety Reset** | Reset safety flags setelah override |

---

## 4. Technical Details

### 4.1 ESP32 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      ESP32 SYSTEM                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   SENSORS   │  │  NETWORK    │  │    CONTROL      │   │
│  │  DHT11      │  │  WiFi       │  │  Closed-Loop    │   │
│  │  ZMPT101B   │  │  MQTT       │  │  Heat-Index    │   │
│  │  SCT013     │  │  NTP        │  │  Hysteresis   │   │
│  │  IR Recv    │  │  HTTP       │  │  IR Transmit  │   │
│  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘   │
│         │                │                  │           │
│         └────────────────┼──────────────────┘           │
│                          ▼                              │
│              ┌──────────────────────┐                 │
│              │   TELEMETRY BUFFER    │                 │
│              │  JSON payload 5s cycle  │                 │
│              └──────────┬─────────────┘                 │
│                         │                                │
│         ┌───────────────┼───────────────┐               │
│         ▼               ▼               ▼               │
│  ┌────────────┐  ┌───────────┐  ┌────────────┐        │
│  │  MQTT Pub   │  │  C2D Recv │  │   NVS      │        │
│  │  → IoT Hub  │  │ ← Commands│  │  Storage   │        │
│  └────────────┘  └───────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Closed-Loop State Machine

```
┌───────────┐    heat_index > hot_threshold     ┌─────────────────┐
│  startup  │ ────────────────────────────────▶ │ start_cooling   │
└───────────┘                                   └────────┬────────┘
                                                        │
┌───────────┐    target reached               ┌────────┴────────┐
│  standby  │ ◀─────────────────────────────────│   fan_maintain  │
└───────────┘                                     └─────────────────┘
       │
       │ heat_index > hot_threshold
       ▼
┌─────────────────────────────────────────────────────────┐
│                      cooling                             │
│  hysteresis: turn_on at +2°C above target, turn_off at -1°C│
└─────────────────────────────────────────────────────────┘
       │
       │ ac_power = false (C2D or manual override)
       ▼
┌───────────┐
│   hold    │
└───────────┘
```

### 4.3 File yang Perlu Dibuat (New Files)

```
sensor iot/
├── src/
│   ├── actuators.h           # Multi-actuator abstraction
│   ├── actuators.cpp         # Actuator implementations
│   ├── occupancy_fetch.h    # Fetch people count dari cloud
│   ├── occupancy_fetch.cpp  # HTTP client untuk occupancy
│   ├── safety_limits.h      # Safety override logic
│   ├── safety_limits.cpp    # Safety state machine
│   ├── ota_update.h         # OTA firmware update
│   └── ota_update.cpp       # OTA implementation
├── src/ml/
│   ├── local_model.h        # Embedded ML model (C header)
│   └── local_recommendation.cpp  # Local inference
└── include/
    └── dps_secrets.h.example  # DPS credential template
```

### 4.4 File yang Perlu Dimodifikasi

| File | Perubahan |
|------|-----------|
| `main.cpp` | Add occupancy fetch, multi-actuator, safety limits |
| `platformio.ini` | Add OTA partition scheme, library dependencies |
| `include/secrets.h` | Keep as gitignored; add DPS placeholder |

### 4.5 PlatformIO Configuration (OTA)

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

# OTA Support
upload_protocol = espota
upload_port = 192.168.1.100

# Partition scheme untuk OTA
board_build.partitions = default.csv

# OTA configuration
build_flags =
  -DWIFI_SSID=\"${WIFI_SSID}\"
  -DWIFI_PASSWORD=\"${WIFI_PASSWORD}\"
  -DFIRMWARE_VERSION=\"${CI_COMMIT_SHA:0:7}\"
```

### 4.6 Dependencies dengan Jobdesk Lain

| Jobdesk | Dependency | Notes |
|---------|-----------|-------|
| **Cloud Engine** | C2D command dari `/command/send` | Cloud function perlu dibuat |
| **Cloud Engine** | Occupancy dari `/telemetry/people` | HTTP fetch dari ESP32 |
| **Cloud Engine** | DPS provisioning | Cloud DPS perlu di-setup |
| **ML Engine** | Local ML model | C header model dari Python training |
| **Website** | Command status feedback | C2D acknowledgment needed |

---

## 5. Serial CLI Commands

### 5.1 Existing Commands

| Command | Fungsi | Contoh |
|---------|--------|--------|
| `status` | Show all sensor values | `status` |
| `ir-capture` | Capture AC remote code | `ir-capture YBOFB 3` |
| `ir-send` | Send IR code | `ir-send YBOFB power` |
| `ir-list` | List stored IR profiles | `ir-list` |
| `ir-test` | Test IR transmission | `ir-test YBOFB` |
| `cl-enable` | Enable closed-loop | `cl-enable` |
| `cl-disable` | Disable closed-loop | `cl-disable` |
| `cl-target` | Set target temp | `cl-target 24` |
| `cl-status` | Show closed-loop state | `cl-status` |
| `mqtt-status` | Show MQTT connection | `mqtt-status` |
| `wifi-status` | Show WiFi status | `wifi-status` |
| `reboot` | Reboot ESP32 | `reboot` |

### 5.2 New Commands (Planned)

| Command | Fungsi | Contoh |
|---------|--------|--------|
| `occupancy` | Fetch current occupancy | `occupancy` |
| `occupancy-poll` | Start polling occupancy | `occupancy-poll 30` |
| `light on/off` | Control light | `light on` |
| `blind 0-180` | Set blind angle | `blind 90` |
| `ota check` | Check for firmware update | `ota check` |
| `ota update` | Start OTA update | `ota update` |
| `safety-reset` | Reset safety flags | `safety-reset` |

---

## 6. Timeline Suggestion

| Fase | Durasi | Fitur |
|------|--------|-------|
| **Phase 1** | 1-2 minggu | Occupancy fetch + feedback loop |
| **Phase 2** | 1-2 minggu | Multi-actuator support (light, blind, fan) |
| **Phase 3** | 1 minggu | Safety limits & manual override detection |
| **Phase 4** | 2 minggu | OTA firmware update |
| **Phase 5** | 1-2 minggu | DPS provisioning untuk multi-device |
| **Phase 6** | 2-3 minggu | Edge ML inference (local AC recommendation) |

---

## 7. Testing & Validation

### 7.1 ESP32 Testing

| Test | Method | Expected Result |
|------|--------|-----------------|
| MQTT connect | Serial + Azure Portal | Device appears in IoT Hub |
| Telemetry | Serial monitor | JSON payload every 5s |
| C2D command | Azure Portal → Send C2D | ESP32 receives, AC responds |
| IR capture | Serial → `ir-capture` | Code stored in NVS |
| IR send | Serial → `ir-send` | AC responds |
| Closed-loop | Serial → `cl-enable` | AC auto-on when hot |
| Occupancy fetch | Serial → `occupancy` | People count from cloud |

### 7.2 Raspberry Pi Testing

| Test | Method | Expected Result |
|------|--------|-----------------|
| YOLO detection | Run script | People count in terminal |
| Flask endpoints | curl /count, /status | JSON response |
| MQTT publish | Check IoT Hub | Device appears in portal |
| MJPEG stream | Browser → IP:5000/video_feed | Live video stream |

---

## 8. Verification Checklist

- [ ] ESP32 connect ke WiFi, sync NTP
- [ ] ESP32 publish telemetry ke Azure IoT Hub (verify di Azure Portal)
- [ ] ESP32 receive C2D command dari cloud (target_temp, power, mode)
- [ ] IR capture berfungsi (capture Gree remote, send, AC merespond)
- [ ] Closed-loop active: AC on saat heat_index > threshold
- [ ] Occupancy fetch: ESP32 fetch people count dari Azure Function
- [ ] Safety limits: AC turn off saat temp < 18°C
- [ ] OTA: ESP32 download dan flash new firmware
- [ ] Raspberry Pi camera detect people, publish ke IoT Hub
- [ ] Raspberry Pi Flask server serve MJPEG stream

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Device credentials in flash** | `secrets.h` gitignored, encrypted flash optional |
| **MQTT TLS** | Already using TLS (port 8883) |
| **SAS token expiry** | Refresh 120s before expiry — already implemented |
| **OTA security** | HTTPS download, signature verification |
| **IR signal security** | Only works in same room — physical security OK |

---

## 10. Notes

- ESP32 flash memory cukup untuk basic OTA (4MB minimum, 8MB recommended)
- IR codes untuk Gree AC sudah di-capture dan disimpan di NVS
- Closed-loop sudah berfungsi dengan baik — test thorough sebelum add features
- Occupancy fetch perlu dibuat hati-hati: jangan spam HTTP request, cukup 1x per polling cycle

**Next Action:** Mulai dari Phase 1 — tambahkan `occupancy_fetch.h/cpp` untuk fetch people count dari Azure Function.