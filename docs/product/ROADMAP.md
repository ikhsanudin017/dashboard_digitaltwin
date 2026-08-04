# Roadmap — Twinuvo AI

Roadmap ini menyatakan urutan kerja, bukan janji tanggal. Suatu phase hanya dapat dinyatakan selesai setelah exit criteria memiliki bukti.

| Phase | Fokus | Exit criteria utama | Status 2026-08-03 |
|---|---|---|---|
| 0 — Audit dan keselamatan | Inventory, secret, legacy, test baseline | Sembilan dokumen audit tersedia; risiko destruktif dipetakan | `IMPLEMENTED_NOT_VERIFIED` |
| 1 — Repository foundation | PRD, scope, arsitektur, ADR, roadmap, backlog, status | Dokumen dasar konsisten dan link valid | `PARTIALLY_IMPLEMENTED` |
| 2 — Reliable sensing dan ingestion | PZEM, environment sensor, schema, validation | PZEM HIL lulus; telemetry versioned tersimpan | `BLOCKED` |
| 3 — Dashboard dan Twin State | State formal, API, real-time/history, satu room aktif | Build hijau; Twin State integration test lulus | `PARTIALLY_IMPLEMENTED` |
| 4 — Prediction Engine | Baseline, time split, horizon 30/60, model card | Evaluasi test-window direproduksi; artifact ber-hash | `PARTIALLY_IMPLEMENTED` |
| 5 — Anomaly Engine | Rules, statistical/residual detection, lifecycle | Test normal/anomaly/missing telemetry lulus | `PARTIALLY_IMPLEMENTED` |
| 6 — Scenario dan Decision Engine | What-if, evidence, approval, outcome | Baseline vs scenario dan decision lifecycle teruji | `PLANNED` |
| 7 — Evaluasi dan usability | Sensor, reliability, ML, privacy, SUS | Target dipisah dari hasil aktual; evidence tersimpan | `PLANNED` |
| 8 — Competition hardening | Offline demo, recovery, observability, security | Demo deterministik tanpa internet dapat diulang | `PLANNED` |
| 9 — Multi-room expansion | Contract multi-room dan scale-out | Isolasi room/device dan load test terbukti | `PLANNED` |

## Milestone terdekat

### M0 — Baseline aman

- Rotasi semua credential yang pernah terekspos.
- Sanitasi current tree dan siapkan full-history secret scan.
- Nonaktifkan jalur kontrol AC otomatis dari build MVP.
- Pulihkan build dashboard.

### M1 — Data contract yang dapat dipercaya

- Tetapkan telemetry schema v1 dan occupancy schema v1.
- Tambahkan adapter field legacy tanpa migrasi data destruktif.
- Implementasikan validator, idempotency key, quality status, dan test contract.
- Dokumentasikan wiring PZEM dengan peringatan keselamatan.

### M2 — Vertical slice satu ruangan

- ESP32 → ingestion → storage → Twin State → dashboard berjalan untuk `ROOM-01`.
- Cloud dan local mode memakai kontrak domain yang sama.
- Replay dataset menghasilkan hasil demo deterministik.

### M3 — Intelligence yang jujur

- Forecast 30/60 menit dibandingkan naive persistence.
- Anomali memiliki evidence dan status.
- Scenario menyatakan asumsi/limitasi; rekomendasi membutuhkan persetujuan.
- Outcome digunakan untuk evaluasi, bukan klaim penghematan sebelum diuji.

## Gate kompetisi

Phase 8 tidak boleh diberi status selesai sebelum build/test tersedia, secret scan lulus, demo lokal dapat dijalankan tanpa internet, hardware test memiliki hasil aktual, dan seluruh klaim presentasi dapat ditelusuri ke kode, test, atau diberi label `PLANNED`/`BELUM DIUJI`.
