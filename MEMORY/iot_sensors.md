# IoT Sensors & Devices

## Daftar Perangkat

### 1. ESP32 Energy Monitor
**Device ID**: `ESP32_ENERGY_MONITOR_001`
**Lokasi**: Ruangan utama
**Firmware**: `sensor iot/src/main.cpp`
**Build System**: PlatformIO (`sensor iot/platformio.ini`)

#### Sensor yang Dipasang
| Sensor | Model | Pin GPIO | Range | Output |
|--------|-------|----------|-------|--------|
| Suhu & Kelembaban | DHT11 | GPIO 14 | 0-50°C, 20-90%RH | Digital |
| Tegangan AC | ZMPT101B | GPIO 35 (ADC1_CH7) | 0-250V AC | Analog (0-3.3V) |
| Arus AC | SCT013-000 (100A/50mA) | GPIO 32 (ADC1_CH4) | 0-100A | Analog via burden resistor |
| IR Receiver | KY-022 (VS1838B) | GPIO 27 | — | Digital (active LOW) |
| IR Transmitter | DIY LED + NPN Transistor | GPIO 4 | — | Digital PWM |

#### Payload JSON (via MQTT ke Azure IoT Hub)
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
  "timestamp": "2026-01-10T10:30:00Z",
  "heat_index": 29.8,
  "closed_loop_enabled": true,
  "target_temp": 24.0,
  "target_source": "ml",
  "control_temp": 29.8,
  "control_band": "cooling",
  "fan_humidity_gate": 70.0,
  "ac_power": "on",
  "ac_mode": "cool",
  "ac_fan": "auto",
  "ac_setpoint": 24,
  "ac_last_reason": "auto_feels_hot_cooling",
  "ac_pending_command": false
}
```

#### Interval Pengiriman
- **Telemetry**: setiap 5000ms (5 detik)
- **MQTT keep-alive**: 60 detik

#### Kalibrasi
- **Tegangan**: faktor `VOLTAGE_CALIBRATION = 153.0`, target 220V PLN Indonesia
- **Arus**: faktor `CURRENT_CALIBRATION = 300.0`, burden resistor 1000Ω
- **ADC**: 12-bit (4096 counts), atenuasi 11dB (0-3.3V range)

---

### 2. Raspberry Pi Camera (People Counter)
**Device ID**: `RASPBERRY_PI_CAMERA_001`
**Lokasi**: Ruangan utama (webcam)
**Software**: `sensor iot/raspberry-pi/people_counter_yolo.py`

#### Hardware
| Komponen | Spesifikasi |
|---------|-------------|
| Kamera | USB Webcam (1280×720 HD) |
| Model AI | YOLOv3-tiny |
| Face Detection | Haar Cascade |
| Single Board Computer | Raspberry Pi 3/4/5 |

#### Detection Parameters
| Parameter | Nilai |
|-----------|-------|
| Confidence threshold | 40% |
| NMS threshold | 0.4 |
| Input size (YOLO) | 416×416 |
| Skip frames | 2 |
| Min face size | 50px |
| Min person height | 100px |
| Publish interval | 5 detik |

#### Payload JSON (via MQTT ke Azure IoT Hub)
```json
{
  "jumlahOrang": 3,
  "deviceId": "RASPBERRY_PI_CAMERA_001",
  "sensorType": "camera_people_counter",
  "location": "Ruang Utama",
  "timestamp": "2026-01-10T10:30:00Z"
}
```

---

## Format Data Sensor

### DHT11
```
Temperature: float (°C), 1 decimal
Humidity: float (%), 1 decimal
Heat Index: computed via dht.computeHeatIndex()
Retry: up to 3x per reading cycle
```

### ZMPT101B (Voltage Sensor)
```
Method: RMS calculation dari ADC samples
Samples: 2000 per reading (200µs interval, ~5kHz sampling rate)
RMS formula: sqrt(variance dari samples)
Calibration: rms * VOLTAGE_CALIBRATION (153.0)
Validation: RMS > 0.25V AND voltage 150-300V
```

### SCT013-000 (Current Sensor)
```
Method: RMS calculation dari ADC samples (tanpa bias voltage)
Samples: 2000 per reading (200µs interval)
RMS formula: sqrt(sum(squared_voltage) / count) / BURDEN_RESISTOR * CALIBRATION
Saturation check: ADC raw avg > 4090 atau RMS > 3.0V → sensor not connected
Validation: RMS > 0.01V AND current > 0.1A
Power: voltage * current (apparent power in VA)
```

---

## Protokol Komunikasi

### ESP32 → Azure IoT Hub
```
Protocol: MQTT over TLS
Port: 8883
Auth: SAS Token (HMAC-SHA256, base64 encoded via mbedtls)
Topic (publish): devices/{deviceId}/messages/events/$.ct=application%2Fjson&$.ce=utf-8
Topic (subscribe): devices/{deviceId}/messages/devicebound/#
QoS: 0 (at-most-once)
Keep-alive: 60s
Buffer size: 1024 bytes
```

### ESP32 ← Azure IoT Hub (C2D)
```
Format: JSON message
Fields supported:
  - closed_loop_enabled: bool
  - target_temp / recommended_temp / predicted_temp / recommendedTemp: float
  - clear_ml_target: bool
  - power: bool
  - mode: string (cool/fan/dry/heat/auto)
  - fan: string (auto/min/med/max)
  - setpoint_temp / setpoint: uint8
  - apply_now: bool
```

### Raspberry Pi → Azure IoT Hub
```
Protocol: MQTT over TLS (via paho or azure-iot-device)
Auth: SAS Token (via environment variables IOT_DEVICE_KEY)
Device ID: RASPBERRY_PI_CAMERA_001
Fallback: HTTP POST ke MqttToIoTHub Azure Function
```

### Raspberry Pi Local HTTP Server
```
Framework: Flask + Waitress
Port: 5000 (default)
Endpoints:
  - GET /video_feed → multipart/x-mixed-replace (MJPEG stream)
  - GET /count → {"count": int, "timestamp": string}
  - GET /status → detection status
  - GET /snapshot → current frame as image
CORS: enabled for all origins
```

---

## Cara Data Sensor Diproses & Disimpan

### ESP32 Telemetry Pipeline
```
ESP32 sensor read (DHT11 + ZMPT101B + SCT013)
  → generate JSON payload with UTC ISO timestamp
  → generate SAS token (if expired)
  → MQTT publish to Azure IoT Hub
  → Azure Function IoTHubToStorage (event hub trigger)
  → Store to Azure Table Storage: SensorTelemetry
  → Frontend polls GetTelemetryData API (5s interval)
  → useMQTT updates reactive sensorData ref
  → Vue components re-render with new data
```

### Raspberry Pi People Count Pipeline
```
Webcam frame
  → YOLO detection (person class)
  → Haar Cascade face detection
  → Combine detections, deduplicate
  → Update count
  → MQTT publish to Azure IoT Hub
  → IoTHubToStorage → PeopleCount table
  → AND: Flask /count endpoint polled by CameraStream.vue
  → CameraStream.vue calls SavePeopleCount API
  → Frontend polls GetTelemetryData/people (5s interval)
```

### Data Storage Location
- **Azure Table Storage** (production): `stordigitaltwin2026` account
  - Table `SensorTelemetry`
  - Table `PeopleCount`
- **localStorage** (frontend): cache untuk offline resilience
  - Key `sensor_last_data` — latest reading
  - Key `digitaltwin_historical_data` — historical data array (max 10000 points)
  - Key `digitaltwin_energy_management` — energy settings & data
- **NVS/Preferences** (ESP32 flash): raw IR profiles for AC control
- **File system** (ML): model artifacts di `ml_models/models/*.pkl`

---

## Konfigurasi Koneksi

### ESP32 → Azure IoT Hub
Konfigurasi ada di `sensor iot/include/secrets.h`:
```cpp
#define WIFI_SSID "..."
#define WIFI_PASSWORD "..."
#define IOT_HUB_NAME "iothub-digitaltwin-2026"
#define IOT_DEVICE_ID "ESP32_ENERGY_MONITOR_001"
#define IOT_DEVICE_KEY "..."
```

### Raspberry Pi → Azure IoT Hub
Environment variables:
```bash
IOT_HUB_NAME="iothub-digitaltwin-2026"
IOT_DEVICE_ID="RASPBERRY_PI_CAMERA_001"
IOT_DEVICE_KEY="..."
```

### Frontend → Azure Functions
Environment variables di `view_virtual/.env`:
```env
VITE_AZURE_FUNCTION_URL=https://func-digitaltwin-2026.azurewebsites.net/api
VITE_AZURE_FUNCTION_WRITE_KEY=...
```

### ML API → Local
```env
VITE_ML_API_URL=http://localhost:5000/api
```
