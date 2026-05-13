# RPi Gateway Implementation Report

**Tanggal:** 2026-05-08
**Platform:** Digital Twin IoT Dashboard
**Status:** In Progress - RPi Gateway Implementation

---

## 1. Gambaran Keseluruhan

Arsitektur gateway-based dengan Raspberry Pi sebagai edge gateway yang collect semua data sebelum dikirim ke Azure untuk ML processing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DIGITAL TWIN ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ESP32] ──HTTP POST (WiFi)──▶ [RPi Gateway] ──Batch 30s──▶ [Azure]      │
│     │                              │                        │               │
│     │                              │                        ▼               │
│     │                              │                ┌──────────────┐        │
│     │                              │                │  Cloud ML    │        │
│     │                              │                │ • Analytics │        │
│     │                              │                │ • AC Reccmd  │        │
│     │                              │                │ • Decision   │        │
│     │                              │                └──────┬───────┘        │
│     │                              │                       │               │
│     ▼                              ▼                       │               │
│  [Dashboard]              [YOLO Camera]                    │               │
│  Polling RPi              People counting                 │               │
│  (real-time)                                              │               │
│                                                          ▼               │
│                                                  ┌──────────────┐        │
│                                                  │   ESP32      │        │
│                                                  │  (AC Cmd)    │        │
│                                                  │ ◀── RPi      │        │
│                                                  └──────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Alur Data

| # | Dari | Ke | Metode | Interval | Data |
|---|------|-----|--------|----------|------|
| 1 | ESP32 | RPi | HTTP POST (WiFi) | 5 detik | Sensor + TinyML + AC status |
| 2 | Camera | RPi | USB/V4L2 | 2 detik | People count (YOLO) |
| 3 | RPi Health | Internal | Python | 10 detik | CPU/RAM/Disk/WiFi |
| 4 | Dashboard | RPi | HTTP GET | 5 detik | Real-time display |
| 5 | RPi | Azure | HTTP POST | 30 detik | Aggregated payload |

---

## 3. File Structure

```
raspberry_pi/
├── local_api.py              # HTTP API server (Flask)
├── collector.py              # Data collection & aggregation
├── health_monitor.py         # RPi health monitoring
├── azure_forwarder.py        # Batch data ke Azure
├── yolo_cam_dashboard.py     # YOLO camera stream (existing)
├── config.py                 # Configuration
└── requirements.txt         # Python dependencies
```

---

## 4. Payload Specifications

### 4.1 ESP32 → RPi (HTTP POST)

```json
POST http://192.168.1.14:5001/api/collect
Content-Type: application/json

{
  "deviceId": "ESP32_ENERGY_MONITOR_001",
  "timestamp": "2026-05-08T10:30:00Z",
  "suhu": 27.5,
  "kelembaban": 65.0,
  "tegangan": 220.0,
  "arus": 0.45,
  "daya": 99.0,
  "tinyml": {
    "anomaly": false,
    "confidence": 0.85,
    "inference_us": 24,
    "power_mode": "efficient"
  },
  "ac": {
    "power": "on",
    "mode": "cool",
    "setpoint": 24,
    "closed_loop": true
  },
  "health": {
    "esp32_temp_c": 38.5,
    "free_heap_bytes": 185000,
    "wifi_rssi_dbm": -45
  }
}
```

### 4.2 RPi → Dashboard (HTTP GET /api/latest)

```json
GET http://192.168.1.14:5001/api/latest

{
  "success": true,
  "timestamp": "2026-05-08T10:30:00Z",
  "esp32": {
    "suhu": 27.5,
    "kelembaban": 65.0,
    "tegangan": 220.0,
    "arus": 0.45,
    "daya": 99.0,
    "tinyml": { ... },
    "ac": { ... },
    "health": { ... }
  },
  "camera": {
    "people_count": 3,
    "fps": 2.5
  },
  "gateway": {
    "cpu_temp_c": 45.2,
    "cpu_percent": 12.5,
    "memory_percent": 62.3,
    "disk_percent": 45.1,
    "wifi_rssi_dbm": -55
  }
}
```

### 4.3 RPi → Azure (Batch HTTP POST)

```json
POST https://func-digitaltwin-2026.azurewebsites.net/api/SaveSensorData

{
  "deviceId": "RASPBERRY_PI_GATEWAY_001",
  "timestamp": "2026-05-08T10:30:00Z",
  "esp32": { ... },
  "camera": { ... },
  "gateway": { ... }
}
```

---

## 5. Task List

### Phase 1: RPi Local API (Priority: High)

| # | Task | File | Status |
|---|------|------|---------|
| 1.1 | Buat Flask HTTP server dengan CORS | `local_api.py` | Planned |
| 1.2 | Endpoint POST /api/collect (terima ESP32) | `local_api.py` | Planned |
| 1.3 | Endpoint GET /api/latest (dashboard polling) | `local_api.py` | Planned |
| 1.4 | Endpoint GET /api/health (RPi health) | `local_api.py` | Planned |
| 1.5 | Endpoint GET /api/camera (people count) | `local_api.py` | Planned |
| 1.6 | Data aggregation logic | `collector.py` | Planned |

### Phase 2: RPi Health Monitor (Priority: High)

| # | Task | File | Status |
|---|------|------|---------|
| 2.1 | Monitor CPU temp via vcgencmd | `health_monitor.py` | Planned |
| 2.2 | Monitor CPU/RAM/Disk via psutil | `health_monitor.py` | Planned |
| 2.3 | Monitor WiFi RSSI | `health_monitor.py` | Planned |
| 2.4 | Monitor throttle status | `health_monitor.py` | Planned |

### Phase 3: ESP32 Firmware (Priority: High)

| # | Task | File | Status |
|---|------|------|---------|
| 3.1 | Tambah HTTP client untuk POST ke RPi | `main.cpp` | Planned |
| 3.2 | POST sensor data setiap 5 detik | `main.cpp` | Planned |
| 3.3 | Command handler via Serial (dari RPi) | `main.cpp` | Planned |
| 3.4 | Configurable endpoint (WiFi atau MQTT) | `main.cpp` | Planned |

### Phase 4: Azure Forwarder (Priority: Medium)

| # | Task | File | Status |
|---|------|------|---------|
| 4.1 | Batch buffer (30 detik) | `azure_forwarder.py` | Planned |
| 4.2 | HTTP POST ke Azure Function | `azure_forwarder.py` | Planned |
| 4.3 | Retry logic dengan exponential backoff | `azure_forwarder.py` | Planned |
| 4.4 | Update SaveSensorData Azure Function | `azure-function/SaveSensorData` | Planned |

### Phase 5: Documentation (Priority: Low)

| # | Task | File | Status |
|---|------|------|---------|
| 5.1 | Update MEMORY/architecture.md | `MEMORY/architecture.md` | Planned |
| 5.2 | Update MEMORY/decisions.md | `MEMORY/decisions.md` | Planned |
| 5.3 | Update MEMORY/progress.md | `MEMORY/progress.md` | Planned |

---

## 6. Dependencies (Python)

```txt
# requirements.txt
flask>=3.0.0
flask-cors>=4.0.0
requests>=2.31.0
psutil>=5.9.0
```

---

## 7. RPi Configuration

| Config | Value |
|--------|-------|
| IP Address | 192.168.1.14 |
| API Port | 5001 |
| Python | 3.11.15 (venv) |
| Flash Drive | /mnt/storage |

---

## 8. API Endpoints

| Method | Endpoint | Fungsi | Source |
|--------|----------|--------|--------|
| POST | `/api/collect` | Terima data ESP32 | ESP32 (WiFi) |
| GET | `/api/latest` | Semua data terbaru | Dashboard |
| GET | `/api/esp32` | Data ESP32 only | Dashboard |
| GET | `/api/camera` | People count only | Dashboard |
| GET | `/api/health` | RPi health only | Dashboard |
| GET | `/api/status` | Server status | Debug |

---

## 9. Implementation Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION ORDER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: RPi Local API                                                     │
│  └── local_api.py (Flask HTTP server)                                      │
│      ├── POST /api/collect                                                 │
│      ├── GET  /api/latest                                                 │
│      ├── GET  /api/health                                                 │
│      └── GET  /api/camera                                                 │
│                                                                             │
│  Step 2: RPi Health Monitor                                                │
│  └── health_monitor.py                                                    │
│      ├── CPU temp (vcgencmd)                                               │
│      ├── RAM/Disk (psutil)                                                 │
│      └── WiFi RSSI (iwconfig)                                              │
│                                                                             │
│  Step 3: ESP32 HTTP Client                                                │
│  └── main.cpp (modifikasi)                                                 │
│      ├── HTTP POST ke RPi                                                  │
│      └── Serial command handler                                            │
│                                                                             │
│  Step 4: Azure Forwarder                                                  │
│  └── azure_forwarder.py                                                    │
│      ├── Batch buffer (30 detik)                                           │
│      └── POST ke Azure Function                                            │
│                                                                             │
│  Step 5: Azure Function Update                                            │
│  └── SaveSensorData/index.js                                               │
│      └── Support aggregated payload                                        │
│                                                                             │
│  Step 6: Documentation Update                                             │
│  └── MEMORY/*.md                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Estimated Effort

| Phase | Task | Time |
|-------|------|------|
| 1 | RPi Local API | 2 hours |
| 2 | RPi Health Monitor | 1 hour |
| 3 | ESP32 Firmware | 1 hour |
| 4 | Azure Forwarder | 1 hour |
| 5 | Azure Function Update | 30 min |
| 6 | Documentation | 30 min |

**Total: ~6 hours**

---

## 11. Notes

- RPi **bukan database** - hanya pass through data
- Data disimpan di Azure Table Storage (historical)
- Dashboard polling langsung ke RPi (real-time)
- Azure untuk ML processing + historical analytics
- ESP32 bisa pilih: WiFi (ke RPi) atau MQTT (langsung Azure)

---

**Status:** In Progress
**Last Updated:** 2026-05-08
**Prepared by:** Claude Code
