# Feature Inventory

Snapshot: 2026-08-03. `IMPLEMENTED_AND_VERIFIED` hanya dipakai bila bukti test lokal tersedia untuk unit yang disebut; itu tidak berarti end-to-end cloud/hardware telah terbukti.

| ID | Fitur | Bukti implementasi | Bukti pengujian | Status | Catatan |
|---|---|---|---|---|---|
| F-001 | Pembacaan suhu/kelembapan DHT11 | `sensor iot/src/main.cpp` | Tidak ada HIL | `IMPLEMENTED_NOT_VERIFIED` | README juga menyebut DHT22 secara tidak konsisten |
| F-002 | Pembacaan PZEM-004T V3.0 | Tidak ditemukan | Tidak ada | `PLANNED` | P0; target sensing utama |
| F-003 | Pembacaan ZMPT101B/SCT013 | `sensor iot/src/main.cpp` | Tidak ada HIL | `DEPRECATED` | Legacy aktif, belum aman dihapus |
| F-004 | Telemetry ESP32 ke Azure IoT Hub | MQTT/TLS + SAS di firmware | Tidak ada end-to-end | `IMPLEMENTED_NOT_VERIFIED` | Payload belum versioned |
| F-005 | Health telemetry ESP32 | heap/RSSI/CPU/loop sebagian | Tidak ada | `PARTIALLY_IMPLEMENTED` | Belum uptime/read/publish/sensor status lengkap |
| F-006 | Buffering offline ESP32 | Tidak ditemukan | Tidak ada | `PLANNED` | Retry bersifat koneksi, bukan durable buffer |
| F-007 | Ingestion IoT Hub ke Table Storage | `IoTHubToStorage` | Tidak ada test | `IMPLEMENTED_NOT_VERIFIED` | Tidak ada schema validation/dedup |
| F-008 | API latest/history/stats/people | `GetTelemetryData` | Test backend tidak ada | `IMPLEMENTED_NOT_VERIFIED` | Device ID hardcoded, read anonymous |
| F-009 | Dashboard polling telemetry | `useAzureTelemetry.js` | Vitest lulus | `IMPLEMENTED_AND_VERIFIED` | Terverifikasi dengan mock, bukan cloud nyata |
| F-010 | Grafik telemetry | komponen Chart Vue | Vitest komponen lulus | `IMPLEMENTED_AND_VERIFIED` | Data fallback dapat berupa dummy |
| F-011 | Penyimpanan historis | Azure Table + localStorage cache | Frontend parsial | `PARTIALLY_IMPLEMENTED` | Bukan time-series store formal |
| F-012 | Model rumah 3D | Babylon scene.gltf; Cesium/maps | Build gagal | `IMPLEMENTED_NOT_VERIFIED` | Belum menetapkan satu room aktif formal |
| F-013 | Occupancy YOLOv3-tiny | edge service pertama | Tidak ada test/benchmark | `IMPLEMENTED_NOT_VERIFIED` | Metadata dikirim; stream lokal juga terbuka |
| F-014 | Occupancy YOLOv8 | edge service kedua | Tidak ada test/benchmark | `IMPLEMENTED_NOT_VERIFIED` | Dependency manifest tidak lengkap |
| F-015 | Privasi kamera agregat-only | Tidak menyimpan frame ke disk | Tidak ada privacy test | `PARTIALLY_IMPLEMENTED` | Stream/snapshot raw tersedia di LAN |
| F-016 | Twin State Engine formal | Tidak ditemukan | Tidak ada | `PLANNED` | Dashboard state bukan domain Twin State |
| F-017 | Forecast energi 30 menit | Model current-row power | Metrik lama tidak valid untuk horizon | `PARTIALLY_IMPLEMENTED` | Harus time-based split dan target future |
| F-018 | Forecast energi 60 menit | Tidak ditemukan | Tidak ada | `PLANNED` | — |
| F-019 | Anomaly rule di ESP32 | Threshold voltage/current/temp | Tidak ada unit/HIL | `PARTIALLY_IMPLEMENTED` | Belum anomaly entity/lifecycle |
| F-020 | Anomaly statistik dashboard | z-score sederhana | Tidak ada test | `PARTIALLY_IMPLEMENTED` | Potensi division by zero |
| F-021 | Scenario what-if | Tidak ditemukan | Tidak ada | `PLANNED` | UI estimasi bukan scenario engine |
| F-022 | Rekomendasi AC | Azure rule, Flask ML, frontend fallback | Test composable lulus | `PARTIALLY_IMPLEMENTED` | Tiga implementasi tidak satu contract |
| F-023 | Human-in-the-loop | Tombol “Terapkan” emit/alert | Tidak ada persistence | `PARTIALLY_IMPLEMENTED` | Belum accepted/rejected/audit lifecycle |
| F-024 | Feedback dan outcome | Tidak ditemukan | Tidak ada | `PLANNED` | — |
| F-025 | Kontrol AC otomatis via IR | Firmware closed-loop | Tidak ada safety test | `DEPRECATED` | Tidak boleh aktif pada MVP |
| F-026 | Auth dashboard Firebase | Firebase Auth/router guard | Tidak ada test auth | `PARTIALLY_IMPLEMENTED` | Local admin fallback tidak aman |
| F-027 | Backend RBAC | Tidak ditemukan | Tidak ada | `PLANNED` | Function key bukan RBAC pengguna |
| F-028 | Cloud mode | Descriptor/code Azure dan Vercel | Deployment tidak diverifikasi | `IMPLEMENTED_NOT_VERIFIED` | — |
| F-029 | Local/offline mode lengkap | Cache, fallback, Azurite placeholder, tile server | Tidak ada E2E | `PARTIALLY_IMPLEMENTED` | Broker/backend/db/replay belum tersedia |
| F-030 | Deterministic GEMASTIK demo | Tidak ditemukan | Tidak ada | `PLANNED` | — |
| F-031 | Telemetry JSON Schema | Tidak ditemukan | Tidak ada | `PLANNED` | P0 |
| F-032 | API/OpenAPI/MQTT catalog | Tidak ditemukan | Tidak ada | `PLANNED` | — |
| F-033 | Frontend unit tests | 113 test cases | Exit code 0 | `IMPLEMENTED_AND_VERIFIED` | Banyak warning/log noise |
| F-034 | Frontend production build | Vite config tersedia | Gagal pada empty SFC | `BLOCKED` | `AdminDashboard.vue` kosong |
| F-035 | Firmware build/test | PlatformIO config tersedia | Tool tidak tersedia | `IMPLEMENTED_NOT_VERIFIED` | PZEM dependency belum ada |
| F-036 | Backend unit/integration test | Tidak ditemukan | Tidak ada | `PLANNED` | — |
| F-037 | Python syntax validity | 13 file Python | `py_compile` lulus | `IMPLEMENTED_AND_VERIFIED` | Bukan behavioral test |
| F-038 | Secret scanning CI | Tidak ditemukan | Tool tidak tersedia | `PLANNED` | npm audit saat ini non-blocking |
| F-039 | Dependency scanning | `npm audit` di CI dengan bypass | Audit online timeout | `PARTIALLY_IMPLEMENTED` | Tidak menjadi quality gate |
