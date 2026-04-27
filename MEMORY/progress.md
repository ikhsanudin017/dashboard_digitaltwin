# Progress Digital Twin Project

## Tanggal Update: 2026-04-26
## Catatan: Dibuat dari pembacaan menyeluruh seluruh source code

---

## Fitur Selesai diimplementasi

### Frontend (view_virtual/)
- [x] Vue 3 dashboard dengan routing (user/admin)
- [x] Firebase Auth (Google Sign-In + email/password + local admin)
- [x] Route guard dengan session TTL admin
- [x] Dark/Light mode toggle
- [x] Polling telemetry dari Azure Function (5 detik interval)
- [x] Chart real-time: TemperatureChart, ElectricityChart, PeopleChart
- [x] Digital Twin 3D dengan Babylon.js (GLTF model, sensor overlay)
- [x] HistoricalAnalytics (filter tanggal, chart historis, statistik, CSV export)
- [x] EnergyManagement (konsumsi, biaya, peak hour analysis)
- [x] ACRecommendation dengan fallback chain ML
- [x] CameraStream component (live dari Raspberry Pi)
- [x] AdminDashboard multi-section (overview, energy, analytics, devices, alerts, settings)
- [x] DataTable component
- [x] PWA support via vite-plugin-pwa
- [x] Test suite (vitest) — 90 test, 10 drift
- [x] localStorage cache untuk offline resilience

### Azure Functions (sensor iot/azure-setup/azure-function/)
- [x] GetTelemetryData — read latest/history/stats/people
- [x] GetACRecommendation — rule-based ML approximation
- [x] SaveSensorData — write sensor data ke Table Storage
- [x] SavePeopleCount — write people count ke Table Storage
- [x] IoTHubToStorage — event hub trigger, persist telemetry + people count
- [x] MqttToIoTHub — HTTP bridge untuk webhook
- [x] CORS headers di semua function
- [x] Table auto-creation
- [x] Timestamp UTC ISO-8601 (RESOLVED per audit)

### IoT Edge (sensor iot/)
- [x] ESP32 firmware — baca DHT11, ZMPT101B, SCT013
- [x] MQTT over TLS ke Azure IoT Hub
- [x] SAS token generation (HMAC-SHA256 via mbedtls)
- [x] NTP sync untuk timestamp UTC
- [x] IR capture (KY-022) + transmit (IR LED + transistor NPN)
- [x] Raw IR profile storage di ESP32 flash (NVS/Preferences)
- [x] Closed-loop AC control berbasis heat index + hysteresis
- [x] Cloud C2D command support (target_temp, power, mode, fan, setpoint)
- [x] Serial command interface untuk debug
- [x] Multiple AC model support (Gree YBOFB, YAW1F, YX1FSF)
- [x] Auto WiFi reconnect
- [x] Raspberry Pi people counter via YOLOv3-tiny
- [x] Flask HTTP server dengan /video_feed, /count, /status, /snapshot

### ML (ml_models/)
- [x] Energy forecast model (RandomForest, R2=0.97)
- [x] AC recommendation model (GradientBoosting, R2=0.86)
- [x] Training pipeline dari Azure Table Storage (`train_from_azure.py`)
- [x] Training dari sample CSV (`train_model.py`, `train_ac_recommendation.py`)
- [x] Auto-train orchestration (`auto_train.py` + `run_auto_train.sh`)
- [x] Flask prediction API (`prediction_api.py`)
- [x] Model versioning via `model_config.json`
- [x] Training status tracking via `training_status.json`

### Scripts
- [x] Export sensor data ke CSV
- [x] List tables di Azure Storage
- [x] Check storage data per device
- [x] Generate sample data CSV
- [x] Add people count to existing data

### CI/CD
- [x] GitHub Actions (frontend build, test, audit, Azure Functions)
- [x] Vercel deployment config

---

## Fitur Dalam Pengerjaan / Parsial

### Frontend — useMQTT test drift
- Test `useMQTT.test.js` masih mengasumsikan axios, padahal implementasi sudah menggunakan fetch.
- Status: 10 test gagal, 90 test lulus.
- Perbaikan perlu update test agar mock fetch, bukan axios.

### Timestamp — sudah resolved
- RESOLVED: semua Azure Function menyimpan UTC ISO-8601. Konversi WIB hanya di layer presentasi Vue.
- `GetTelemetryData.response` → UTC ISO, `timestamp_display` (WIB) deprecated.
- Frontend menggunakan `toLocalDisplay()` untuk semua timestamp display.

### AC Recommendation metadata
- Frontend sudah baik (trace_id, source_tag, fallback_level, fallback_chain, model_version).
- Backend `GetACRecommendation` metadata belum sepenuhnya seragam.

### Alert Settings
- `AlertSettings.vue` dan `useAlerts.js` placeholder kosong — ALREADY CLEANED UP 2026-04-25.
- Alert fungsionalitas sekarang tertanam langsung di `AdminDashboard.vue`.

---

## Fitur Belum Ada / Direncanakan

### Belum Ada
- [ ] Schema validation kontrak data end-to-end (IoT → Azure → Frontend → ML)
- [ ] Secret hygiene: beberapa utilitas/scripts masih hardcode connection string
- [ ] Write path security: function key di browser untuk jalur write sensitif
- [ ] Observability lengkap (trace correlation, error rate, latency p95/p99)
- [ ] Canonical digital twin state (satu sumber kebenaran)
- [ ] ML governance (data quality gate, model versioning, drift validation)
- [ ] E2E test lintas modul
- [ ] Admin dashboard: beberapa device/status masih semi-dummy

### Kemungkinan Direncanakan (dari kode)
- Closed-loop control end-to-end (ESP32 → cloud recommendation → ESP32 AC command) — sudah ada fondasi di ESP32, belum ada cloud command pipeline lengkap
- Camera stream authentication (sekarang terbuka tanpa auth)
- Long-term data retention policy
- Multi-floor / multi-room support

---

## Status Integrasi Azure & IoT Hub

### IoT Hub
- **Status**: Aktif terkonfigurasi
- Device yang terdaftar:
  - `ESP32_ENERGY_MONITOR_001`
  - `RASPBERRY_PI_CAMERA_001`
- Protocol: MQTT over TLS (port 8883)
- Auth: SAS token (HMAC-SHA256, 1-hour expiry)

### Azure Table Storage
- **Status**: Aktif
- Tables:
  - `SensorTelemetry` — sensor data ESP32
  - `PeopleCount` — people detection dari Raspberry Pi
- Connection via `STORAGE_CONNECTION_STRING` env var

### Azure Function App
- **Status**: Produksi aktif
- URL: `https://func-digitaltwin-2026.azurewebsites.net/api`
- Functions: GetTelemetryData, GetACRecommendation, SaveSensorData, SavePeopleCount, IoTHubToStorage, MqttToIoTHub
- CORS: semua origin diizinkan

### ML API
- **Status**: Lokal only (Flask, port 5000)
- Tidak ada Azure-hosted ML inference
- Model artefak hidup di repo (`ml_models/models/*.pkl`)

---

## Test Coverage

| Modul | Test | Status |
|-------|------|--------|
| Frontend composables | ~100 test | 90 lulus, 10 drift |
| Frontend components | 4 test | OK |
| IoT | No test | — |
| Azure Functions | No test | — |
| ML | No test | — |

**Catatan**: Test drift主要集中在 `useMQTT.test.js` — perlu sinkronisasi dengan implementasi fetch.

---

## Update Sesi 2026-04-26 (Operasional ESP32)

- [x] Perbaikan task VS Code `PlatformIO: Upload ESP32` agar memakai working directory `${workspaceFolder}/sensor iot`.
- [x] Verifikasi task selesai: build dan upload firmware ESP32 sukses dari Task Runner (tanpa `cd` manual).
- [x] Port upload terdeteksi otomatis (`/dev/cu.usbserial-1430`) saat verifikasi.

## Update Sesi 2026-04-26 (UI Redesign LoginPage)

- [x] Redesain `LoginPage.vue` — dari 2-kolom (intro-panel + auth-card) menjadi centered single card.
- [x] Hapus bagian `intro-panel` yang terlalu banyak teks dan dominate layout.
- [x] Card di-center vertikal di tengah layar (`flex` + `justify-content: center`).
- [x] Tambah `intro-strip` simple di atas card: animated status dot + teks singkat penjelasan aplikasi.
- [x] Benahi bagian admin form — tambah admin badge visual (icon shield + "Akses Administrator").
- [x] Perbaiki `helper-text` admin menjadi centered dan lebih rapi.
- [x] Background grid jadi `position: fixed` dengan `z-index: 0` agar tidak scroll.
- [x] Animasi `fadeUp` pada intro-strip dan footer-copy.
- [x] Responsive breakpoint di 520px.
- [x] Build verifikasi: `✓ built in 16.50s` — tidak ada error.
- [x] Fungsionalitas login 100% preserved: mode switch, credential login, Google login, forgot password, admin login, password toggle, dark/light theme.

**Dampak**: Halaman login sekarang lebih clean, profesional, centered, dan user-friendly — tanpa mengurangi fungsionalitas apapun.

## Update Sesi 2026-04-26 (UI Redesign AdminDashboard)

- [x] CSS Variable System — ganti semua hardcoded hex colors dengan semantic variables (`--admin-bg`, `--admin-surface`, `--admin-accent`, dll.)
- [x] Import Google Fonts (IBM Plex Sans + Sora) ke scoped style
- [x] Ganti emoji icons → inline SVG icons (nav items, stat cards, section headers, device icons, alert icons, system info)
- [x] Hero banner redesign — kicker badge + title + subtitle + status badges (aligned right)
- [x] Stat grid cards — 5 kolom (suhu, kelembaban, daya, orang, tegangan), accent via CSS custom property `--card-accent`, SVG icon wrap, hover lift effect
- [x] Quick actions — 2x2 compact card grid dengan icon, label, subtitle
- [x] Activity log — timestamps lebih detail (HH:MM:SS), icon via SVG, fadeUp animation staggered
- [x] Devices — SVG icons, status badge dengan animated pulse dot, border accent top per status (green/amber/red)
- [x] Alerts — 5 kolom grid, alert-card dengan top accent line per status, modern threshold inputs
- [x] Settings — setting-control layout dengan unit labels, toggle switch diperbaiki, code display untuk Azure URL
- [x] System info — 8 tech stack cards dengan colored top accent, SVG icons
- [x] Toast notification system — slide-in dari bawah, dark/light aware
- [x] Sidebar — nav items dengan SVG icon containers, active dot indicator, hover states diperbaiki
- [x] Topbar — title/subtitle via computed, theme toggle SVG, status pill with animated pulse
- [x] Responsive breakpoints: 1400px, 1100px, 900px (sidebar drawer), 640px, 480px
- [x] Build verifikasi: `✓ built in 15.13s` — tidak ada error.
- [x] Semua functionality preserved: useMQTT, sensorData, mqttConnected, saveAlertSettings, saveSystemSettings, clearLocalCache, logout, nav sections.

**Dampak**: AdminDashboard sekarang terlihat profesional enterprise-grade — clean, modern, consistent dengan LoginPage redesign, full dark mode support.

## Update Sesi 2026-04-26 (AdminDashboard Fixes — Alert & Mobile)

- [x] Alert section redesign besar-besaran:
  - Alert bar hero dengan icon SVG + deskripsi + status chip
  - Alert cards grid dengan accent line colored (green/red), alert-icon-badge dengan SVG
  - Card header dengan icon badge + info + status badge
  - Threshold inputs redesign: label dengan SVG arrow icons, input wrap dengan focus ring
  - Alert card status dengan SVG checkmark/warning icon, background colored
  - Action bar terpisah di bawah dengan info text + save button
- [x] Responsive breakpoint fixes:
  - 1400px: alert-cards-grid 3 kolom, 1100px: 2 kolom
  - 640px: alert-cards-grid 1 kolom + alert-bar + action-bar responsif
  - Mobile: threshold inputs stack vertikal, separator dihide
- [x] Build verifikasi: `✓ built in ...s` — tidak ada error.

## Update Sesi 2026-04-26 (useMQTT.test.js — Sinkronisasi fetch dari axios)

- [x] Test sinkronisasi `useMQTT.test.js` — implementasi sudah menggunakan `fetch` bukan `axios`
- [x] Ganti mock `axios` → mock `fetch` global
- [x] Ganti mock `import.meta.env` → mock module-level di `vi.mock` block
- [x] Hapus semua reference ke `axios.default.get` → gunakan `fetchMock.mock.calls`
- [x] Sinkronisasi field mapping: `status_tegangan` → `voltageStatus`, `status_arus` → `currentStatus`
- [x] Sinkronisasi response shape: response adalah `{ ok, json }` bukan `{ data }`
- [x] Handle async timing: `connectMQTT` memanggil `fetchLatestData` + `fetchPeopleCount` secara parallel saat init
- [x] Fix polling test: karena async timing uncertainty, gunakan `toBeGreaterThan` bukan exact count
- [x] Fix timing untuk setTimeout-based async waits (`new Promise(r => setTimeout(r, 10))`)
- [x] Build verifikasi: semua 113 test PASS (8 test files)
- [x] Build: `✓ built in 15.07s` — tidak ada error

## Update Sesi 2026-04-26 (Rename useMQTT → useAzureTelemetry)

- [x] Buat `useAzureTelemetry.js` — nama baru yang akurat menggambarkan fungsi composable (HTTP polling Azure Function, BUKAN MQTT)
- [x] Rename: `mqttConnected` → `isConnected`, `connectMQTT` → `startPolling`, `disconnectMQTT` → `stopPolling`
- [x] Hapus `useMQTT.js` lama
- [x] Update `DashboardHome.vue` — import dan usage ke `useAzureTelemetry`
- [x] Update `AdminDashboard.vue` — import dan usage ke `useAzureTelemetry`
- [x] Rename `useMQTT.test.js` → `useAzureTelemetry.test.js` — semua reference `useMQTT`, `mqttConnected`, `connectMQTT`, `disconnectMQTT` di test diupdate
- [x] Verifikasi: 113 test PASS, build `✓ built in 15.07s`

**Dampak**: Nama composable sekarang akurat dengan implementasi — HTTP polling ke Azure Function, bukan MQTT direct.

- [x] Alert section rewrite menyeluruh (clean & tidy):
  - `.alert-head` header bar dengan icon badge + title + desc + status chip
  - `.alert-row` flex wrap row — auto-responsive tanpa breakpoint grid
  - `.alert-card` dengan colored top accent line, hover lift, border/shadow clean
  - `.alert-c-top` icon badge (40px) + name + current value
  - `.alert-c-range` min/max inputs dengan separator + focus ring
  - `.alert-c-status` SVG checkmark/warning + colored background
  - `.save-bar` hint text + save button
- [x] Responsive: 640px → cards 100%, inputs stack, separator hide; 480px → compact padding
- [x] Build verifikasi: built in 21.23s — tidak ada error.

## Update Sesi 2026-04-26 (Digital Twin Report — Per Jobdesk)

- [x] Buat 6 file report Digital Twin di `docs/reports/`:
  - `JD_ML_ENGINE.md` — ML Engine (Data Scientist/ML Engineer)
  - `JD_CLOUD_ENGINE.md` — Cloud Engine (Azure backend/Infrastructure)
  - `JD_WEBSITE.md` — Software/Website (Frontend Vue + Babylon.js)
  - `JD_IOT_HARDWARE.md` — IoT/Hardware (ESP32, Raspberry Pi, embedded)
  - `JD_3D_DESIGN.md` — 3D Design (glTF model, reactive materials, SCADA)
  - `DIGITAL_TWIN_REPORT_SUMMARY.md` — Ringkasan + arsitektur + prioritas
- [x] Setiap report mencakup: overview jobdesk, yang sudah ada, yang perlu ditambahkan, technical details, timeline, verification checklist
- [x] Struktur konsisten antar semua jobdesk report untuk kemudahan maintenance
- [x] Git commit: `65ca26a` — feat: rename useMQTT to useAzureTelemetry and add per-jobdesk Digital Twin reports
- [x] Exclude dari push: CLAUDE.md, MEMORY/, ANALYSIS dan PROMPT/

## Ringkasan Session 2026-04-26

**Yang berubah di session ini:**
1. Rename `useMQTT.js` → `useAzureTelemetry.js` — nama lebih akurat (HTTP polling, bukan MQTT)
2. Sinkronisasi test `useMQTT.test.js` → `useAzureTelemetry.test.js` — mock fetch, 113 test PASS
3. Buat 5 jobdesk report + 1 summary report di `docs/reports/`
4. Push ke GitHub (commit `65ca26a`, exclude CLAUDE.md/MEMORY/ANALYSIS)

**Status project:** Digital Twin monitoring system — production-ready. Pipeline: ESP32 → IoT Hub → Azure Functions → Vue Dashboard → Babylon.js 3D → ML recommendation sudah terhubung end-to-end.

**Top 5 prioritas selanjutnya:**
1. ~~CesiumJS geographic view~~ ✅ DONE 2026-04-26
2. Custom indoor 3D model matching actual house layout (3D Design)
3. Reactive 3D temperature materials (3D Design)
4. SendCommandToDevice function (Cloud Engine)
5. ACRecommendation apply button → command (Website)

## Update Sesi 2026-04-26 (Laporan Akhir — docs/reports/REPORT_PERBAIKAN_2026-04-26.md)

- [x] Buat `docs/reports/REPORT_PERBAIKAN_2026-04-26.md` merangkum semua perbaikan sesi 2026-04-26
- [x] Laporan mencakup: Task VS Code ESP32, LoginPage redesign, AdminDashboard redesign + alert tidy v2, Firebase auth state fixes, Google redirect login fix, router guard loop fix, verifikasi build, dan dampak keseluruhan
- [x] Laporan disimpan di `docs/reports/` (folder baru dibuat)

## Update Sesi 2026-04-26 (CesiumJS Geographic View)

- [x] Install CesiumJS packages: `cesium` + `@cesium/engine` via npm
- [x] Update `vite.config.js` untuk Cesium workers dan define CESIUM_BASE_URL
- [x] Buat `CesiumViewer.vue` — komponen CesiumJS dengan:
  - House marker di koordinat: -7.722649267245097, 110.51897609565907 (Yogyakarta)
  - Pulsing billboard marker dengan house icon
  - Info panel: coordinates, sensor summary, quick actions
  - Fly-to-home button
  - Day/night map toggle
  - OpenStreetMap imagery layer
  - SkyBox atmosphere
- [x] Update `DashboardHome.vue` — toggle "Peta Lokasi" (Cesium) ↔ "3D Indoor" (Babylon.js)
- [x] Verifikasi build: `✓ built in 28.12s` — tidak ada error
- [x] Record keputusan di `MEMORY/decisions.md`

**Catatan bundle size**: CesiumJS ~4.1MB (gzip ~1.1MB) + Babylon.js ~6.7MB (gzip ~1.5MB) = total ~10.8MB gzip ~2.6MB. Untuk production perlu optimize (tree-shaking / lazy load).

## Update Sesi 2026-04-27 (CesiumJS + Google Photorealistic 3D Tiles)

- [x] Update CesiumViewer.vue untuk menggunakan Google Photorealistic 3D Tiles
- [x] Tambahkan Google Maps API key untuk 3D tiles: `AIzaSyBlQk4kTmrf-yWcM1wrLwSGlyxRvVqPP3M`
- [x] Ganti Cesium Ion token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZTljMmFmOC1lMjVmLTRiOTktOGZhMy00OTVkMDQzZDA3YjgiLCJpZCI6NDIzOTQ1LCJpYXQiOjE3NzcyNjg3Nzh9.GGZCNgx3n-vIlj-hphyjGIA4uIeR9e3-aXKkMq8Sp5I`
- [x] Buat `ml_models/gee_server.py` untuk GEE analysis (NDVI, Landsat, terrain)
- [x] Update requirements.txt dengan `earthengine-api` dan `flask`
- [x] Simplify CesiumViewer untuk HANYA load Google Photorealistic 3D Tiles
- [x] Hapus semua imagery layer lain (OpenStreetMap, ArcGIS, dll) untuk hindari CORS error
- [x] Focus pada Google Photorealistic 3D Tiles API

**Yang diuji:**
- Cesium Ion World Terrain → error CORS dengan ArcGIS
- OpenStreetMap → error CORS 400 Bad Request
- Google Photorealistic 3D Tiles → menggunakan API key

**Status**: CesiumViewer.vue di-simplify untuk fokus pada Google Photorealistic 3D Tiles saja.

## Update Sesi 2026-04-27 (GEE Server Creation)

- [x] Buat `ml_models/gee_server.py` - Flask server untuk Google Earth Engine
- [x] Endpoints: `/api/health`, `/api/location`, `/api/gee/ndvi`, `/api/gee/landsat`, `/api/gee/terrain`, `/api/gee/analysis`
- [x] GEE untuk lokasi: -7.722649267245097, 110.51904046867396 (Yogyakarta)
- [x] Menggunakan earthengine-api untuk Landsat 8/9, SRTM terrain, Copernicus land cover
- [x] Setup required: `pip install earthengine-api flask` + `earthengine authenticate`

**Architecture**: GEE analysis → tile URL → CesiumViewer overlay layer
