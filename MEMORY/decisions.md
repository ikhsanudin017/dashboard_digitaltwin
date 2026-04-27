# Arsitektur Keputusan & Pattern

## Library & Framework Yang Dipilih

### Frontend
| Library | Versi | Fungsi |
|---------|-------|--------|
| vue | ^3.4 | UI framework |
| vue-router | ^4.6 | Routing + guard |
| axios | ^1.6 | HTTP client |
| chart.js | ^4.4 | Charting |
| vue-chartjs | ^5.3 | Vue wrapper for charts |
| @babylonjs/core | ^8.43 | 3D rendering |
| @babylonjs/loaders | ^8.43 | GLTF loader |
| firebase | ^12.11 | Authentication |
| @vueuse/core | ^10.7 | Composition utilities |
| vite | ^6.0 | Build tool |
| vitest | ^4.0 | Testing |

### IoT / Edge
| Library | Fungsi |
|---------|--------|
| PubSubClient | MQTT client for ESP32 |
| ArduinoJson | JSON serialization (ESP32) |
| IRremoteESP8266 | IR capture/transmit |
| DHT sensor library | DHT11 sensor |
| Adafruit Unified Sensor | Unified sensor interface |
| PlatformIO | Build system ESP32 |

### Backend
| Library | Fungsi |
|---------|--------|
| @azure/data-tables | Table Storage client |
| azure-functions-core-tools | Local development |

### ML
| Library | Fungsi |
|---------|--------|
| scikit-learn | Training (RandomForest, GradientBoosting) |
| pandas | Data processing |
| flask | Local API server |
| waitress | Production WSGI server |

## Keputusan Arsitektur

### 1. Data Ingestion: IoT Hub + Azure Function
**Keputusan**: Gunakan Azure IoT Hub sebagai message broker dari ESP32/Raspberry Pi, lalu Azure Function (event hub trigger) untuk persist ke Table Storage.

**Alasan**: Azure IoT Hub menyediakan managed MQTT broker dengan TLS, SAS token auth, dan built-in routing. Event hub trigger di Azure Function menangkap semua event tanpa polling.

**Alternatif yang dipertimbangkan**: Direct MQTT ke Table Storage / CosmosDB — ditolak karena tidak ada managed service serupa yang langsung.

### 2. Frontend Real-Time: HTTP Polling
**Keputusan**: Frontend polling Azure Function tiap 5 detik, BUKAN browser MQTT direct ke IoT Hub.

**Alasan**: IoT Hub MQTT endpoint memerlukan SAS token dengan timestamp expiry. IoT Hub SAS token tidak bisa di-refresh otomatis di browser. Polling HTTP lebih sederhana dan reliable.

**Konsekuensi**: Nama composable `useAzureTelemetry.js` — polling HTTP ke Azure Function, bukan MQTT.

**Status**: RESOLVED 2026-04-26 — composable direname menjadi `useAzureTelemetry.js`. Nama sekarang akurat: HTTP polling ke Azure Function, BUKAN MQTT. API: `isConnected`, `startPolling`, `stopPolling`.

### 3. AC Recommendation: Fallback Chain
**Keputusan**: Frontend mencoba Azure Function → ML API lokal → local calculation.

**Alasan**: Prioritaskan cloud untuk akurasi, fallback ke ML lokal jika cloud down, fallback akhir ke rule-based jika semua API gagal. Memberikan metadata observability (`trace_id`, `source_tag`, `fallback_level`).

### 4. AC Control: Raw IR Profiles
**Keputusan**: ESP32 capture raw IR dari remote Gree AC, simpan di flash (NVS), kirim via IR LED transistor.

**Alasan**: Setiap AC Gree model mungkin berbeda encoding. Capture raw profile memungkinkan kontrol akurat tanpa reverse-engineer protokol. Library `IRremoteESP8266` dengan model Gree YBOFB sebagai default.

**Alternatif**: Library langsung (tanpa capture) — ditolak karena beberapa model tidak cocok. Ditambah fallback raw profile.

### 5. Timestamp: UTC ISO-8601 End-to-End
**Keputusan**: Semua sistem mengirim/menyimpan timestamp dalam UTC ISO-8601. Konversi ke WIB hanya di layer presentasi UI (Vue).

**Alasan**: Standar konsisten untuk storage dan debugging lintas zona waktu. Azure Table Storage tidak melakukan konversi otomatis.

**Status**: RESOLVED per audit 2026-04 — semua Azure Function menyimpan UTC ISO.

### 6. Auth: Firebase Local + Claims
**Keputusan**: Admin bisa login via local env vars (tanpa Firebase) atau via Firebase custom claims.

**Alasan**: Memungkinkan admin tanpa Firebase project (untuk demo/internal). Custom claims untuk role-based access di Firebase.

### 7. ML Training: Python Script + Auto-Train
**Keputusan**: Training offline via Python script, artefak model (.pkl) disimpan di repo. Auto-train via cron script.

**Alasan**: ML training resource-intensive, tidak cocok di Azure Function consumption plan. Artefak di repo memudahkan deployment dan versioning.

**Konsekuensi**: Artefak model (.pkl) di repo — tidak ideal untuk governance produksi tapi aman untuk demo.

## Pattern Konsisten

### 1. Polling dengan Retry
Semua fetch ke Azure Function menggunakan retry logic dan graceful degradation ke localStorage cache.

### 2. Fallback Chain Pattern
ML prediction, historical data, dan energy management semua menggunakan fallback chain berjenjang.

### 3. Normalisasi Data di Frontend
`normalizeDataPoint()` di `useHistoricalData.js` dan `normalizeSensorInput()` di `useMLPrediction.js` melakukan mapping nama field fleksibel (support nama lama dan baru).

### 4. State Management via Composables
Vue 3 reactivity (ref/reactive/computed) — tidak ada Vuex/Pinia. State di-share via module-level singleton (e.g., `historicalData` ref di luar composable function).

### 5. Error Mapping untuk Firebase Auth
`mapAuthError()` di `useFirebaseAuth.js` mengkonversi Firebase error codes ke pesan user-friendly bahasa Indonesia.

### 6. CORS di Semua Azure Function
Semua Azure Function mengembalikan CORS headers (`Access-Control-Allow-Origin: *`).

### 7. Table Auto-Creation
Azure Function membuat tabel jika belum ada (`createTable().catch(() => {})`).

## Keputusan Operasional 2026-04-26

### 8. VS Code Task Upload ESP32 wajib set cwd ke folder PlatformIO
**Keputusan**: Task `PlatformIO: Upload ESP32` di VS Code harus dijalankan dengan `cwd` ke `${workspaceFolder}/sensor iot`.

**Alasan**: Eksekusi dari root repo menyebabkan `NotPlatformIOProjectError` karena file `platformio.ini` berada di folder `sensor iot`.

### 9. Rename useMQTT → useAzureTelemetry
**Keputusan**: Rename composable dari `useMQTT.js` menjadi `useAzureTelemetry.js`.

**Alasan**: Nama lama menyesatkan — implementasi adalah HTTP polling ke Azure Function, BUKAN MQTT direct. Nama baru menggambarkan fungsi sebenarnya secara akurat.

**Perubahan API**:
- `mqttConnected` → `isConnected`
- `connectMQTT` → `startPolling`
- `disconnectMQTT` → `stopPolling`

**Dampak**: Nama composable sekarang akurat dengan implementasi. Semua reference di `DashboardHome.vue`, `AdminDashboard.vue`, dan test file sudah diupdate.

### 10. CesiumJS untuk Geographic Location View
**Keputusan**: Tambahkan CesiumJS sebagai Geographic View (toggle dengan Babylon.js indoor 3D).

**Alasan**: User request untuk menampilkan rumah di atas peta geografis nyata. Koordinat rumah: -7.722649267245097, 110.51897609565907 (Yogyakarta).

**Implementasi**:
- Package: `cesium` + `@cesium/engine` via npm
- Komponen baru: `CesiumViewer.vue`
- Toggle di DashboardHome: "Peta Lokasi" (Cesium) ↔ "3D Indoor" (Babylon.js)
- Cesium Viewer features: house marker dengan pulsing icon, coordinates display, sensor summary panel, fly-to-home button, day/night toggle

**Catatan**: Bundle CesiumJS besar (~4MB gzip ~1.1MB). Untuk production perlu optimize dengan tree-shaking atau lazy loading component.

**Status**: IMPLEMENTED 2026-04-26 — CesiumViewer.vue dibuat, toggle ditambahkan ke DashboardHome.vue, Vite config diupdate untuk Cesium workers.

### 11. GEE + Cesium Complementary Integration
**Keputusan**: Gabungkan Google Earth Engine (GEE) untuk analysis dengan Cesium untuk visualisasi.

**Alasan**: GEE menyediakan massive geospatial analysis (NDVI, land cover, time-series), sementara Cesium menyediakan 3D globe visualization.它们 saling melengkapi, bukan competing.

**Architecture**:
```
[User] → Vue Dashboard
         ├── CesiumViewer.vue (visualization)
         │   └── Tampilkan tile layers dari GEE
         │
         └── GEE Python Server (gee_server.py)
             ├── earthengine-api
             ├── Landsat/Sentinel analysis
             └── Serve tile URL ke Cesium
```

**Location Focus**: -7.722649267245097, 110.51904046867396 (Yogyakarta, Indonesia)

**GEE Layers yang didukung**:
- NDVI (Vegetation Index) — LANDSAT/LC09
- Landsat True Color — RGB composite
- Terrain (SRTM) — Digital Elevation Model
- Land Use/Land Cover — Copernicus Global

**Files**:
- `/ml_models/gee_server.py` — Flask server untuk GEE processing
- `/view_virtual/src/components/CesiumViewer.vue` — GEE layer toggle
- `/ml_models/requirements.txt` — Added `earthengine-api`, `flask`

**Setup Required**:
```bash
# Install dependencies
pip install earthengine-api flask

# Authenticate GEE (one-time)
earthengine authenticate

# Start GEE server
python ml_models/gee_server.py

# Start Vue dev server
cd view_virtual && npm run dev
```

**Status**: IMPLEMENTED 2026-04-27 — GEE server dibuat, CesiumViewer diupdate dengan GEE layer toggle.

### 12. Google Photorealistic 3D Tiles Only (2026-04-27)
**Keputusan**: Fokus HANYA pada Google Photorealistic 3D Tiles untuk CesiumViewer, hapus semua imagery layer lain.

**Alasan**: CORS errors dari OpenStreetMap, ArcGIS, dan Cesium Ion menyebabkan rendering error `getDerivedResource`. Google Photorealistic 3D Tiles adalah solusi paling reliable dengan API key yang diberikan.

**Konfigurasi**:
```javascript
const GOOGLE_API_KEY = 'AIzaSyBlQk4kTmrf-yWcM1wrLwSGlyxRvVqPP3M'
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZTljMmFmOC1lMjVmLTRiOTktOGZhMy00OTVkMDQzZDA3YjgiLCJpZCI6NDIzOTQ1LCJpYXQiOjE3NzcyNjg3Nzh9.GGZCNgx3n-vIlj-hphyjGIA4uIeR9e3-aXKkMq8Sp5I'

const googleTileset = await Cesium.createGooglePhotorealistic3DTileset({
  accessKey: GOOGLE_API_KEY
})
```

**Yang dihapus**:
- ❌ OpenStreetMap imagery
- ❌ ArcGIS satellite
- ❌ Cesium World Terrain (Ion)
- ❌ OSM 3D Buildings

**Yang tetap**:
- ✅ Google Photorealistic 3D Tiles (dengan API key)
- ✅ Cesium Viewer core

**Status**: IMPLEMENTED 2026-04-27 — CesiumViewer.vue di-simplify untuk Google Photorealistic 3D saja.

### 13. API Security - Environment Variables (2026-04-27)
**Keputusan**: Pindahkan semua API keys ke environment variables, bukan hardcoded di source code.

**Files Updated**:
- `src/lib/appConfig.js` - Centralized config dengan `import.meta.env`
- `src/components/CesiumViewer.vue` - Import dari appConfig

**Environment Variables Required**:
```bash
VITE_CESIUM_ION_TOKEN=your_cesium_token
VITE_GOOGLE_MAPS_API_KEY=your_google_api_key
VITE_AZURE_FUNCTION_URL=https://func-xxx.azurewebsites.net/api
```

**Status**: IMPLEMENTED 2026-04-27

### 14. Deck.gl vs Cesium.js Decision (2026-04-27)
**Keputusan**: Gunakan Cesium.js untuk project ini karena fokus pada 3D globe + IoT markers.

**Comparison**:
| Aspek | Deck.gl | Cesium.js |
|-------|---------|-----------|
| 3D Globe | ❌ No | ✅ Yes |
| IoT Markers | ❌ Limited | ✅ Yes |
| Terrain | ❌ Basic | ✅ Excellent |
| Bundle Size | ~200KB | ~4MB |

**Kesimpulan**: Cesium.js sudah cukup untuk Digital Twin monitoring. Deck.gl lebih untuk data science dashboards.
