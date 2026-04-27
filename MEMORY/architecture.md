# Arsitektur Digital Twin Dashboard

## Gambaran Arsitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EDGE / DEVICE                                  │
├──────────────────────────────┬──────────────────────────────────────────┤
│  ESP32 DevKit               │  Raspberry Pi 3/4/5                      │
│  ┌────────────────────┐     │  ┌────────────────────────────┐           │
│  │ DHT11              │ suhu/kelembaban │ │ Webcam + YOLOv3-tiny │ people  │
│  │ ZMPT101B           │ tegangan AC     │ │ Flask HTTP server     │ detection│
│  │ SCT013-000 (100A)  │ arus/daya      │ │ Azure IoT Hub MQTT   │          │
│  │ KY-022 IR Receiver │ capture remote │ └────────────────────────────┘           │
│  │ IR LED + Transistor│ kirim command │                                           │
│  └──────────────────┘             └──────────────────────────────────────┘     │
├──────────────────────────────────────────────────────────────────────────────┤
│                              CLOUD / BACKEND                                 │
├──────────────────────────────┬────────────────────────────────────────────── ┤
│  Azure IoT Hub               │  Azure Functions (Node.js)                    │
│  MQTT over TLS :8883         │  ┌─────────────────┐  ┌────────────────┐      │
│  Device: ESP32 + Raspi Pi    │  │IoTHubToStorage  │  │GetTelemetryData│      │
│                              │  │(eventHubTrigger)│  │(HTTP trigger)  │      │
│                              │  └─────────────────┘  └────────────────┘      │
│                              │  ┌─────────────────┐  ┌────────────────┐      │
│                              │  │GetACRecommendation│ │SaveSensorData │      │
│                              │  │(HTTP trigger)   │  │(HTTP trigger)  │      │
│                              │  └─────────────────┘  └────────────────┘      │
│                              │  ┌─────────────────┐  ┌────────────────┐      │
│                              │  │SavePeopleCount  │  │MqttToIoTHub    │      │
│                              │  │(HTTP trigger)   │  │(HTTP trigger)  │      │
│                              │  └─────────────────┘  └────────────────┘      │
│                             └──────────────────────────────────────────────┘     │
│                             │                                                        │
│                             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                    Azure Table Storage                                   │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐                   │   │
│  │  │   SensorTelemetry     │  │   PeopleCount         │                   │   │
│  │  │   PartitionKey: device│  │   PartitionKey: device│                   │   │
│  │  │   suhu, kelembaban,   │  │   count, location     │                   │   │
│  │  │   tegangan, arus, daya│  │                       │                   │   │
│  │  │   timestamp (UTC ISO) │  │   timestamp (UTC ISO) │                   │   │
│  │  └───────────────────────┘  └───────────────────────┘                   │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────────┤
│                           FRONTEND (view_virtual/)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  Vue 3 + Vite + PWA                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐              │
│  │ DashboardHome  │  │AdminDashboard  │  │ DigitalTwin3D    │              │
│  │ (user view)    │  │ (admin view)   │  │ Babylon.js 3D    │              │
│  └────────────────┘  └────────────────┘  └──────────────────┘              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐              │
│  │Historical     │  │EnergyManage   │  │ACRecommendation │              │
│  │Analytics     │  │ment.vue       │  │.vue             │              │
│  └────────────────┘  └────────────────┘  └──────────────────┘              │
│                                                                              │
│  Composables: useMQTT (polling Azure Function 5s), useFirebaseAuth,         │
│  useHistoricalData, useMLPrediction (fallback chain), useEnergyManagement   │
├──────────────────────────────────────────────────────────────────────────────┤
│                           ML LAYER (ml_models/)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐            │
│  │ train_from_    │  │ train_ac_      │  │ prediction_api   │            │
│  │ azure.py       │  │ recommendation │  │.py (Flask)      │            │
│  │                │  │ .py            │  │ localhost:5000  │            │
│  └────────────────┘  └────────────────┘  └──────────────────┘            │
│                                                                              │
│  Models: energy_forecast_model.pkl (RandomForest R2=0.97),                  │
│  ac_recommendation_model.pkl (GradientBoosting R2=0.86)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Alur Data

### Telemetry Utama
```
ESP32 (DHT11 + ZMPT101B + SCT013)
  → NTP sync (UTC ISO timestamp)
  → MQTT over TLS → Azure IoT Hub (port 8883)
  → IoTHubToStorage (event hub trigger)
  → Azure Table Storage: SensorTelemetry
  → GetTelemetryData API → Frontend polling (5s)
  → DashboardHome / AdminDashboard / DigitalTwin 3D
```

### People Count
```
Raspberry Pi + Webcam + YOLOv3-tiny
  → /count HTTP endpoint (Flask)
  → MQTT → Azure IoT Hub
  → IoTHubToStorage → PeopleCount table
  → GetTelemetryData/people → CameraStream.vue polling
  → DashboardHome people chart
```

### AC Recommendation
```
Sensor data (frontend)
  → useMLPrediction.getPrediction()
  → Priority 1: Azure Function /ac-recommendation/recommend
  → Priority 2: ML API localhost:5000/api/predict/all
  → Priority 3: Local rule calculation (fallback)
  → ACRecommendation.vue display
```

### Closed-Loop AC Control (ESP32)
```
ESP32 reads DHT11 sensor
  → evaluate applyClosedLoopControl() every 5s
  → heat index = f(suhu, kelembaban)
  → hysteresis-based state machine (startup/standby/cooling/fan_maintain)
  → KY-022 captures raw IR from AC remote (optional)
  → Raw IR profiles stored in ESP32 flash (NVS/Preferences)
  → IR LED + transistor sends command to AC
  → Cloud C2D message can set target_temp, power, mode
```

## API Endpoints

### Azure Functions (Production)
| Endpoint | Method | Auth | Fungsi |
|----------|--------|------|--------|
| `/api/telemetry/latest` | GET | anonymous | Latest sensor data |
| `/api/telemetry/history` | GET | anonymous | Historical sensor data |
| `/api/telemetry/stats` | GET | anonymous | Aggregated statistics |
| `/api/telemetry/people` | GET | anonymous | People count history |
| `/api/ac-recommendation/recommend` | POST | anonymous | AC recommendation |
| `/api/sensor/save` | POST | function key | Write sensor data |
| `/api/people/save` | POST | function key | Write people count |

### ML API (Lokal)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/health` | GET | Health check |
| `/api/model/info` | GET | Model metadata |
| `/api/reload` | POST | Reload models |
| `/api/predict/energy` | POST | Energy forecast |
| `/api/predict/ac` | POST | AC recommendation |
| `/api/predict/all` | POST | Combined prediction |

### Raspberry Pi Local HTTP
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/video_feed` | GET | MJPEG stream |
| `/count` | GET | Current people count |
| `/status` | GET | Detection status |
| `/snapshot` | GET | Current frame snapshot |

## Struktur Database (Azure Table Storage)

### SensorTelemetry
```
PartitionKey     : deviceId (ESP32_ENERGY_MONITOR_001 / ESP32_DHT11_Sensor)
RowKey          : timestamp_epoch + random
timestamp       : UTC ISO-8601
suhu            : float (°C)
kelembaban      : float (%)
tegangan        : float (V)
arus            : float (A)
daya            : float (W)
status_tegangan: "terhubung" | "tidak_terhubung"
status_arus     : "terhubung" | "tidak_terhubung"
deviceId        : string
receivedAt      : UTC ISO-8601
```

### PeopleCount
```
PartitionKey     : deviceId (RASPBERRY_PI_CAMERA_001 / WEB_CAMERA_001)
RowKey          : timestamp_epoch + random
timestamp       : UTC ISO-8601
count           : int
deviceId        : string
location        : string
receivedAt      : UTC ISO-8601
```

## Key Configuration

### ESP32 Firmware Constants
- MQTT interval: 5000ms
- SAS token expiry: 3600s, refresh 120s before expiry
- ADC resolution: 12-bit (4096 counts)
- Voltage calibration: 153.0 (target 220V PLN)
- Current calibration: 300.0 (burden 1000Ω)
- IR frequency: 38kHz
- AC cooldown: 90000ms

### Frontend Polling
- Azure Function polling: 5000ms (useMQTT)
- Historical data window: 720h default, 48h recent
- Max data points cache: 10000
- Electricity tariff: 1444.70 IDR/kWh

## Komponen Utama dan Hubungan

### Frontend Route Flow
```
/ (root)
  ├─ redirect based on auth state
  │   ├─ not logged → /login
  │   ├─ logged + admin session → /admin
  │   └─ logged + normal user → /dashboard

/login (user-login)
  ├─ Firebase Google Sign-In popup/redirect
  ├─ Email/password login
  └─ Forgot password reset

/admin/login (admin-login)
  ├─ Local admin (VITE_LOCAL_ADMIN_EMAIL/PASSWORD)
  └─ Firebase admin role check (custom claims / allowlist)

/dashboard (user-dashboard)
  └─ DashboardHome.vue
       ├─ DigitalTwin3D (Babylon.js 3D)
       ├─ CameraStream (live feed)
       ├─ TemperatureChart / ElectricityChart / PeopleChart
       ├─ DataTable (latest readings)
       ├─ ACRecommendation (ML prediction)
       └─ HistoricalAnalytics

/admin (admin-dashboard)
  └─ AdminDashboard.vue
       ├─ Overview section
       ├─ Energy analytics
       ├─ Device management
       ├─ Alert settings
       └─ System settings
```

## Authentication Architecture

### User Authentication
- Firebase Auth (Google Sign-In, email/password)
- `browserLocalPersistence` for session persistence
- Route guard: requires auth for /dashboard

### Admin Authentication
- Local admin via env vars (VITE_LOCAL_ADMIN_EMAIL/PASSWORD)
- Firebase admin via custom claims (`admin: true`) or allowlist
- Session stored in `sessionStorage` (not localStorage)
- Session TTL configurable via VITE_ADMIN_SESSION_TTL_MINUTES (default 30min)
- `getAdminRoleStatus()` checks claims → allowlist → local-admin

### Write Endpoint Security
- `SaveSensorData` and `SavePeopleCount` protected by `x-functions-key` header
- Frontend stores write key in `VITE_AZURE_FUNCTION_WRITE_KEY`
- Read endpoints are anonymous (public)

## CI/CD Pipeline

### GitHub Actions (.github/workflows/ci.yml)
1. Frontend: install → lint → test → build
2. Azure Functions: dependency install
3. Security audit via npm audit

### Azure Pipelines (azure-pipelines.yml)
- Legacy pipeline from root level
- Build frontend from `view_virtual/`
- Not fully synced with current repo structure
