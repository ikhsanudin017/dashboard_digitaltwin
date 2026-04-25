# CONTEXT

Dokumen ini merangkum konteks teknis codebase `dashboard_digitaltwin` agar onboarding, audit, handoff, dan pengembangan lanjutan bisa dilakukan lebih cepat.

## 1. Ringkasan Sistem

Repo ini bukan satu aplikasi tunggal, tetapi satu ekosistem digital twin untuk monitoring energi ruangan:

- `view_virtual/`: frontend dashboard Vue 3 + Vite + Babylon.js + Firebase Auth.
- `sensor iot/`: firmware ESP32, people counter Raspberry Pi, dan Azure Functions untuk ingestion/API.
- `ml_models/`: training, inferensi, dan auto-training model prediksi energi dan rekomendasi AC.
- `scripts/`: utilitas data Azure Storage, export CSV, dan sample data generator.
- `docs/`: laporan audit, planning, dan referensi.
- `local_data/`: artefak lokal seperti Azurite.

Tujuan produk:

- memantau suhu, kelembaban, tegangan, arus, dan daya;
- memantau jumlah orang dari kamera;
- menampilkan data real-time dan historis;
- memberi rekomendasi suhu AC berbasis ML/rule;
- menyediakan panel admin dan fondasi untuk pengembangan closed-loop control di masa depan.

## 2. Arsitektur Sistem Secara Keseluruhan

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           EDGE / DEVICE                            │
├─────────────────────────────────────────────────────────────────────┤
│ ESP32                                                              │
│ - baca DHT11, ZMPT101B, SCT013                                     │
│ - kirim telemetry ke Azure IoT Hub via MQTT over TLS               │
│                                                                     │
│ Raspberry Pi                                                        │
│ - webcam + YOLO / face detection                                    │
│ - publish people count ke Azure IoT Hub                             │
│ - expose local stream /count /status /snapshot                      │
└─────────────────────────────────────────────────────────────────────┘
                                 |
                                 v
┌─────────────────────────────────────────────────────────────────────┐
│                           CLOUD / BACKEND                           │
├─────────────────────────────────────────────────────────────────────┤
│ Azure IoT Hub                                                       │
│ - menerima event dari ESP32 / Raspberry Pi                          │
│                                                                     │
│ Azure Functions                                                     │
│ - IoTHubToStorage: simpan event ke Table Storage                    │
│ - GetTelemetryData: API read telemetry / history / people           │
│ - GetACRecommendation: API rekomendasi AC                           │
│ - SaveSensorData / SavePeopleCount: write endpoint                  │
│ - MqttToIoTHub: bridge HTTP -> Storage                              │
│                                                                     │
│ Azure Table Storage                                                 │
│ - SensorTelemetry                                                   │
│ - PeopleCount                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 |
                                 v
┌─────────────────────────────────────────────────────────────────────┐
│                       FRONTEND / APPLICATION                         │
├─────────────────────────────────────────────────────────────────────┤
│ Vue Dashboard                                                       │
│ - login user/admin via Firebase                                     │
│ - polling Azure Function untuk telemetry                            │
│ - chart real-time dan historis                                      │
│ - digital twin 3D Babylon.js                                        │
│ - rekomendasi AC dengan fallback chain                              │
│ - panel admin dan energy analytics                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 |
                                 v
┌─────────────────────────────────────────────────────────────────────┐
│                              ML LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│ Python ML                                                           │
│ - train dari sample CSV atau Azure Table Storage                    │
│ - serve prediksi lokal via Flask                                    │
│ - auto-train dan model metadata                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Modul Utama dan Tanggung Jawabnya

### 3.1 Root / Infrastruktur Repo

File penting:

- `README.md`
  - gambaran produk, arsitektur tinggi, dan quick start lintas modul.
- `package.json`
  - dependency root untuk script utilitas Azure Table Storage.
- `vercel.json`
  - build frontend dari folder `view_virtual/` untuk deployment Vercel.
- `azure-pipelines.yml`
  - pipeline Azure DevOps lama; saat ini masih build dari root dan belum sepenuhnya sinkron dengan struktur repo sekarang.
- `.github/workflows/ci.yml`
  - CI GitHub Actions yang lebih modern; build/test frontend, audit dependency, dan build Azure Functions.
- `.gitignore`
  - ignore artefak lokal, env file, secret header, Azurite, dan beberapa folder generated.

### 3.2 Frontend `view_virtual/`

#### File aplikasi inti

- `view_virtual/package.json`
  - script utama frontend: `dev`, `build`, `test`, `test:run`, `test:coverage`.
- `view_virtual/src/main.js`
  - bootstrap Vue app dan router.
- `view_virtual/src/App.vue`
  - shell utama aplikasi.
  - menentukan apakah user melihat login user, login admin, dashboard user, atau dashboard admin.
  - mengelola theme dark/light dan session TTL admin.
- `view_virtual/src/router/index.js`
  - route guard.
  - memastikan user login, admin login via jalur yang benar, dan admin session masih aktif.
- `view_virtual/src/style.css`
  - styling global aplikasi.
- `view_virtual/src/lib/appConfig.js`
  - sumber config URL utama:
    - Azure Function URL
    - write key Azure Function
    - fallback API base
    - ML API lokal
- `view_virtual/src/lib/firebase.js`
  - inisialisasi Firebase Auth.
- `view_virtual/src/lib/adminSession.js`
  - session admin berbasis `sessionStorage`.

#### Composables utama

- `view_virtual/src/composables/useFirebaseAuth.js`
  - login Google.
  - login email/password.
  - reset password.
  - validasi role admin dari custom claims atau allowlist email.
- `view_virtual/src/composables/useMQTT.js`
  - nama historis.
  - implementasi aktual sekarang adalah polling Azure Function, bukan koneksi MQTT browser langsung.
  - memuat latest telemetry, latest people count, local cache, dan write people count.
- `view_virtual/src/composables/useHistoricalData.js`
  - shared store historis lintas komponen.
  - load dari Azure Function atau cache lokal.
  - agregasi hourly/daily/weekly, export CSV, dan statistik data.
- `view_virtual/src/composables/useMLPrediction.js`
  - fallback chain prediksi:
    1. Azure Function
    2. ML API lokal
    3. local calculation
  - menghasilkan metadata `trace_id`, `source_tag`, `fallback_level`.
- `view_virtual/src/composables/useEnergyManagement.js`
  - hitung konsumsi energi, biaya, peak hour analysis, dan rekomendasi efisiensi.
- `view_virtual/src/composables/useAPI.js`
  - helper data historis lama.
  - masih dipakai untuk fetch chart dummy/fallback, tetapi peran utamanya sudah mulai tergeser oleh `useHistoricalData.js`.
- `view_virtual/src/composables/useAlerts.js`
  - placeholder kosong, belum diimplementasikan.

#### Komponen user-facing utama

- `view_virtual/src/components/LoginPage.vue`
  - UI login user/admin dengan mode switch dan theme toggle.
- `view_virtual/src/components/DashboardHome.vue`
  - dashboard user utama.
  - menghubungkan telemetry real-time, chart, people count, historical analytics, dan AC recommendation.
- `view_virtual/src/components/AdminDashboard.vue`
  - dashboard admin multi-section:
    - overview
    - energy
    - analytics
    - devices
    - alerts
    - settings
- `view_virtual/src/components/DigitalTwin3D_Babylon.vue`
  - render model 3D GLTF ruangan via Babylon.js.
  - menampilkan status sensor dan interaksi mesh/popup.
- `view_virtual/src/components/ACRecommendation.vue`
  - panel rekomendasi AC.
  - memanggil prediksi ML dan fallback Azure Function.
- `view_virtual/src/components/HistoricalAnalytics.vue`
  - filter tanggal, chart historis, statistik, preview tabel, export CSV.
- `view_virtual/src/components/EnergyManagement.vue`
  - analisis biaya energi, proyeksi konsumsi, peak usage, rekomendasi hemat.
- `view_virtual/src/components/CameraStream.vue`
  - menampilkan live stream dari Raspberry Pi dan polling count endpoint lokal.
- `view_virtual/src/components/DataTable.vue`
  - tampilan ringkas data sensor saat ini.
- `view_virtual/src/components/TemperatureChart.vue`
- `view_virtual/src/components/ElectricityChart.vue`
- `view_virtual/src/components/PeopleChart.vue`
  - komponen chart presentasional.
- `view_virtual/src/components/SensorStatus.vue`
  - kartu status sensor.
- `view_virtual/src/components/EmptyState.vue`
  - empty state reusable.
- `view_virtual/src/components/DigitalTwin3D.vue`
  - wrapper / placeholder tipis untuk komponen 3D.

#### Testing dan build frontend

- `view_virtual/vite.config.js`
  - konfigurasi Vite + PWA.
  - build chunk cukup besar karena modul 3D/Babylon.
- `view_virtual/vitest.config.js`
  - konfigurasi test frontend.
- `view_virtual/src/components/__tests__/...`
  - test chart dan komponen UI.
- `view_virtual/src/composables/__tests__/...`
  - test composables.
  - `useMQTT.test.js` saat ini drift terhadap implementasi aktual karena masih mengasumsikan `axios`.

### 3.3 Azure Functions `sensor iot/azure-setup/azure-function/`

#### Endpoint read / API

- `GetTelemetryData/index.js`
  - read endpoint untuk:
    - `latest`
    - `history`
    - `stats`
    - `people`
  - sumber data: Azure Table Storage.
  - saat ini masih mengonversi sebagian timestamp ke format `WIB`.
- `GetTelemetryData/function.json`
  - HTTP trigger `anonymous` untuk route `telemetry/{action?}`.

- `GetACRecommendation/index.js`
  - rekomendasi AC berbasis rule yang mewakili model terlatih secara aproksimasi.
  - action:
    - `recommend`
    - `latest-with-recommendation`
- `GetACRecommendation/function.json`
  - HTTP trigger `anonymous` untuk route `ac-recommendation/{action}`.

#### Endpoint write / ingestion tambahan

- `SaveSensorData/index.js`
  - simpan sensor data ke `SensorTelemetry`.
  - diproteksi auth level `function`.
  - masih menerima/simpan timestamp lokal `WIB` bila tidak disuplai.
- `SaveSensorData/function.json`
  - route `sensor/save`.

- `SavePeopleCount/index.js`
  - simpan people count ke `PeopleCount`.
  - diproteksi auth level `function`.
  - dipanggil frontend dan/atau kamera.
- `SavePeopleCount/function.json`
  - route `people/save`.

#### Event-driven ingestion

- `IoTHubToStorage/index.js`
  - event hub trigger dari Azure IoT Hub.
  - memisahkan:
    - sensor telemetry -> `SensorTelemetry`
    - people count -> `PeopleCount`
- `IoTHubToStorage/function.json`
  - eventHubTrigger.

- `MqttToIoTHub/index.js`
  - bridge HTTP -> Storage untuk payload yang datang dari jalur MQTT/HiveMQ/webhook.
  - lebih mirip bridge / ingestion helper daripada adapter IoT Hub penuh.
- `MqttToIoTHub/function.json`
  - auth level `function`.

- `host.json`
  - config host Azure Functions.
- `package.json`
  - dependency Node backend functions.

### 3.4 IoT Edge `sensor iot/`

#### ESP32

- `sensor iot/src/main.cpp`
  - firmware utama ESP32.
  - baca:
    - DHT11
    - ZMPT101B
    - SCT013
  - generate SAS token.
  - konek WiFi dan Azure IoT Hub via MQTT over TLS.
  - kirim payload sensor periodik setiap 5 detik.
  - sudah memakai timestamp UTC ISO.
- `sensor iot/include/secrets.example.h`
  - template secret header untuk WiFi dan Azure IoT Hub.
- `sensor iot/include/secrets.h`
  - file lokal nyata untuk compile; seharusnya tidak di-commit.
- `sensor iot/platformio.ini`
  - konfigurasi build/upload PlatformIO.

#### Raspberry Pi people counter

- `sensor iot/raspberry-pi/people_counter_yolo.py`
  - aplikasi webcam + YOLO + face detection.
  - expose HTTP lokal:
    - `/video_feed`
    - `/count`
    - `/status`
    - `/snapshot`
  - publish people count ke Azure IoT Hub.
  - stream layer dan detection layer berjalan dalam proses yang sama.
- `sensor iot/raspberry-pi/download_yolo.py`
  - helper download model YOLO.
- `sensor iot/raspberry-pi/test_camera_connection.py`
  - helper test kamera.
- `sensor iot/raspberry-pi/README.md`
  - setup people counter.
- `sensor iot/raspberry-pi/SETUP_YOLO.md`
  - langkah setup YOLO.
- `sensor iot/raspberry-pi/TROUBLESHOOTING_CAMERA.md`
  - troubleshooting kamera dan stream.
- `sensor iot/raspberry-pi/requirements.txt`
  - dependency Python Raspberry Pi.

#### Azure setup non-code

- `sensor iot/azure-setup/README.md`
  - dokumentasi setup resource Azure.
- `sensor iot/azure-setup/.env.template`
  - template env Azure resource.
- `sensor iot/azure-setup/iot_hub_config.txt`
  - catatan config IoT Hub.

### 3.5 ML `ml_models/`

#### Training

- `ml_models/train_model.py`
  - training energy forecast model dari sample CSV lokal.
  - saat ini masih mengacu ke file sample statis.
- `ml_models/train_ac_recommendation.py`
  - training model rekomendasi AC dari sample CSV lokal.
  - target label `recommended_temp` dibentuk dari rule internal.
- `ml_models/train_from_azure.py`
  - training paling relevan untuk production-like flow.
  - fetch data dari Azure Table Storage.
  - train model energy dan AC berdasarkan data nyata.
- `ml_models/auto_train.py`
  - orchestrator auto-training.
  - mengecek jumlah data baru, retrain threshold, update metadata.
- `ml_models/run_auto_train.sh`
  - shell helper untuk scheduler/cron.

#### Inferensi

- `ml_models/prediction_api.py`
  - Flask API lokal untuk health, model info, reload, dan prediksi.
  - endpoint utama:
    - `/api/health`
    - `/api/model/info`
    - `/api/predict/energy`
    - `/api/predict/ac`
    - `/api/predict/all`
- `ml_models/ml_prediction_api.py`
  - versi alternatif / eksperimen API prediksi.
- `ml_models/predict.py`
  - script CLI prediksi energy sederhana.
- `ml_models/predict_ac_recommendation.py`
  - script CLI prediksi AC sederhana.

#### Artefak model

- `ml_models/models/energy_forecast_model.pkl`
- `ml_models/models/ac_recommendation_model.pkl`
- `ml_models/models/scaler.pkl`
- `ml_models/models/ac_scaler.pkl`
- `ml_models/models/energy_features.pkl`
- `ml_models/models/ac_features.pkl`
- `ml_models/models/model_config.json`
- `ml_models/models/training_status.json`

Catatan:

- artefak model masih hidup di repo;
- ini memudahkan demo, tetapi belum ideal untuk governance produksi.

### 3.6 Scripts `scripts/`

Folder ini berisi utilitas data dan eksperimen operasional.

File penting:

- `scripts/generate_sample_data.js`
  - generate sample CSV realistis untuk testing dan training lokal.
- `scripts/export_sensor_data.js`
  - export `SensorTelemetry` dari Azure Table Storage ke CSV.
- `scripts/list_tables.js`
  - list semua table di storage account.
- `scripts/check_storage_data.js`
  - cek data untuk device tertentu.
- `scripts/check_all_storage.js`
  - cek seluruh isi table.
- `scripts/add_people_count.js`
  - patch / enrich existing data dengan `jumlahOrang`.
- `scripts/sensor_data_sample_2026-01-04.csv`
  - sample dataset yang dipakai sejumlah script ML.
- `scripts/README.md`
  - dokumen utilitas.

Catatan penting:

- beberapa script utilitas masih memakai connection string hardcoded dan perlu dianggap legacy/unsafe untuk production use.

### 3.7 Dokumentasi dan Planning

- `docs/reports/REPORT_PENGEMBANGAN_CODE_HEALTH_SECURITY.md`
  - audit teknis lintas modul dan rekomendasi prioritas.
- `docs/planning/MASTER_PLAN_END_TO_END_CODE_HEALTH_SECURITY_EXCEL.csv`
  - master plan 30-90+ hari dengan work item, owner, KPI, gate, dan checklist lintas domain.
- `docs/README.md`
  - indeks folder dokumentasi.
- `local_data/README.md`
  - catatan artefak lokal Azurite.

## 4. Alur Data (Data Flow)

### 4.1 Telemetry Sensor Utama

```text
ESP32
  -> baca suhu / kelembaban / tegangan / arus / daya
  -> publish JSON ke Azure IoT Hub
  -> Azure Function IoTHubToStorage
  -> Azure Table Storage: SensorTelemetry
  -> GetTelemetryData API
  -> Frontend useMQTT polling
  -> DashboardHome / AdminDashboard / DigitalTwin / Charts
```

Detail:

1. ESP32 membaca sensor dan menyusun payload JSON.
2. Timestamp berasal dari NTP dan dikirim sebagai UTC ISO.
3. IoT Hub menerima payload.
4. `IoTHubToStorage` menyimpan ke `SensorTelemetry`.
5. Frontend polling ke `GET /telemetry/latest`.
6. Data dipetakan ke `sensorData` frontend.
7. Data yang sama dipakai untuk chart real-time, data table, digital twin, dan energy management.

### 4.2 People Count

```text
Raspberry Pi Camera
  -> YOLO / face detection
  -> local count
  -> publish event ke Azure IoT Hub
  -> IoTHubToStorage
  -> Azure Table Storage: PeopleCount
  -> GetTelemetryData action=people
  -> Frontend polling people count
```

Jalur tambahan:

```text
CameraStream.vue
  -> baca /count dari Raspberry Pi lokal
  -> savePeopleCount() ke Azure Function people/save
  -> PeopleCount table
```

Artinya saat ini ada dua jalur people count yang bisa coexist:

- edge -> IoT Hub -> storage
- frontend/camera local -> `people/save` -> storage

### 4.3 Data Historis

```text
Azure Table Storage
  -> GetTelemetryData action=history / people
  -> useHistoricalData.js
  -> merge dengan cache lokal jika ada pending data
  -> HistoricalAnalytics.vue
  -> chart, statistik, export CSV
```

Peran cache lokal:

- mempertahankan histori sementara di browser;
- menggabungkan data lokal yang lebih baru dari hasil fetch Azure;
- membantu mode offline parsial / gangguan jaringan.

### 4.4 Prediksi ML dan Rekomendasi AC

```text
Sensor data frontend
  -> useMLPrediction.js
  -> coba Azure Function /ac-recommendation/recommend
  -> jika gagal, coba ML API lokal /api/predict/all
  -> jika gagal, hitung local rule
  -> hasil dipakai di ACRecommendation.vue
```

Fallback chain aktual:

1. `azure_function`
2. `ml_api`
3. `local_calculation`

Metadata yang sudah ada di frontend:

- `trace_id`
- `source_tag`
- `fallback_level`
- `fallback_chain`
- `model_version`

### 4.5 Auth dan Session

```text
LoginPage
  -> Firebase Auth
  -> useFirebaseAuth.js
  -> route guard
  -> dashboard user atau admin
```

Auth flow:

- user biasa:
  - Google Sign-In atau email/password
  - diarahkan ke `/dashboard`
- admin:
  - login dari halaman khusus admin
  - role diverifikasi via custom claims atau allowlist email
  - session admin dibatasi TTL via `sessionStorage`

## 5. Status Fitur yang Sudah / Belum Selesai

### 5.1 Sudah Ada dan Berfungsi Secara Konseptual

- frontend dashboard Vue 3 berjalan dan build produksi berhasil;
- login user/admin dengan Firebase Auth;
- polling telemetry dari Azure Function;
- chart suhu, listrik, dan people count;
- analytics historis dasar;
- digital twin 3D Babylon.js;
- firmware ESP32 untuk publish telemetry;
- people counter Raspberry Pi;
- Azure Functions untuk read/write telemetry dan recommendation;
- ML API lokal dan training pipeline dari Azure;
- energy management dan estimasi biaya;
- CI GitHub Actions dasar untuk frontend dan Azure Functions;
- **timestamp standardization** — semua Azure Function menyimpan UTC ISO, konversi WIB hanya di frontend.

### 5.2 Sudah Ada, Tetapi Masih Parsial / Drift / Perlu Hardening

- `useMQTT.js`
  - nama dan test tidak lagi merepresentasikan implementasi aktual.
  - implementasi sekarang adalah polling HTTP, bukan MQTT browser.
- kontrak timestamp
  - edge ESP32 sudah UTC ISO, tetapi sebagian Azure Function masih `WIB`.
- people count flow
  - ada lebih dari satu jalur write sehingga source-of-truth perlu dipertegas.
- AC recommendation
  - frontend fallback chain sudah bagus, tetapi backend metadata belum seragam penuh.
- admin dashboard
  - cukup kaya fitur, tetapi sebagian device/status masih dummy / semi-statis.
- ML
  - training dari Azure sudah relevan, tetapi script lokal masih bergantung pada sample file.
- utilitas scripts
  - berguna untuk operasional/dev, tetapi beberapa masih legacy dan unsafe.
- CI
  - GitHub Actions lebih relevan daripada Azure Pipeline lama, tetapi gate kualitas belum lengkap.

### 5.3 Sudah Di-cleanup

- `view_virtual/src/components/AlertSettings.vue` dan `view_virtual/src/composables/useAlerts.js` — placeholder kosong yang sudah dihapus (2026-04-25). Fungsionalitas alert tertanam langsung di `AdminDashboard.vue` dan berfungsi secara penuh.

### 5.4 Belum Selesai / Placeholder / Debt Jelas

- closed-loop control
  - belum masuk fase implementasi aman.
- contract validation lintas modul
  - belum ada schema validation baku di semua producer/consumer.
- secret hygiene
  - masih ada jejak workflow yang bergantung pada env lokal dan beberapa utilitas dengan hardcoded secret.
- test suite frontend
  - sebagian lulus, tetapi area real-time data belum sinkron sepenuhnya.
- Azure DevOps root pipeline
  - masih legacy dibanding struktur repo sekarang.

## 6. Known Gaps dan Risiko Teknis Saat Ini

Risiko utama yang perlu diingat saat bekerja di repo ini:

1. ~~Timestamp belum satu standar — ada campuran UTC ISO dan string `WIB`~~ **RESOLVED.**
   - Semua Azure Function (`SaveSensorData`, `SavePeopleCount`, `GetTelemetryData`) menyimpan UTC ISO.
   - `GetTelemetryData` response tetap UTC ISO, `timestamp_display` (WIB) deprecated.
   - Frontend (`useMQTT`, `useHistoricalData`) handle konversi ke local display (WIB/Asia/Jakarta) dengan `toLocalDisplay()`.
   - Konversi WIB hanya di layer presentasi Vue.

2. Data contract lintas modul belum dibakukan penuh.
- field sensor inti cukup konsisten.
- metadata observability/fallback belum universal.

3. Test debt di area real-time.
- `useMQTT.test.js` masih memotret arsitektur lama.

4. Security posture belum final.
- write endpoint masih bergantung pada function key.
- beberapa jalur read masih terbuka.
- beberapa utilitas memuat credential secara langsung.

5. Dokumentasi dan runtime tidak selalu sinkron.
- beberapa README masih menonjolkan arsitektur yang lebih lama.

## 7. Rencana Pengembangan Selanjutnya

Bagian ini disusun dari kondisi codebase saat ini, laporan audit, dan `docs/planning/MASTER_PLAN_END_TO_END_CODE_HEALTH_SECURITY_EXCEL.csv`.

### Fase 1: Stabilkan Fondasi (1-30 hari)

Prioritas tertinggi:

1. Standarisasi schema payload lintas IoT, Function, ML, dan frontend.
- tetapkan field wajib:
  - `timestamp_utc`
  - `source`
  - `trace_id`
  - `fallback_level`
  - `model_version`

2. Pakai UTC ISO-8601 di semua jalur.
- konversi WIB hanya di layer presentasi UI.

3. Rapikan security write path.
- hentikan pola function key di browser untuk jalur sensitif.
- pindahkan secret aktif ke env/secret store.
- rotasi key lama.

4. Sinkronkan test suite dengan implementasi runtime.
- fokus awal: `useMQTT.js`.

5. Audit dan rapikan request burst di `ACRecommendation.vue`.
- satukan trigger.
- tambah debounce/throttle.

6. Tambahkan validation dan structured logging di ingress/API.

### Fase 2: Reliability, Observability, dan UX (31-60 hari)

1. Query historis deterministik.
- sort -> filter -> limit yang aman.

2. Observability lintas modul.
- trace correlation.
- error rate.
- latency p95/p99.
- dashboard health.

3. Optimasi frontend.
- lazy loading modul berat.
- budget performa.
- pengurangan freeze saat dataset besar.

4. Hardening session admin dan least privilege service-to-service.

5. Pisahkan CI per domain.
- frontend
- Azure Functions
- ML

### Fase 3: Governance dan Scale Readiness (61-90 hari)

1. Canonical twin state.
- satu sumber kebenaran state digital twin.

2. ML governance.
- data quality gate sebelum auto-train.
- model versioning.
- drift validation.

3. Release gate terpadu.
- e2e wajib sebelum rilis.
- checklist lintas domain.

### Fase 4: Closed-Loop Control (>90 hari, opsi terakhir)

Closed-loop control belum layak menjadi prioritas dekat.

Prasyarat sebelum masuk fase ini:

- data contract stabil;
- endpoint write/command aman;
- observability dan audit trail lengkap;
- ada fail-safe dan manual override;
- twin state canonical;
- e2e test lintas modul stabil.

## 8. Saran Cara Memakai Dokumen Ini

Jika Anda baru masuk ke repo:

1. baca bagian arsitektur dan modul utama di dokumen ini;
2. baca `README.md` root;
3. baca `view_virtual/README.md`, `sensor iot/README.md`, dan `ml_models/README.md`;
4. fokus ke `useMQTT.js`, `GetTelemetryData`, `IoTHubToStorage`, dan `useMLPrediction.js` untuk memahami jalur data inti;
5. cek `docs/reports/REPORT_PENGEMBANGAN_CODE_HEALTH_SECURITY.md` untuk prioritas perbaikan.

Jika ingin mulai mengerjakan teknis:

- area paling strategis untuk quick win saat ini adalah:
  - standardisasi timestamp/schema,
  - sinkronisasi `useMQTT` test,
  - hardening write path,
  - pengurangan request berlebih pada rekomendasi AC.

## 9. Ringkasan Singkat per Domain

### Frontend

- paling matang di sisi UX dan fitur visual;
- masih perlu perapihan arsitektur data real-time, placeholder alerts, dan test debt.

### Azure Functions

- sudah menjadi tulang punggung backend praktis;
- masih perlu contract cleanup, UTC unification, dan security hardening.

### IoT Edge

- ESP32 relatif paling canonical untuk payload sensor;
- Raspberry Pi sudah kuat untuk demo/operasional lokal, tetapi perlu standardisasi metadata dan performa profiling.

### ML

- fondasi inference/training sudah ada;
- yang paling perlu ditingkatkan adalah reproducibility, governance artefak, dan validitas target model AC.

### Scripts

- sangat membantu operasional/dev;
- sebagian harus diperlakukan sebagai alat internal/legacy, bukan jalur production.

