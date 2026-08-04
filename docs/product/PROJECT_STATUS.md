# Project Status

## Current Release

Pre-MVP audit baseline (belum merupakan rilis kompetisi).

## Current Phase

Phase 0 — Audit dan keselamatan; Phase 1 foundation sedang disusun.

## Last Updated

2026-08-03 (Asia/Bangkok).

## Implemented and Verified

- Frontend unit/component test: 113 deklarasi test, command audit exit code 0.
- Python syntax parsing: 13 file Python, 0 kegagalan.
- Dependency tree frontend terpasang dan `npm ls --depth=0` exit code 0.

Status ini hanya berlaku pada unit yang diuji, bukan pada cloud, hardware, atau E2E.

## Implemented but Not Verified

- Pembacaan DHT11 pada firmware ESP32.
- Publish telemetry ESP32 melalui MQTT/TLS ke Azure IoT Hub.
- Azure Function ingestion/query dan Azure Table Storage adapter.
- Dua prototipe occupancy edge (YOLOv3-tiny dan YOLOv8).
- Descriptor cloud/Vercel.

## Partially Implemented

- Dashboard real-time, history, 3D, auth, dan recommendation UI.
- Penyimpanan historis melalui Azure Table dan cache browser.
- Eksperimen model energi/rekomendasi yang belum memenuhi horizon forecast target.
- Local/offline mode (cache, Azurite placeholder, tile server prototype).
- Human-in-the-loop tanpa persistence lifecycle/outcome.

## Planned

- PZEM-004T V3.0 melalui UART menggunakan PZEM004Tv30.
- Telemetry/occupancy/Twin State schema versioned dan validator.
- Twin State, prediction 30/60 menit, scenario, decision, dan feedback engine formal.
- Local MQTT/backend/database/replay stack deterministik.
- Backend RBAC, rate limiting, audit log, dan observability formal.

## Deprecated

- ZMPT101B/SCT013 dan perhitungan listrik manual sebagai target sensing utama.
- Jalur closed-loop IR AC otomatis untuk build MVP.
- Klaim akurasi/penghematan lama yang tidak dapat direproduksi.

Komponen deprecated belum dihapus dan masih memerlukan migration checkpoint.

## Current Blockers

- `BLOCKED`: frontend production build gagal karena `AdminDashboard.vue` kosong.
- `BLOCKED`: credential yang tampak nyata ditemukan pada file current tree/history; rotasi memerlukan koordinasi pemilik layanan.
- `BLOCKED`: firmware target PZEM belum ada dan PlatformIO/hardware tidak tersedia pada environment audit.
- `BLOCKED`: cloud/local E2E belum memiliki harness yang dapat dijalankan.

## Current Risks

- Jalur kontrol otomatis bertentangan dengan scope human-in-the-loop.
- Endpoint/CORS/auth saat ini dapat mengekspos data atau fungsi write.
- Dummy/fallback UI dapat disalahartikan sebagai telemetry aktual.
- Model pickle tidak memiliki provenance, hash, atau model card.
- Dokumen lama masih mengandung klaim dan branding TwinSpace yang belum sinkron.

## This Week

1. Selesaikan baseline dokumentasi dan tetapkan source of truth.
2. Rotasi dan sanitasi secret secara terkoordinasi.
3. Pulihkan build dashboard tanpa mengubah business logic lain.
4. Pisahkan kontrol otomatis dari firmware build MVP.
5. Tetapkan telemetry schema dan adapter legacy.

## Next Actions

1. `P0-SEC-001` — rotasi serta sanitasi credential.
2. `P0-SAFE-001` — nonaktifkan kontrol otomatis pada MVP.
3. `P0-WEB-001` — perbaiki blocker build dashboard.
4. `P0-DATA-001` — schema telemetry v1 + validator.
5. `P0-IOT-001` — implementasi PZEM setelah wiring review.

## Test Status

| Area | Hasil aktual | Status |
|---|---|---|
| Frontend unit/component | Exit 0; 113 deklarasi test | `IMPLEMENTED_AND_VERIFIED` |
| Frontend production build | Gagal pada empty Vue SFC | `BLOCKED` |
| Python syntax | 13/13 dapat diparse | `IMPLEMENTED_AND_VERIFIED` |
| Firmware | Tidak dijalankan; PlatformIO tidak tersedia | `IMPLEMENTED_NOT_VERIFIED` |
| Azure Functions | Tidak ada automated test | `PLANNED` |
| Hardware/cloud/local E2E | Tidak tersedia | `PLANNED` |

## Documentation Status

Audit baseline dan dokumen foundation tersedia. Dokumen testing, security, API/MQTT contract, operations, demo, serta model card lengkap masih harus dibuat pada checkpoint berikutnya.

## Deployment Status

Kode/deskriptor cloud tersedia, tetapi tidak ada bukti deployment aktif yang diverifikasi pada audit ini. Status: `IMPLEMENTED_NOT_VERIFIED`.
