# Terminologi & Istilah Domain

## Hardware / IoT

### ESP32 DevKit
Mikrokontroler utama. Firmware di `sensor iot/src/main.cpp`.

**Nama device di Azure**: `ESP32_ENERGY_MONITOR_001`

### Sensor

| Nama | Pin GPIO | Fungsi |
|------|---------|--------|
| DHT11 | GPIO 14 | Suhu & kelembaban |
| ZMPT101B | GPIO 35 (ADC1_CH7) | Tegangan AC 220V |
| SCT013-000 | GPIO 32 (ADC1_CH4) | Arus AC 100A/50mA |
| KY-022 | GPIO 27 | IR receiver (capture remote AC) |
| IR LED | GPIO 4 + transistor NPN | IR transmitter (kirim command AC) |

### Kalibrasi Hardware

| Konstanta | Nilai | Keterangan |
|-----------|-------|------------|
| `VOLTAGE_CALIBRATION` | 153.0 | Faktor kalibrasi tegangan (target 220V PLN) |
| `CURRENT_CALIBRATION` | 300.0 | Faktor kalibrasi arus (burden 1000Ω) |
| `BURDEN_RESISTOR` | 1000.0 Ω | Burden resistor SCT013 |
| `RMS_THRESHOLD` | 0.25V | Minimum RMS untuk deteksi tegangan valid |
| `CURRENT_THRESHOLD_MIN` | 0.1A | Minimum arus terukur |

### Raspberry Pi Camera
**Nama device di Azure**: `RASPBERRY_PI_CAMERA_001`

Model YOLO: `yolov3-tiny.weights` + `yolov3-tiny.cfg`
Detection threshold: 40% confidence

### AC Model
Model Gree AC yang didukung:
- `YBOFB` — default (GWC-09F5S)
- `YAW1F`
- `YX1FSF`

---

## Azure

### Azure IoT Hub
```
Host: {iotHubName}.azure-devices.net
Port: 8883 (MQTT over TLS)
Device ID (ESP32): ESP32_ENERGY_MONITOR_001
Device ID (Raspi): RASPBERRY_PI_CAMERA_001
```

### MQTT Topics
```
Publish: devices/{deviceId}/messages/events/$.ct=application%2Fjson&$.ce=utf-8
Subscribe: devices/{deviceId}/messages/devicebound/#
```

### SAS Token
- Algorithm: HMAC-SHA256
- Expiry: 3600s
- Refresh window: 120s sebelum expiry

### Azure Table Storage

**Table: SensorTelemetry**
| Field | Tipe | Keterangan |
|-------|------|------------|
| `PartitionKey` | string | deviceId |
| `RowKey` | string | timestamp_epoch + random |
| `timestamp` | string | UTC ISO-8601 |
| `suhu` | float | °C |
| `kelembaban` | float | % |
| `tegangan` | float | V |
| `arus` | float | A |
| `daya` | float | W |
| `status_tegangan` | string | "terhubung" / "tidak_terhubung" |
| `status_arus` | string | "terhubung" / "tidak_terhubung" |

**Table: PeopleCount**
| Field | Tipe | Keterangan |
|-------|------|------------|
| `PartitionKey` | string | deviceId |
| `RowKey` | string | timestamp_epoch + random |
| `timestamp` | string | UTC ISO-8601 |
| `count` | int | Jumlah orang |
| `location` | string | Lokasi (default: "Ruang Utama") |

---

## Frontend

### Konvensi Penamaan

| Pattern | Contoh | Keterangan |
|---------|--------|------------|
| camelCase | `sensorData`, `peopleCount` | State Vue / composable |
| kebab-case | `digital-twin-3d.vue`, `sensor-status.vue` | File Vue component |
| snake_case | `people_count`, `daily_kwh` | Payload API lama |
| PascalCase | `DashboardHome.vue`, `AdminDashboard.vue` | Vue component class |
| SCREAMING_SNAKE | `WIB_OFFSET_MS`, `POLLING_INTERVAL` | Konstanta JS global |

### Konstanta Penting

| Konstanta | Nilai | Lokasi |
|-----------|-------|--------|
| `POLLING_INTERVAL` | 5000ms | useMQTT.js |
| `WIB_OFFSET_MS` | 7 * 60 * 60 * 1000 | useMQTT.js |
| `DEFAULT_HISTORY_HOURS` | 720 | useHistoricalData.js |
| `DEFAULT_HISTORY_LIMIT` | 5000 | useHistoricalData.js |
| `MAX_DATA_POINTS` | 10000 | useHistoricalData.js |
| `STORAGE_KEY` (sensor) | `sensor_last_data` | useMQTT.js |
| `STORAGE_KEY` (history) | `digitaltwin_historical_data` | useHistoricalData.js |
| `STORAGE_KEY` (energy) | `digitaltwin_energy_management` | useEnergyManagement.js |
| `tariffPerKwh` | 1444.70 IDR | useEnergyManagement.js |
| `ADMIN_SESSION_TTL_MS` | 30 min (default) | App.vue |

### Field Mapping (Frontend ↔ Backend)

Payload IoT ke Azure:
```
ESP32 field → Azure Table → Frontend field
suhu → suhu → temperature
kelembaban → kelembaban → humidity
tegangan → tegangan → voltage
arus → arus → current
daya → daya → power
timestamp → timestamp → timestamp (UTC ISO)
```

---

## ML

### Model Features

**Energy Forecast Model**
Features: `suhu`, `kelembaban`, `tegangan`, `arus`, `hour`
Model: RandomForestRegressor
R² Score: 0.9687 (96.87%)
MAE: 1.056

**AC Recommendation Model**
Features: `suhu`, `kelembaban`, `daya`, `hour`, `month`
Model: GradientBoostingRegressor
R² Score: 0.8629 (86.29%)
MAE: 0.006

### Fallback Chain

| Level | Source | Keterangan |
|-------|--------|------------|
| 0 | `azure_function` | Azure Function rule-based approximation |
| 1 | `ml_api` | Local Flask ML API |
| 2 | `local_calculation` | Hardcoded rule di frontend |

### Prediction Metadata

```javascript
{
  schema_version: "1.0.0",
  timestamp_utc: "2026-01-10T...",
  trace_id: "pred_..._...",
  source: "azure_function",
  source_tag: "azure_function:prediction",
  model_version: "2026-01-10",
  fallback_level: 0,
  fallback_chain: ["azure_function", "ml_api", "local_calculation"],
  input: { suhu, kelembaban, ... },
  energy: { predicted_watt, daily_kwh, monthly_kwh, monthly_cost_idr, confidence_percent },
  ac: { recommended_temp, action, mode, confidence_percent }
}
```

---

## Azure Function Routes

| Route | Action | Auth |
|-------|--------|------|
| `telemetry/latest` | GET latest sensor | anonymous |
| `telemetry/history` | GET historical data | anonymous |
| `telemetry/stats` | GET statistics | anonymous |
| `telemetry/people` | GET people count | anonymous |
| `ac-recommendation/recommend` | POST recommendation | anonymous |
| `sensor/save` | POST sensor data | function key |
| `people/save` | POST people count | function key |

---

## Closed-Loop AC State Machine

Band states di ESP32:
- `startup` — initial state
- `start_cooling` — heat index exceeds hot threshold → turn on cooling
- `standby` — AC off, waiting
- `cooling` — actively cooling
- `fan_maintain` — target reached, fan only
- `hold_cool` — maintain cool mode
- `hold_fan` — maintain fan mode
- `hold_cool_humidity` — high humidity, hold cooling
- `manual_pause` — closed loop disabled
- `waiting_sensor` — no valid sensor reading

---

## Konvensi Penulisan Kode

- **Bahasa**: Inggris (variabel/function), Indonesia (komentar/user-facing)
- **Emoji di Serial Monitor**: untuk status visual yang jelas di serial monitor
- **Module-level singleton**: state composable di-share via ref di luar function
- **Error handling**: graceful fallback, tidak crash
- **Timestamp**: UTC ISO-8601 di storage, konversi lokal di UI
