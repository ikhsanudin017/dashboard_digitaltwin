# Digital Twin Report — Summary

**Tanggal:** 2026-04-26
**Project:** Digital Twin IoT Energy Monitoring System
**Status:** Production-ready (monitoring layer) + Foundation untuk Full Digital Twin

---

## Overview

Project Digital Twin ini terdiri dari **5 jobdesk** yang saling terintegrasi:

| Jobdesk | Code | Penanggung Jawab | Deliverables |
|---------|------|-----------------|--------------|
| **ML Engine** | ML-01 | Data Scientist / ML Engineer | Prediction models, training pipeline, simulation engine |
| **Cloud Engine** | CL-01 | Cloud Engineer / Backend | Azure IoT Hub, Functions, Table Storage, ADT |
| **Software / Website** | SW-01 | Frontend Developer | Vue 3 dashboard, Babylon.js 3D, Firebase auth |
| **IoT / Hardware** | IOT-01 | IoT / Embedded Engineer | ESP32 firmware, sensors, closed-loop control |
| **3D Design** | 3D-01 | 3D Artist / Visualization | glTF model, reactive materials, SCADA overlay |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DIGITAL TWIN ARCHITECTURE                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      PHYSICAL LAYER                              │    │
│  │  ┌──────────────────┐       ┌──────────────────────────┐       │    │
│  │  │  ESP32 DevKit    │       │   Raspberry Pi 3/4/5     │       │    │
│  │  │  - DHT11         │       │   - USB Webcam           │       │    │
│  │  │  - ZMPT101B       │       │   - YOLOv3-tiny          │       │    │
│  │  │  - SCT013         │       │   - Flask server         │       │    │
│  │  │  - IR TX/RX       │       └──────────────────────────┘       │    │
│  │  └────────┬─────────┘                                        │    │
│  │           │ MQTT TLS                                          │    │
│  └───────────┼───────────────────────────────────────────────────┘    │
│              ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        CLOUD LAYER                              │    │
│  │  ┌────────────────┐  ┌────────────────────────────────────┐   │    │
│  │  │ Azure IoT Hub   │  │  Azure Functions (Node.js)          │   │    │
│  │  │ MQTT :8883     │  │  - GetTelemetryData                 │   │    │
│  │  │ Device: ESP32  │  │  - GetACRecommendation              │   │    │
│  │  │ Device: Raspi  │  │  - IoTHubToStorage (Event Hub)     │   │    │
│  │  └───────┬────────┘  │  - SaveSensorData                   │   │    │
│  │          │            │  - SavePeopleCount                  │   │    │
│  │          │            │  - [BARU] SendCommandToDevice       │   │    │
│  │          │            └────────────────────────────────────┘   │    │
│  │          │                         │                             │    │
│  │          │            ┌───────────┴───────────┐               │    │
│  │          ▼            ▼                       ▼               │    │
│  │  ┌────────────────┐    ┌──────────────────┐  ┌──────────────┐  │    │
│  │  │Azure Table     │    │Azure Digital     │  │  Azure      │  │    │
│  │  │Storage        │    │Twins ⭐BARU      │  │  Data Exp.  │  │    │
│  │  │- SensorTelemetry│   │- Twin Graph      │  │  ⭐BARU     │  │    │
│  │  │- PeopleCount   │    │- Property Sync   │  │             │  │    │
│  │  └────────────────┘    └──────────────────┘  └──────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│              │                                                           │
│              ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        ML LAYER                                 │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │    │
│  │  │ RandomForest   │  │ GradientBoost  │  │ Simulation       │  │    │
│  │  │ Energy Model   │  │ AC Recommendation│ │ Engine ⭐BARU   │  │    │
│  │  │ R²=0.85        │  │ R²=0.96         │  │ What-If         │  │    │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│              │                                                           │
│              ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      FRONTEND LAYER                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │    │
│  │  │  Vue 3       │  │  Babylon.js  │  │  Firebase Auth        │  │    │
│  │  │  Dashboard   │  │  3D Viewer   │  │  Google + Email       │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────────────────┘  │    │
│  │         │                │                    │               │    │
│  │         └────────────────┼────────────────────┘               │    │
│  │                          ▼                                    │    │
│  │                   Vercel (CDN)                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Jobdesk Detail Summary

### ML Engine (JD_ML_ENGINE.md)

**Status:** ✅ Operational

| Fitur | Status | Notes |
|-------|--------|-------|
| Energy forecast model (RandomForest) | ✅ | R²~0.85 |
| AC recommendation model (GradientBoosting) | ✅ | R²~0.96 |
| Prediction API (Flask, port 5000) | ✅ | 5 endpoints |
| Auto-training pipeline | ✅ | Cron-scheduled |
| Simulation engine | ❌ | **Needed** |
| Drift monitoring | ❌ | **Needed** |
| Multi-step horizon forecast | ❌ | **Needed** |

**File aktif:**
- `ml_models/train_model.py`
- `ml_models/train_ac_recommendation.py`
- `ml_models/prediction_api.py`
- `ml_models/models/*.pkl`

---

### Cloud Engine (JD_CLOUD_ENGINE.md)

**Status:** ✅ Operational

| Fitur | Status | Notes |
|-------|--------|-------|
| Azure IoT Hub | ✅ | F1 tier, 2 devices |
| Azure Functions (5) | ✅ | Produksi aktif |
| Azure Table Storage | ✅ | SensorTelemetry, PeopleCount |
| CORS enabled | ✅ | All origin |
| Azure Digital Twins | ❌ | **Needed** |
| Bidirectional sync (C2D command) | ❌ | **Needed** |
| Control orchestration | ❌ | **Needed** |
| Time-series DB (ADX) | ❌ | **Needed** |
| Observability (App Insights) | ❌ | **Needed** |

**File aktif:**
- `sensor iot/azure-setup/azure-function/` (5 functions)

---

### Software / Website (JD_WEBSITE.md)

**Status:** ✅ Operational

| Fitur | Status | Notes |
|-------|--------|-------|
| Vue 3 dashboard (15 components) | ✅ | |
| Babylon.js 3D viewer | ✅ | |
| Firebase Auth | ✅ | |
| Polling telemetry (5s) | ✅ | useAzureTelemetry |
| ML prediction fallback chain | ✅ | useMLPrediction |
| Historical analytics | ✅ | |
| Energy management | ✅ | |
| Admin dashboard | ✅ | |
| Tests (113 PASS) | ✅ | |
| Reactive 3D materials | ❌ | **Needed** |
| Real-time (SignalR) | ❌ | **Needed** |
| Command-to-device UI | ❌ | **Needed** |
| Alerting dashboard | ❌ | **Needed** |
| Schema validation | ❌ | **Needed** |

**File aktif:**
- `view_virtual/src/components/*.vue` (15 files)
- `view_virtual/src/composables/*.js` (7 files)

---

### IoT / Hardware (JD_IOT_HARDWARE.md)

**Status:** ✅ Operational

| Fitur | Status | Notes |
|-------|--------|-------|
| ESP32 firmware (2051 lines) | ✅ | |
| DHT11 + ZMPT101B + SCT013 | ✅ | |
| MQTT TLS → Azure IoT Hub | ✅ | |
| SAS token generation | ✅ | |
| IR capture/transmit | ✅ | |
| Closed-loop AC control | ✅ | |
| Serial CLI (30+ commands) | ✅ | |
| Raspberry Pi YOLO camera | ✅ | |
| Occupancy feedback loop | ❌ | **Needed** |
| Multi-actuator control | ❌ | **Needed** |
| OTA firmware update | ❌ | **Needed** |
| DPS provisioning | ❌ | **Needed** |
| Safety limits | ❌ | **Needed** |
| Edge ML inference | ❌ | **Needed** |

**File aktif:**
- `sensor iot/src/main.cpp`
- `sensor iot/raspberry-pi/people_counter_yolo.py`

---

### 3D Design (JD_3D_DESIGN.md)

**Status:** ⚠️ Partial

| Fitur | Status | Notes |
|-------|--------|-------|
| glTF apartment model | ✅ | 50+ textures |
| Babylon.js scene setup | ✅ | |
| AC unit mesh | ✅ | |
| Cold air particle system | ✅ | |
| Glow layer | ✅ | |
| Sensor overlay icons | ✅ | |
| Reactive temperature materials | ❌ | **Needed** |
| SCADA alarm overlay | ❌ | **Needed** |
| AC unit animations | ❌ | **Needed** |
| Multi-room navigation | ❌ | **Needed** |
| People density heatmap | ❌ | **Needed** |
| LOD optimization | ❌ | **Needed** |

**File aktif:**
- `public/models/3d twin/scene.gltf`
- `view_virtual/src/components/DigitalTwin3D_Babylon.vue`

---

## Prioritas Implementasi

### Phase 1 — Core Digital Twin (Bulan 1-2)

| Priority | Jobdesk | Fitur |
|----------|---------|-------|
| 🔴 1 | Cloud | Azure Digital Twins instance + twin graph |
| 🔴 2 | Cloud | SendCommandToDevice function + C2D pipeline |
| 🔴 3 | Website | ACRecommendation apply button → command |
| 🔴 4 | 3D | Reactive temperature materials |
| 🔴 5 | IoT | Occupancy fetch dari cloud |

### Phase 2 — Advanced Features (Bulan 2-3)

| Priority | Jobdesk | Fitur |
|----------|---------|-------|
| 🟡 6 | ML | Simulation engine + what-if scenario |
| 🟡 7 | 3D | AC unit animations (fan, glow, particles) |
| 🟡 8 | Cloud | Control orchestration (Logic App) |
| 🟡 9 | ML | Drift monitoring |
| 🟡 10 | Website | Real-time SignalR connection |

### Phase 3 — Optimization (Bulan 3-4)

| Priority | Jobdesk | Fitur |
|----------|---------|-------|
| 🟢 11 | IoT | Multi-actuator control |
| 🟢 12 | 3D | SCADA overlay + alert visualization |
| 🟢 13 | Cloud | Azure Data Explorer migration |
| 🟢 14 | IoT | OTA firmware update |
| 🟢 15 | ML | Multi-step horizon forecast |

---

## Dependencies Graph

```
ML Engine
  ├── needs: Cloud Engine (Azure Table Storage → training data)
  └── provides: Website (useMLPrediction.js)

Cloud Engine
  ├── needs: IoT (ESP32 publish telemetry)
  ├── provides: ML Engine (training data source)
  ├── provides: Website (API polling)
  ├── provides: IoT (C2D commands via /command/send)
  └── coordinates: 3D Design (twin state → reactive materials)

Website
  ├── needs: Cloud Engine (API endpoints)
  ├── needs: ML Engine (prediction fallback)
  └── provides: 3D Design (sensor data binding)

IoT / Hardware
  ├── needs: Cloud Engine (C2D commands, occupancy API)
  └── provides: Cloud Engine (telemetry data)

3D Design
  ├── needs: Website (sensor data from useAzureTelemetry)
  ├── needs: IoT (AC status from telemetry)
  └── provides: Website (visualization component)
```

---

## File Structure (Reports)

```
docs/reports/
├── JD_ML_ENGINE.md       # Data Scientist / ML Engineer
├── JD_CLOUD_ENGINE.md     # Cloud Engineer / Backend
├── JD_WEBSITE.md          # Frontend Developer
├── JD_IOT_HARDWARE.md     # IoT / Embedded Engineer
├── JD_3D_DESIGN.md       # 3D Artist / Visualization
└── DIGITAL_TWIN_REPORT_SUMMARY.md  # This file
```

---

## Metrics

| Metric | Value |
|--------|-------|
| **Total files** | ~150 source files |
| **ESP32 firmware** | 2051 lines (C++) |
| **Vue components** | 15 components |
| **Vue composables** | 7 composables |
| **Azure Functions** | 5 functions |
| **ML model files** | 8 .pkl files |
| **Test coverage** | 113 tests PASS |
| **Build time** | ~15s (Vue frontend) |
| **glTF model** | 1 apartment scene (50+ textures) |
| **3D particle system** | 1 (cold air) |

---

## Next Steps

1. **Buat Azure Digital Twins instance** — foundation untuk state reconciliation
2. **Implement reactive 3D materials** — visibility wins
3. **Connect AC command button** — demonstrate bidirectional capability
4. **Add occupancy feedback** — close the loop ESP32 ↔ camera
5. **Build simulation engine** — enable what-if planning

---

*Report generated: 2026-04-26*
*Detail per jobdesk: lihat file respective di `docs/reports/`*