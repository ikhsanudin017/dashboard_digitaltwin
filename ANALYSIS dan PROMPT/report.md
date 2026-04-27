# Report Digital Twin Dashboard

**Tanggal**: 2026-04-26 (Update Akhir Session)
**Analis**: Claude Code (AI-assisted)

---

## 1. Status Project

Project Digital Twin Dashboard sudah **production-ready** — pipeline end-to-end terhubung: ESP32 → Azure IoT Hub → Azure Functions → Vue Dashboard → Babylon.js 3D → ML recommendation.

Pipeline utama solid. Fokus saat ini: hardening, observability, dan advanced features (simulation, bidirectional control, ADT integration).

---

## 2. Yang Sudah Selesai

| Modul | Status | Catatan |
|-------|--------|---------|
| Vue 3 dashboard (user + admin) | ✅ Fungsional | UI redesign 2026-04-26 |
| Firebase Auth (Google + email/password + local admin) | ✅ Fungsional | Auth state fix, redirect fix |
| Polling telemetry Azure (5 detik) | ✅ Fungsional | useAzureTelemetry (HTTP polling) |
| Chart real-time (Temperature, Electricity, People) | ✅ Fungsional | |
| Digital Twin 3D Babylon.js | ✅ Fungsional | glTF apartment scene |
| HistoricalAnalytics + EnergyManagement + ACRecommendation | ✅ Fungsional | |
| CameraStream (Raspberry Pi / YOLOv3-tiny) | ✅ Fungsional | |
| Azure Functions (5 endpoints) | ✅ Produksi aktif | func-digitaltwin-2026.azurewebsites.net |
| ESP32 firmware (DHT11, ZMPT101B, SCT013, IR) | ✅ Aktif | 2051 lines, closed-loop AC |
| ML models (RandomForest R²=0.97, GradientBoosting R²=0.86) | ✅ Terlatih | Auto-train ready |
| CI/CD GitHub Actions + Vercel | ✅ Konfigurasi | |
| Test suite | ✅ 113 test PASS | useAzureTelemetry, useMLPrediction, useAPI |

---

## 3. Yang Perlu Ditambahkan (Gap Analysis)

| Fitur | Prioritas | Status |
|-------|-----------|--------|
| Azure Digital Twins integration | 🔴 Tinggi | Belum ada |
| Bidirectional sync (C2D command → ESP32) | 🔴 Tinggi | Belum ada |
| Reactive 3D temperature materials | 🔴 Tinggi | Belum ada |
| Occupancy feedback loop (ESP32 ← camera) | 🔴 Tinggi | Belum ada |
| AC command UI (apply button → device) | 🔴 Tinggi | Belum ada |
| Simulation engine (what-if scenario) | 🟡 Sedang | Belum ada |
| SCADA alarm overlay di 3D | 🟡 Sedang | Belum ada |
| Real-time (SignalR/WebSocket) | 🟡 Sedang | Belum ada |
| Multi-actuator control | 🟡 Sedang | ESP32 hanya AC |
| OTA firmware update | 🟡 Sedang | Belum ada |
| Schema validation end-to-end | 🟡 Sedang | Belum ada |
| Drift monitoring (ML model) | 🟡 Sedang | Belum ada |
| Multi-room / multi-floor support | 🟢 Rendah | Belum ada |
| Camera stream authentication | 🟢 Rendah | Flask tanpa auth |
| Write path security hardening | 🟢 Rendah | Function key di browser |
| ML governance (versioning, drift) | 🟢 Rendah | .pkl di repo |

---

## 4. Arsitektur Decision

### Decision #1: HTTP Polling Frontend
**Keputusan**: Frontend polling Azure Function tiap 5 detik, BUKAN browser MQTT direct ke IoT Hub.
**Alasan**: IoT Hub SAS token tidak bisa di-refresh otomatis di browser. Polling HTTP lebih sederhana dan reliable.

### Decision #2: UTC ISO-8601 End-to-End
**Keputusan**: Semua sistem kirim/simpan timestamp dalam UTC ISO-8601. Konversi WIB hanya di layer presentasi UI Vue.
**Status**: RESOLVED.

### Decision #3: AC Recommendation Fallback Chain
**Keputusan**: Frontend coba Azure Function → ML API lokal → local calculation.
**Status**: Sudah berjalan dengan metadata observability (trace_id, source_tag, fallback_level).

### Decision #4: Firebase Auth Hybrid
**Keputusan**: Admin bisa login via local env vars (tanpa Firebase) atau via Firebase custom claims.

### Decision #5: Rename useMQTT → useAzureTelemetry (2026-04-26)
**Keputusan**: Composable `useMQTT.js` direname menjadi `useAzureTelemetry.js`.
**Alasan**: Implementasi adalah HTTP polling ke Azure Function, BUKAN MQTT direct. Nama baru akurat.
**Perubahan API**:
- `mqttConnected` → `isConnected`
- `connectMQTT` → `startPolling`
- `disconnectMQTT` → `stopPolling`

### Decision #6: IR Control tanpa KY-022 (2026-04-26)
**Keputusan**: ESP32 cukup gunakan KY-005 (IR transmitter) saja, tanpa KY-022 (IR receiver).
**Alasan**: Kode IR AC Gree sudah di-hardcode atau pre-captured di flash. KY-022 hanya dibutuhkan untuk capture kode baru di field.
**Implementasi**: Kode IR Gree YBOFB hardcoded langsung di `main.cpp`, tidak perlu capture runtime.

---

## 5. Yang Dikerjakan Session 2026-04-26

### useMQTT → useAzureTelemetry

- Rename `useMQTT.js` → `useAzureTelemetry.js`
- Rename `useMQTT.test.js` → `useAzureTelemetry.test.js`
- Sinkronisasi test mock: axios → fetch
- Update semua reference di `DashboardHome.vue` dan `AdminDashboard.vue`
- 113 test PASS, build `✓ built in 15.07s`

### Digital Twin Reports (Per Jobdesk)

- `docs/reports/JD_ML_ENGINE.md` — ML Engine
- `docs/reports/JD_CLOUD_ENGINE.md` — Cloud Engine (Azure)
- `docs/reports/JD_WEBSITE.md` — Software/Website (Frontend)
- `docs/reports/JD_IOT_HARDWARE.md` — IoT/Hardware
- `docs/reports/JD_3D_DESIGN.md` — 3D Design
- `docs/reports/DIGITAL_TWIN_REPORT_SUMMARY.md` — Summary + arsitektur

### IR Hardware Decision

- KY-005 cukup untuk kirim command AC (tanpa KY-022)
- Kode IR Gree hardcoded di `main.cpp`
- Opsional: KY-022 hanya untuk capture remote baru di field

### Git Push

- Commit `65ca26a` — feat: rename useMQTT to useAzureTelemetry and add per-jobdesk Digital Twin reports
- Exclude: CLAUDE.md, MEMORY/, ANALYSIS dan PROMPT/

---

## 6. Next Steps

### Segera (1-2 sesi)
1. 🔴 Azure Digital Twins instance + twin graph (Cloud Engine)
2. 🔴 SendCommandToDevice function — C2D pipeline (Cloud Engine)
3. 🔴 ACRecommendation apply button → command (Website)
4. 🔴 Reactive 3D temperature materials (3D Design)
5. 🔴 Occupancy feedback loop ESP32 ← cloud (IoT Hardware)

### Bulan Ini
1. Control orchestration Logic App (Cloud Engine)
2. AC unit animations (fan spin, glow, cold air particles) (3D Design)
3. Simulation engine what-if scenario (ML Engine)
4. Schema validation dengan Zod (Website)

### Rencana 30-90 Hari
1. Bidirectional sync — cloud → ESP32 command end-to-end
2. Multi-actuator control (light, blind, fan)
3. OTA firmware update
4. ML drift monitoring
5. Real-time SignalR connection
6. E2E test lintas modul

---

*Generated: 2026-04-26, Updated: 2026-04-27*

---

## 7. Session 2026-04-27 Update

### Yang Dikerjakan

1. **CesiumViewer.vue Upgrade**
   - Update untuk Google Photorealistic 3D Tiles
   - Tambahkan Google Maps API key: `AIzaSyBlQk4kTmrf-yWcM1wrLwSGlyxRvVqPP3M`
   - Ganti Cesium Ion token

2. **GEE Server Creation**
   - Buat `ml_models/gee_server.py` - Flask server untuk Google Earth Engine
   - Endpoints: NDVI, Landsat, terrain, analysis
   - Lokasi fokus: -7.722649267245097, 110.51904046867396 (Yogyakarta)

3. **CesiumViewer Simplification**
   - Hapus semua imagery layer lain (OSM, ArcGIS, Ion Terrain, OSM Buildings)
   - Fokus ONLY pada Google Photorealistic 3D Tiles

### Bug yang Ditemukan

| Bug | Error | Solution |
|-----|-------|----------|
| CORS Error | `getDerivedResource` undefined | Hapus OpenStreetMap/ArcGIS |
| 400 Bad Request | OSM tile fails | Ganti dengan Google 3D Tiles |
| Rendering stopped | Cesium internal error | Fokus pada Google Photorealistic saja |

### Decision #7: Google Photorealistic 3D Tiles Only

**Keputusan**: CesiumViewer HANYA load Google Photorealistic 3D Tiles, tidak ada imagery lain.

```javascript
const googleTileset = await Cesium.createGooglePhotorealistic3DTileset({
  accessKey: 'AIzaSyBlQk4kTmrf-yWcM1wrLwSGlyxRvVqPP3M'
})
```

### Decision #8: Deck.gl vs Cesium.js

- **Cesium.js** dipilih untuk project ini karena 3D globe + IoT markers
- Deck.gl lebih untuk data science dashboards

### Files Changed

| File | Action |
|------|--------|
| `view_virtual/src/components/CesiumViewer.vue` | Update - Google 3D Tiles |
| `ml_models/gee_server.py` | Create - GEE Flask server |
| `ml_models/requirements.txt` | Update - earthengine-api, flask |
| `MEMORY/progress.md` | Update - session progress |
| `MEMORY/decisions.md` | Update - new decisions |

### Status

- CesiumViewer: Disimplify untuk Google Photorealistic 3D Tiles
- GEE Server: Siap untuk deployment (butuh `earthengine authenticate`)
- CORS Error: Resolved dengan menghapus semua imagery lain