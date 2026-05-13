# Digital Twin - Task Report

**Date:** 2026-05-08/09
**Status:** In Progress

---

## ✅ COMPLETED TASKS

### 1. Raspberry Pi Setup
| Item | Status | Details |
|------|--------|---------|
| SSH Connection | ✅ | `ssh digitaltwin@192.168.1.7` |
| WiFi | ✅ | SSID: `Umi 123`, Password: `tanyaumi` |
| Flash Drive | ✅ | 7.5GB, Mounted at `/mnt/storage` |
| Auto-mount | ✅ | Via fstab + udev rules |

### 2. Services Auto-Run
| Service | Status | Port |
|---------|--------|------|
| yolo_cam | ✅ | 5000 |
| local_api | ✅ | 5001 |
| iot_hub_forwarder | ✅ (replaced) | - |
| influxdb | ✅ | 8086 |
| influxdb-logger | ✅ | - |
| ml-pipeline | ✅ NEW | - |

### 3. ESP32 Firmware Update
- WiFi SSID: `Umi 123`
- RPi Gateway URL: `http://192.168.1.7:5001/api/collect`
- Uploaded via PlatformIO

### 4. Camera System (RPi)
- YOLO Camera: `http://192.168.1.7:5000/`
- People count endpoint: `/count`
- Uses `yolo_cam_dashboard.py` from local repo

### 5. InfluxDB Setup
| Item | Value |
|------|-------|
| URL | `http://192.168.1.7:8086` |
| Org | `digitaltwin` |
| Bucket | `sensor_data` |
| Token | `digitaltwin-token-2026` |
| Username | `admin` |
| Password | `AdminPass123` |

**Measurements stored:**
- `esp32_sensor`: suhu, kelembaban, arus, tegangan, daya, tinyml
- `camera`: people_count, fps
- `gateway`: cpu_percent, cpu_temp_c, memory_percent, disk_percent, wifi_rssi_dbm

### 6. ML Pipeline
- Location: `/mnt/storage/ml_pipeline.py`
- Only sends to Azure: ESP32 sensor + people_count
- Format:
```json
{
  "suhu": 29.4,
  "kelembaban": 77,
  "arus": 0,
  "tegangan": 0,
  "daya": 0,
  "people_count": 0,
  "timestamp": "...",
  "device_id": "RASPBERRY_PI_GATEWAY_001",
  "ml_processed": true
}
```

---

## ⚠️ PENDING TASKS

### 1. Azure Functions Deployment
**Problem:** Functions di local belum di-deploy ke Azure

**Local Functions:**
```
sensor iot/azure-setup/azure-function/
├── SaveSensorData/      → HTTP trigger
├── IoTHubToStorage/     → Event Hub trigger
├── SavePeopleCount/     → HTTP trigger
├── GetTelemetryData/    → HTTP trigger
├── GetACRecommendation/ → ML recommendation
├── AvroToTable/         → Convert AVRO to Table
└── MqttToIoTHub/        → MQTT bridge
```

**Action Required:**
1. Deploy semua functions ke `func-digitaltwin-2026`
2. Setup IoT Hub route untuk trigger `IoTHubToStorage`
3. Verify Table Storage receives data

### 2. Azure ML Integration
**Problem:** Belum ada Azure ML workspace yang accessible

**Available Local ML:**
- ESP32 TinyML (anomaly detection)
- `GetACRecommendation` function (local)

**Action Required:**
1. Cek Azure ML workspace di subscription
2. Setup ML pipeline jika diperlukan

### 3. IoT Hub Route Fix
**Problem:** Data dari IoT Hub hanya masuk Blob Storage (AVRO format)

**Current Route:**
- `telemetry-route` → `sensor-telemetry` (Blob Container)

**Required:**
- Route baru: IoT Hub → Event Hub → `IoTHubToStorage` function → Table Storage

---

## 📊 Azure Resources Summary

| Resource | Type | Status |
|----------|------|--------|
| `iothub-digitaltwin-2026` | IoT Hub | ✅ Active |
| `stordigitaltwin2026` | Storage Account | ✅ Active |
| `func-digitaltwin-2026` | Azure Function | ✅ Running (no functions deployed) |
| `SensorTelemetry` | Table Storage | ✅ Created (empty) |
| `PeopleCount` | Table Storage | ✅ Created |
| `sensortelemetry` | Blob Container | ✅ Active (AVRO format) |

---

## 🔧 ML Pipeline Flow

```
ESP32 (Suhu, Kelembaban) ──WiFi──▶ RPi Local API
Camera (People Count) ───────────▶ (5001)
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
              ┌─────────┐                              ┌──────────┐
              │ InfluxDB│                              │  Azure   │
              │(Backup) │                              │ IoT Hub  │
              └─────────┘                              └──────────┘
                    │                                         │
                    ▼                                         ▼
              ┌─────────┐                              ┌──────────┐
              │ Grafana │                              │  Azure   │
              │(Monitor)│                              │ Function │
              └─────────┘                              │(Pending) │
                                                          └──────────┘
```

---

## 📝 Files Updated

### Local Repo
- `secrets.h` - Updated WiFi SSID and RPi URL
- `yolo_cam_dashboard.py` - Copied to RPi
- `ml_pipeline.py` - Created new
- `influxdb_logger.py` - Created new

### RPi Services
- `yolo_cam.service` - Updated to use `yolo_cam_dashboard.py`
- `local_api.service` - Working
- `ml-pipeline.service` - New
- `influxdb.service` - New
- `influxdb-logger.service` - New

---

## 📋 Next Steps Priority

1. **[HIGH]** Deploy Azure Functions to production
2. **[HIGH]** Setup IoT Hub route for Event Hub trigger
3. **[MEDIUM]** Verify data flow to Table Storage
4. **[MEDIUM]** Check Azure ML workspace integration (yolo-inference-2026)
5. **[LOW]** Install Grafana for hardware monitoring

---

## 📋 Task untuk Sesi Berikutnya

### Task #1: Deploy Azure Functions

**Location Local:**
```
sensor iot/azure-setup/azure-function/
├── SaveSensorData/
├── IoTHubToStorage/
├── SavePeopleCount/
├── GetTelemetryData/
├── GetACRecommendation/
├── AvroToTable/
└── MqttToIoTHub/
```

**Target Azure:**
- Function App: `func-digitaltwin-2026`
- Runtime: Node.js 20

**Steps:**
1. `cd sensor iot/azure-setup/azure-function`
2. `npm install` (if needed)
3. `func azure functionapp publish func-digitaltwin-2026`

### Task #2: Setup IoT Hub Route ke Event Hub

**Current:**
- Route: `telemetry-route` → Blob Container `sensortelemetry` (AVRO)

**Needed:**
- Route baru: IoT Hub → Azure Function `IoTHubToStorage`
- Trigger: Event Hub endpoint (built-in)
- Function akan simpan ke Table Storage

### Task #3: Update ML Pipeline Format

**Current ML Pipeline sends to:**
- Azure IoT Hub REST API

**Should send to:**
- Azure Function HTTP endpoint (`/api/sensor/save`)
- Atau via IoT Hub route (task #2)

**Format data:**
```json
{
  "suhu": 29.4,
  "kelembaban": 77,
  "arus": 0,
  "tegangan": 0,
  "daya": 0,
  "people_count": 0,
  "timestamp": "...",
  "device_id": "RASPBERRY_PI_GATEWAY_001"
}
```

### Task #4: Cek Azure ML (yolo-inference-2026)

**Resource ditemukan:**
- Name: `yolo-inference-2026`
- Type: Application Insights component (kemungkinan)
- RG: `rg-digitaltwin`

**Need investigation:**
- Apakah ini Azure ML Workspace?
- Atau hanya Application Insights untuk YOLO monitoring?

---

## 📊 Azure Resources (Full)

### Resource Groups:
| Name | Location |
|------|----------|
| `rg-digitaltwin` | Southeast Asia |
| `tes` | East US |
| `autopost-rg` | Southeast Asia |

### Resources in `rg-digitaltwin`:
| Resource | Type | Status |
|----------|------|--------|
| `iothub-digitaltwin-2026` | IoT Hub F1 | ✅ |
| `stordigitaltwin2026` | StorageV2 | ✅ |
| `func-digitaltwin-2026` | Azure Function | ⚠️ Running (no functions) |
| `SoutheastAsiaPlan` | App Service Plan | ✅ |
| `yolo-inference-2026` | ? (need check) | ⚠️ |

### IoT Hub Config:
- Route: `telemetry-route` → `sensor-telemetry` (Blob)
- Consumer Group: `$Default`
- Devices: (need to list)

### Storage Tables:
- `SensorTelemetry` (empty)
- `PeopleCount`
- `AzureFunctionsDiagnosticEvents*`

### Storage Containers:
- `sensortelemetry` (AVRO from IoT Hub)
- `azure-webjobs-*` (Function app)
- `function-releases`

---

**Last Updated:** 2026-05-09 00:xx