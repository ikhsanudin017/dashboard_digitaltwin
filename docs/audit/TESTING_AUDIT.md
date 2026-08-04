# Testing Audit

## Hasil eksekusi 2026-08-03

| Pemeriksaan | Command | Hasil | Status |
|---|---|---|---|
| Frontend unit/component | `npm.cmd run test:run -- --pool=forks --maxWorkers=1 --reporter=verbose` | Exit code 0; 113 test case terdeklarasi | `IMPLEMENTED_AND_VERIFIED` |
| Frontend default test | `npm.cmd run test:run` | Timeout 120 detik tanpa summary | `BLOCKED` secara operasional |
| Frontend build | `npm.cmd run build` | Gagal: `AdminDashboard.vue` kosong | `BLOCKED` |
| Python syntax | `python -m py_compile` untuk 13 file | Lulus | `IMPLEMENTED_AND_VERIFIED` untuk sintaks |
| Firmware build | PlatformIO tidak tersedia | Tidak dijalankan | `IMPLEMENTED_NOT_VERIFIED` |
| Azure Functions test | Tidak ada test dan `func` tidak tersedia | Tidak dijalankan | `PLANNED` |
| ML evaluation | Artifact lama tersedia | Tidak direproduksi; metodologi tidak sesuai time-series | `PARTIALLY_IMPLEMENTED` |
| Edge/YOLO | Hardware/model runtime tidak tersedia | Tidak dijalankan | `IMPLEMENTED_NOT_VERIFIED` |
| E2E cloud/local | Harness tidak ada | Tidak dijalankan | `PLANNED` |
| Security/dependency | Tool tidak tersedia / registry timeout | Tidak lengkap | `BLOCKED` |

## Kualitas test frontend

Test mencakup polling Azure dengan mock, fallback data, mapping field, ML fallback chain, serta rendering chart/status/empty state. Test belum mencakup auth/router, dashboard root, Babylon/Cesium, camera stream, Energy Management, build smoke test, atau actual backend contract. Runner mengeluarkan warning lifecycle Vue dan banyak error log yang memang dipicu test fallback; output perlu dibuat lebih bersih.

## Gap terhadap target pengujian

- Unit firmware PZEM/telemetry builder belum ada.
- JSON Schema validation belum ada.
- Integration IoT Hub/Table/API belum ada.
- Hardware comparison untuk voltage/current/power belum ada.
- ML tidak memiliki time-based split, naive baseline, MAE/RMSE/MAPE/sMAPE per horizon.
- Anomaly/scenario/decision lifecycle tidak memiliki test.
- Tidak ada performance, reliability, privacy, security, usability, atau offline-demo test.

## Target — belum menjadi hasil aktual

| Metrik | TARGET | Hasil aktual | Status |
|---|---:|---:|---|
| Galat tegangan | ≤ 3% | — | `BELUM DIUJI` |
| Galat arus | ≤ 5% | — | `BELUM DIUJI` |
| Galat daya | ≤ 5% | — | `BELUM DIUJI` |
| Packet loss | < 1% | — | `BELUM DIUJI` |
| Latensi dashboard rata-rata | ≤ 5 detik | — | `BELUM DIUJI` |
| Occupancy accuracy | ≥ 90% | — | `BELUM DIUJI` |
| MAPE forecast 30 menit | ≤ 15–20% | — | `BELUM DIUJI` |
| Uptime pengujian | ≥ 95% | — | `BELUM DIUJI` |
| SUS | ≥ 70 | — | `BELUM DIUJI` |
