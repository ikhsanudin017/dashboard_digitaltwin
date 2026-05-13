# Data Storage Optimization Report

**Date:** 2026-05-08
**Author:** Claude Code
**Status:** Planned (Pending Implementation)

---

## Executive Summary

Optimasi storage Azure Table Storage dengan menyimpan hanya **8 essential data fields** ke cloud, sisanya tetap di Raspberry Pi lokal.

---

## Background

Berdasarkan review konfigurasi Azure Table Storage, ditemukan bahwa setiap row menyimpan **~27 fields** termasuk:
- TinyML inference data
- AC control status
- ESP32 device health
- Raspberry Pi gateway metrics
- Camera FPS

Banyak data ini tidak diperlukan di Azure dan meningkatkan cost storage.

---

## Solution: Data Separation Strategy

### Data yang Disimpan ke Azure (8 Fields)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `suhu` | double | ESP32 | Temperature (°C) |
| `kelembaban` | double | ESP32 | Humidity (%) |
| `tegangan` | double | ESP32 | AC Voltage (Volt) |
| `arus` | double | ESP32 | Current (Ampere) |
| `daya` | double | ESP32 | Power (Watt) |
| `status_tegangan` | string | ESP32 | Voltage status (normal/high/low) |
| `status_arus` | string | ESP32 | Current status (normal/high) |
| `people_count` | int | RPi Camera | Number of people detected |

### Data yang Tetap di Raspberry Pi (Local)

| Category | Fields | Notes |
|----------|--------|-------|
| **TinyML** | anomaly, confidence, power_mode, inference_us | Edge ML, tidak perlu ke cloud |
| **AC Control** | power, mode, setpoint, closed_loop | Kontrol lokal ESP32 |
| **ESP32 Health** | esp32_temp_c, free_heap_bytes, wifi_rssi_dbm | Debugging only |
| **Gateway Health** | cpu_temp, cpu_percent, memory_percent, disk_percent | RPi monitoring |
| **Camera** | fps | Performance metric only |

---

## Implementation Plan

### Phase 1: Update SaveSensorData Azure Function
**File:** `sensor iot/azure-setup/azure-function/SaveSensorData/index.js`

```javascript
// Simplify entity to only essential fields
const entity = {
    partitionKey: deviceId,
    rowKey: Date.now().toString() + Math.random().toString(36).substring(2, 7),
    timestamp: timestamp,
    deviceId: deviceId,

    // Essential sensor data (from ESP32)
    suhu: parseFloat(esp32.suhu),
    kelembaban: parseFloat(esp32.kelembaban),
    tegangan: parseFloat(esp32.tegangan),
    arus: parseFloat(esp32.arus),
    daya: parseFloat(esp32.daya),
    status_tegangan: sensorData.status_tegangan || "normal",
    status_arus: sensorData.status_arus || "normal",

    // People count (from RPi camera)
    people_count: sensorData.camera ? sensorData.camera.people_count : 0
};
```

### Phase 2: Update local_api.py (RPi)
**File:** `raspberry_pi/local_api.py`

Tambahkan field `status_tegangan` dan `status_arus` ke payload sebelum dikirim ke Azure.

### Phase 3: Cleanup Existing Data (Optional)
```bash
# Azure CLI - delete old entries if needed
az storage table delete --name SensorTelemetry --account-name stordigitaltwin2026
```

---

## Estimated Impact

### Storage Reduction
| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Fields per row | ~27 | 8 | **70%** |
| Avg bytes per row | ~1.35KB | ~400B | **70%** |
| Yearly storage | ~85GB | ~25GB | **60GB saved** |

### Cost Reduction
| Item | Before | After |
|------|--------|-------|
| Storage cost | ~$6/month | ~$2/month |
| Transaction cost | Same | Same |

---

## Rollback Plan

Jika perlu rollback, revert `SaveSensorData/index.js` ke versi sebelumnya yang menyimpan semua fields.

---

## Approval Required

- [ ] Konfirmasi 7 field sensor + people_count sudah cukup untuk use case
- [ ] Setuju dengan data separation (Azure vs Local RPi)
- [ ] Approval untuk deploy update

---

## Files to Modify

1. `sensor iot/azure-setup/azure-function/SaveSensorData/index.js`
2. `raspberry_pi/local_api.py` (tambahkan status fields)
3. `CLAUDE.md` (updated ✓)
