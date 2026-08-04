# Laporan Checkpoint Tahap 0–1 — Baseline 2026-08-03

## Ringkasan

Audit repository dan dokumentasi foundation Twinuvo AI telah dibentuk tanpa memindahkan, menghapus, atau mengubah source aplikasi. Sembilan dokumen audit yang sudah berada di working tree diperiksa ulang terhadap struktur, source, manifest, test, dan build aktual. PRD, product scope, roadmap, backlog, project status, arsitektur aktual/target, serta 14 ADR ditambahkan sebagai source of truth bertahap.

Checkpoint ini **bukan** pernyataan bahwa MVP atau Phase 1 telah selesai. Risiko secret, kontrol otomatis, build frontend, PZEM, contract, dan E2E tetap terbuka.

## Kondisi Sebelum

- Root README masih memakai branding TwinSpace dan mencampur fitur aktual dengan klaim yang belum terbukti.
- Firmware monolit masih memakai ZMPT101B/SCT013 via ADC, bukan PZEM-004T V3.0.
- Firmware memiliki jalur IR closed-loop yang bertentangan dengan human-in-the-loop MVP.
- Credential yang tampak nyata tercatat pada current tree/history; nilai tidak disalin ke dokumentasi.
- Dashboard memiliki unit test, tetapi production build gagal pada empty `AdminDashboard.vue`.
- Twin State, schema validation, forecast 30/60 valid, scenario, decision lifecycle, feedback, dan offline stack lengkap belum tersedia.
- Portal docs menautkan PRD, architecture, ADR, dan report yang belum ada.

## File yang Dibuat

### Product

- `docs/product/PRD.md`
- `docs/product/PRODUCT_SCOPE.md`
- `docs/product/ROADMAP.md`
- `docs/product/BACKLOG.md`
- `docs/product/PROJECT_STATUS.md`

### Architecture

- `docs/architecture/SYSTEM_ARCHITECTURE.md`

### Architecture Decision Records

- `docs/adr/README.md`
- `docs/adr/ADR-001-PZEM-004T.md` sampai `ADR-014-CLOUD-LOCAL-MODES.md`

### Report

- `docs/reports/STAGE_0_1_BASELINE_2026-08-03.md`

Sembilan dokumen di `docs/audit/` telah tersedia sebelum perubahan checkpoint ini dan divalidasi, bukan ditimpa secara massal.

## File yang Diubah

Tidak ada tracked source/configuration lama yang diubah oleh checkpoint dokumentasi ini. Perubahan pengguna yang sudah ada pada firmware-adjacent services, ML, edge, Azure Functions, dashboard, lockfile, dan `.gitignore` dipertahankan.

## File yang Dipindahkan

Tidak ada.

## File yang Ditandai Deprecated

- ZMPT101B/SCT013 dan pembacaan ADC listrik sebagai target sensing utama: legacy aktif, belum aman dihapus.
- Jalur IR closed-loop AC pada build MVP: tidak sesuai decision-support/human-in-the-loop.
- Klaim metrik lama yang tidak dapat direproduksi: tidak boleh digunakan sebagai hasil aktual.

Penandaan berada pada audit, backlog, PRD, dan ADR; source belum dihapus/diubah.

## File yang Disarankan Dihapus

Belum ada penghapusan yang diotorisasi. Migration map mencatat kandidat `sensor iot/.cache/**`, `compile_commands.json`, duplikasi environment example, dan artefak lokal. Penghapusan/untracking hanya boleh dilakukan setelah reference, deployment, test, firmware, dan lisensi diverifikasi.

## Keputusan Arsitektur

- PZEM-004T V3.0 melalui UART/PZEM004Tv30 sebagai target meter utama.
- ESP32 dipertahankan dan dimodularisasi bertahap.
- MQTT untuk telemetry; API/WebSocket untuk query dan user decision.
- Kamera diproses di edge dan cloud menerima metadata agregat saja.
- Domain contract sama untuk cloud dan local mode.
- Baseline-first/time-based split untuk forecast.
- Human-in-the-loop dan tidak ada kontrol listrik otomatis pada MVP.
- Monorepo dipertahankan; perpindahan mengikuti migration map.
- Satu ruang aktif; rumah 3D hanya konteks spasial.

## Risiko

1. Credential terpapar belum dirotasi karena membutuhkan pemilik layanan dan koordinasi deployment.
2. Firmware legacy masih dapat melakukan kontrol IR otomatis.
3. Build dashboard belum dapat menghasilkan artefak production.
4. PZEM/hardware/toolchain tidak tersedia untuk HIL pada environment audit.
5. Cloud/local E2E dan performance/security testing belum tersedia.

## Pengujian

| Command/pemeriksaan | Hasil aktual |
|---|---|
| `npm.cmd run test:run -- --pool=forks --maxWorkers=1 --reporter=dot` | Exit 0; 113 deklarasi test; output memiliki warning/log fallback yang bising |
| `npm.cmd run build` | Exit 1; empty `AdminDashboard.vue` |
| `npm.cmd ls --depth=0` | Exit 0 |
| Parse AST semua file Python | 13 file, 0 kegagalan |
| Tool availability | Node/npm/Python tersedia; PlatformIO, Azure CLI, Functions Core Tools, Gitleaks, pip-audit tidak tersedia |

Hardware, cloud, camera, MQTT, dependency vulnerability, dan local E2E tidak diuji. Tidak ada hasil target hardware/ML/usability yang diklaim sebagai aktual.

## Status Fitur

- `IMPLEMENTED_AND_VERIFIED`: frontend unit/component tests pada mock dan validitas sintaks Python.
- `IMPLEMENTED_NOT_VERIFIED`: DHT firmware, IoT Hub publish, Azure adapters, edge occupancy, cloud descriptors.
- `PARTIALLY_IMPLEMENTED`: dashboard, history, 3D, auth, ML experiment, anomaly/recommendation heuristic, local prototype, human review UI.
- `PLANNED`: PZEM, schema/validator, Twin State, 60-minute forecast, scenario, feedback, full local demo, RBAC.
- `DEPRECATED`: sensing listrik ADC legacy dan auto-control untuk scope MVP.
- `BLOCKED`: production build, secret-safe baseline, PZEM HIL, serta E2E deployment/demo.

## Gap Tersisa

- Product docs lengkap lain, API/MQTT contracts, model card, security/testing/operations/demo suites.
- Credential rotation dan blocking security scan.
- MVP firmware measurement-only berbasis PZEM.
- Canonical telemetry/Twin State contracts dan vertical slice satu room.
- Demo offline deterministik dan evidence pengujian aktual.

## Langkah Berikutnya

1. Koordinasikan rotasi secret dan sanitasi current tree/history.
2. Pisahkan/nonaktifkan kontrol otomatis dari build MVP.
3. Perbaiki blocker build dashboard dengan perubahan minimal dan test.
4. Implementasikan telemetry schema v1, validator, dan adapter legacy.
5. Siapkan implementasi PZEM setelah hardware/wiring review tersedia.
