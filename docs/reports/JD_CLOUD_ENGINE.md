# Jobdesk: Cloud Engine (Azure Backend)

**Penanggung Jawab:** Cloud Engineer / Backend Developer
**Jobdesk Code:** CL-01

---

## 1. Overview

Tim Cloud Engine bertanggung jawab untuk semua infrastruktur cloud, backend services, dan integrasi yang menjembatani IoT devices dengan frontend. Ini mencakup Azure IoT Hub, Azure Functions, Table Storage, dan future Azure Digital Twins integration.

### Tools & Stack

| Tool | Fungsi |
|------|--------|
| Azure IoT Hub | MQTT broker untuk ESP32 & Raspberry Pi |
| Azure Functions (Node.js) | Serverless API endpoints |
| Azure Table Storage | Time-series data persistence |
| Azure Digital Twins | Digital Twin state management (planned) |
| Azure Data Explorer | Advanced time-series queries (planned) |
| Azure Logic Apps / Durable Functions | Control orchestration (planned) |
| Azure Event Grid | Event-driven architecture (planned) |

---

## 2. Yang Sudah Ada (Fungsional)

### 2.1 Azure IoT Hub

| Property | Value |
|----------|-------|
| Resource Name | `iothub-digitaltwin-2026` |
| SKU | F1 (Free tier) |
| Endpoint | `iothub-digitaltwin-2026.azure-devices.net` |
| MQTT Port | 8883 |
| Protocol | MQTT over TLS |
| Auth | SAS Token (HMAC-SHA256) |

**Devices registered:**

| Device ID | Type | Status |
|-----------|------|--------|
| `ESP32_ENERGY_MONITOR_001` | ESP32 Energy Monitor | Aktif |
| `RASPBERRY_PI_CAMERA_001` | Raspberry Pi Camera | Aktif |

**MQTT Topics:**

| Topic | Direction | Purpose |
|-------|----------|---------|
| `devices/{deviceId}/messages/events/` | Device → Cloud | Telemetry publish |
| `devices/{deviceId}/messages/devicebound/#` | Cloud → Device | C2D command |

### 2.2 Azure Functions (5 Functions)

| Function | Trigger | Auth | Status |
|----------|---------|------|--------|
| `IoTHubToStorage` | Event Hub Trigger | System managed | ✅ Produksi |
| `GetTelemetryData` | HTTP GET | Anonymous | ✅ Produksi |
| `GetACRecommendation` | HTTP POST | Anonymous | ✅ Produksi |
| `SaveSensorData` | HTTP POST | Function key | ✅ Produksi |
| `SavePeopleCount` | HTTP POST | Function key | ✅ Produksi |
| `MqttToIoTHub` | HTTP POST | Function key | ✅ Produksi |

**Base URL:** `https://func-digitaltwin-2026.azurewebsites.net/api`

### 2.3 Azure Table Storage

| Table | PartitionKey | Data |
|-------|-------------|------|
| `SensorTelemetry` | deviceId | suhu, kelembaban, tegangan, arus, daya |
| `PeopleCount` | deviceId | count, location |

**Storage Account:** `stordigitaltwin2026`

### 2.4 CORS & Security

- Semua Azure Function mengembalikan `Access-Control-Allow-Origin: *`
- Write endpoints (`SaveSensorData`, `SavePeopleCount`) dilindungi `x-functions-key` header
- Frontend menggunakan `VITE_AZURE_FUNCTION_WRITE_KEY` (embedded di browser bundle — acceptable untuk demo, perlu hardening untuk production)

---

## 3. Yang Perlu Ditambahkan (Gap Analysis)

### 3.1 Azure Digital Twins Integration — PRIORITY TINGGI

**Masalah:** Tidak ada canonical digital twin state server. Frontend hanya polling data terakhir dari Table Storage tanpa ada state reconciliation atau conflict detection.

**Kondisi saat ini:** Ada `EnergyMonitorSensor.json` (DTDL model) di `sensor iot/azure-setup/models/` tapi belum ada ADT instance, twin graph, atau twin-to-device sync.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **ADT Instance** | Buat Azure Digital Twins instance |
| **Twin Graph** | Define room, AC unit, sensors sebagai twin nodes |
| **Twin Property Sync** | ESP32 telemetry → ADT twin properties (via Azure Function) |
| **Desired Property Sync** | AC setpoint dari ADT → ESP32 (via C2D) |
| **Conflict Detection** | Deteksi jika physical state ≠ digital state (e.g., manual AC remote) |

**File baru:**

```
sensor iot/azure-setup/
├── azure-digital-twins/
│   ├── create_twins.js           # Script untuk create twin graph
│   ├── sync_twin_properties.js  # Sync ESP32 telemetry → ADT
│   ├── adt_client.js            # ADT SDK wrapper
│   └── models/
│       ├── room_model.json      # DTDL room twin definition
│       └── ac_unit_model.json  # DTDL AC twin definition
```

**Modifikasi Azure Function:**

| Function | Perubahan |
|----------|-----------|
| `IoTHubToStorage` | Update twin properties di ADT setelah store |
| `GetACRecommendation` | Query ADT untuk current desired state |
| `GetTelemetryData` | Return ADT twin state, bukan hanya Table Storage |

### 3.2 Bidirectional Sync (Cloud → Device) — PRIORITY TINGGI

**Masalah:** Frontend tidak bisa mengirim command ke ESP32. AC setpoint dari ML recommendation hanya ditampilkan di UI tapi tidak dikirim ke device.

**Kondisi saat ini:** ESP32 support C2D commands (`target_temp`, `power`, `mode`, `fan`, `setpoint_temp`) tapi tidak ada pipeline cloud → ESP32 yang otomatis.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Azure IoT Hub Direct Method** | Frontend → Azure Function → IoT Hub → ESP32 |
| **C2D Message from Dashboard** | "Apply Recommendation" button kirim command |
| **Control Orchestration** | Azure Logic App: sensor → ML → decision → command |
| **Command Acknowledgment** | ESP32 confirm receipt → update twin state |

**File baru:**

```
sensor iot/azure-setup/azure-function/
├── SendCommandToDevice/
│   ├── function.json
│   └── index.js                 # POST /command/send — kirim C2D ke device
├── GetDeviceTwinState/
│   ├── function.json
│   └── index.js                 # GET /command/status — cek device state
```

**Modifikasi:**

| File | Perubahan |
|------|-----------|
| `view_virtual/src/components/ACRecommendation.vue` | "Apply" button kirim ke `/command/send` endpoint |
| `view_virtual/src/composables/useAzureTelemetry.js` | Tambahkan method untuk send command |

### 3.3 Time-Series Database Upgrade — PRIORITY SEDANG

**Masalah:** Azure Table Storage bukan time-series database yang optimal. Untuk historical queries besar (720h data) tidak efisien.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Azure Data Explorer (ADX)** | Migrate historical data ke ADX untuk advanced queries |
| **Retention Policy** | Configurable data retention (e.g., 90 days hot, 1 year cold) |
| **Advanced Analytics** | Kusto queries untuk pattern detection |
| **Real-time Streaming** | Event Hub → ADX untuk near-real-time ingestion |

### 3.4 Control Orchestration Layer — PRIORITY SEDANG

**Masalah:** Tidak ada cloud-side control loop otomatis. ML recommendation harus di-apply manual oleh user.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Azure Logic App** | Automated control loop: fetch sensor → run ML → evaluate policy → send command |
| **Azure Durable Functions** | Long-running orchestration dengan checkpoint |
| **Control Policy Engine** | Configurable rules: e.g., "if avg_temp > 28 for 10min → set AC 24°C" |
| **Override Detection** | Deteksi manual intervention dan pause auto-control |

### 3.5 Observability & Monitoring — PRIORITY SEDANG

**Masalah:** Tidak ada trace correlation, error rate monitoring, atau latency p95/p99.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Application Insights** | Telemetry, traces, custom events di Azure Functions |
| **Trace Correlation** | `trace_id` di seluruh pipeline (ESP32 → IoT Hub → Function → Frontend) |
| **Latency Monitoring** | p50/p95/p99 untuk API response time |
| **Alert Rules** | Email/Push notification saat error rate exceed threshold |
| **SLA Dashboard** | Uptime monitoring untuk frontend & API |

---

## 4. Technical Details

### 4.1 Azure Function Endpoints (Lanjutan)

| Endpoint | Method | Auth | Fungsi |
|----------|--------|------|--------|
| `/telemetry/latest` | GET | Anonymous | Latest sensor data |
| `/telemetry/history` | GET | Anonymous | Historical data (query params: from, to) |
| `/telemetry/stats` | GET | Anonymous | Aggregated stats |
| `/telemetry/people` | GET | Anonymous | People count history |
| `/ac-recommendation/recommend` | POST | Anonymous | AC recommendation |
| `/sensor/save` | POST | Function key | Write sensor data |
| `/people/save` | POST | Function key | Write people count |
| `/command/send` | POST | Function key | **BARU** — kirim C2D command |
| `/command/status` | GET | Function key | **BARU** — device twin state |

### 4.2 File yang Perlu Dibuat (New Files)

```
sensor iot/azure-setup/
├── azure-digital-twins/
│   ├── create_twins.js
│   ├── sync_twin_properties.js
│   ├── adt_client.js
│   └── models/
│       ├── room_model.json
│       └── ac_unit_model.json
├── control_orchestration/
│   ├── control_policy_engine.js
│   └── logic_app_template.json
├── monitoring/
│   ├── app_insights_config.js
│   └── alert_rules.json
└── adx/
    ├── migrate_to_adx.js
    └── adx_query_library.kql
```

### 4.3 File yang Perlu Dimodifikasi

| File | Perubahan |
|------|-----------|
| `IoTHubToStorage/index.js` | Update ADT twin properties after storing |
| `GetTelemetryData/index.js` | Return ADT twin state + Table Storage |
| `GetACRecommendation/index.js` | Query ADT for desired state |
| `host.json` | Tambahkan Application Insights integration |
| `local.settings.json` | Tambahkan ADT connection string |
| `vercel.json` (root) | Update routing jika ada new API |

### 4.4 Dependencies dengan Jobdesk Lain

| Jobdesk | Dependency | Notes |
|---------|-----------|-------|
| **ML Engine** | AC recommendation dari Azure Function | Level 0 fallback |
| **Website** | Polling `/telemetry/*` endpoints | `useAzureTelemetry.js` |
| **Website** | Command send dari ACRecommendation | HTTP POST ke `/command/send` |
| **IoT Hardware** | ESP32 receive C2D commands | Sudah support di `main.cpp` |
| **IoT Hardware** | Device provisioning via DPS | Planned |

---

## 5. Azure Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │          Azure IoT Hub              │
                    │   MQTT :8883  │  HTTPS :443        │
                    └──────┬────────┴──────────┬─────────┘
                           │                    │
              ┌────────────┘                    └────────────┐
              │ Device (ESP32)                        │ Cloud (Azure Functions)
              │ - DHT11, ZMPT101B, SCT013            │
              │ - Publish telemetry                   │ - IoTHubToStorage (Event Hub)
              │ - Subscribe C2D commands              │ - GetTelemetryData (HTTP)
              └────────────────────────────────────── │ - GetACRecommendation (HTTP)
                                                     │ - SendCommandToDevice (HTTP) ⭐BARU
                                                     └────────────────────────────────────┐
                                                                                              │
                    ┌──────────────────────────────────────────────────────────────────────────┐
                    │                       Azure Table Storage                                │
                    │     SensorTelemetry          │           PeopleCount                  │
                    └──────────────────────────────────────────────────────────────────────────┘
                                                                                              │
                    ┌──────────────────────────────────────────────────────────────────────────┐
                    │                    Azure Digital Twins ⭐BARU                          │
                    │     Room Twin ←→ AC Unit Twin ←→ Sensor Twin                           │
                    │     Desired Properties: setpoint, mode, power                           │
                    │     Reported Properties: temp, humidity, power                          │
                    └──────────────────────────────────────────────────────────────────────────┘
                                                                                              │
                    ┌──────────────────────────────────────────────────────────────────────────┐
                    │              Azure Data Explorer ⭐BARU                                 │
                    │     Historical analytics, advanced queries                               │
                    └──────────────────────────────────────────────────────────────────────────┘
                                                                                              │
                    ┌───────────────────────┐         ┌───────────────────────┐
                    │   Azure Logic Apps    │         │  Application Insights │
                    │   ⭐BARU               │         │  ⭐BARU                 │
                    │   Control orchestration│       │  Trace, latency, SLA   │
                    └───────────────────────┘         └───────────────────────┘
```

---

## 6. API Specification (Yang Perlu Ditambah)

### POST /api/command/send

**Request:**
```json
{
  "deviceId": "ESP32_ENERGY_MONITOR_001",
  "command": {
    "target_temp": 24,
    "power": true,
    "mode": "cool",
    "fan": "auto",
    "apply_now": true
  },
  "trace_id": "cmd_..."
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "...",
  "trace_id": "cmd_...",
  "timestamp": "2026-04-26T10:00:00Z"
}
```

### GET /api/command/status

**Query params:** `deviceId=ESP32_ENERGY_MONITOR_001`

**Response:**
```json
{
  "deviceId": "ESP32_ENERGY_MONITOR_001",
  "desired_state": {
    "target_temp": 24,
    "power": true
  },
  "reported_state": {
    "ac_power": "on",
    "ac_setpoint": 24,
    "control_band": "cooling"
  },
  "last_command_time": "2026-04-26T09:58:00Z",
  "sync_status": "synced"
}
```

---

## 7. Timeline Suggestion

| Fase | Durasi | Fitur |
|------|--------|-------|
| **Phase 1** | 1-2 minggu | Azure Digital Twins instance + twin graph creation |
| **Phase 2** | 1-2 minggu | IoTHubToStorage → update twin properties; GetTelemetryData → return twin state |
| **Phase 3** | 1 minggu | SendCommandToDevice function + ACRecommendation apply button |
| **Phase 4** | 1-2 minggu | Control orchestration (Logic App atau Durable Function) |
| **Phase 5** | 2-3 minggu | Azure Data Explorer migration + observability (App Insights) |

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Write key di browser | Move ke backend-for-frontend (BFF) pattern atau Azure API Management |
| CORS wide open | Restrict CORS untuk write endpoints; read endpoints acceptable |
| SAS token in ESP32 | OK untuk embedded; consider DPS untuk production scale |
| ADT access | Use managed identity untuk Azure Functions → ADT |

---

## 9. Verification Checklist

- [ ] Azure Digital Twins instance dapat di-create dan twin graph berfungsi
- [ ] ESP32 telemetry → ADT twin properties (verified via `az dt twin query`)
- [ ] `/command/send` kirim C2D message → ESP32 receive (verified via serial monitor)
- [ ] `/command/status` return device twin state
- [ ] Control orchestration Logic App triggered secara scheduled atau event-based
- [ ] Application Insights traces visible di Azure Portal
- [ ] Azure Functions tidak error pada load test (100 req/min)

---

## 10. Notes

- Azure Functions saat ini menggunakan Consumption plan — cukup untuk demo, perlu upgrade ke Premium untuk production dengan SLA
- IoT Hub SKU F1 (Free) punya batasan: 500 devices, 8k messages/day — upgrade ke S1 jika scale up
- ADT pricing berdasarkan twin count dan query volume — perlu estimate sebelum production deployment
- SAS token generation di ESP32 sudah baik (HMAC-SHA256 via mbedtls) — tidak perlu ubah

**Next Action:** Mulai dari Phase 1 — buat Azure Digital Twins instance dan define twin graph dengan room + AC unit + sensor twins.