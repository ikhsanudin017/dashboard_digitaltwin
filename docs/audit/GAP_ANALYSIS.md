# Gap Analysis

## Ringkasan prioritas

| Prioritas | Gap | Dampak | Exit criteria |
|---|---|---|---|
| P0 | Secret/credential tersebar | Pengambilalihan cloud/device/admin | Rotasi, hapus dari source/history, scan lulus |
| P0 | Firmware bukan PZEM | Data listrik tidak sesuai desain produk | PZEM004Tv30 + UART + validation + HIL lulus |
| P0 | Kontrol AC otomatis aktif | Melanggar scope dan prinsip human-in-the-loop | Build MVP tidak memiliki jalur auto-control |
| P0 | Tidak ada data contract | Integrasi rapuh, unit/status ambigu | Schema versioned + validator + tests |
| P0 | Build dashboard gagal | Tidak dapat merilis demo | Build production lulus |
| P0 | Tidak ada Twin State formal | Belum menjadi Digital Twin terstruktur | Engine/state schema + integration test |
| P1 | Forecast bukan 30/60 menit | Klaim AI menyesatkan | Target horizon, baseline, time split, model card |
| P1 | Offline demo belum lengkap | Risiko demo kompetisi | Broker/backend/db/replay lokal deterministik |
| P1 | Backend anonymous/CORS luas | Data dan endpoint rentan | AuthN/AuthZ, origin allowlist, rate limit |
| P1 | Edge membuka frame | Risiko privasi | Default metadata-only; stream opt-in dan terproteksi |
| P1 | Rekomendasi tanpa lifecycle | Bukan decision support terukur | generated→reviewed→accepted/rejected→outcome |
| P1 | Dokumentasi tidak sinkron | Tim/juri menerima klaim salah | README dan docs mengikuti inventory |
| P2 | Monolit firmware dan duplikasi edge | Sulit diuji/dirawat | Modularisasi bertahap dan pilih canonical edge |
| P2 | Artefak/cache besar terlacak | Repository berat/tidak deterministik | Untrack terencana, artifact policy, lockfiles |
| P2 | Observability lemah | Sulit mendiagnosis demo/produksi | Health, structured logs, correlation/message ID |

## Gap per capability target

### Reliable sensing

- Tidak ada `PZEM004Tv30` atau `HardwareSerial` untuk PZEM.
- Tidak ada quality status per field, timeout formal, last successful read, atau persistent buffer.
- Sensor lingkungan DHT11 memiliki fallback default yang dapat membuat data gagal terlihat valid.

### Ingestion dan storage

- Payload memakai nama Indonesia legacy dan tidak memiliki `schemaVersion`, `messageId`, `roomId`, unit contract, atau validation result.
- Table Storage menyimpan data, tetapi partitioning hardcoded per device dan belum dirancang sebagai historical Twin State.
- Tidak ada idempotency/deduplication/dead-letter strategy.

### Intelligent Twin

- Dashboard state bersifat presentation state; raw, validated, current, prediction, anomaly, scenario, recommendation, decision, dan outcome belum dipisahkan.
- Forecast menggunakan random split dan target same-row; hasil historis tidak boleh dipublikasikan sebagai forecast 30/60 menit.
- Tidak ada scenario engine. Estimasi saving di UI adalah rumus tetap dan belum tervalidasi.

### Competition readiness

- Build frontend gagal.
- Tidak ada satu-command local demo, replay dataset, runbook, failure recovery, atau presentation flow.
- Font Google dan beberapa peta/model dapat bergantung internet.
- Toolchain firmware/cloud belum dapat direproduksi dari environment saat audit.

## Urutan penutupan gap

1. Rotasi secret, matikan jalur kontrol otomatis, dan pulihkan build.
2. Tetapkan schema telemetry/occupancy/twin state dan adapter legacy.
3. Implementasikan serta uji PZEM melalui UART dengan PZEM004Tv30.
4. Bangun ingestion validation dan Twin State minimal untuk satu ruangan.
5. Siapkan local replay deterministic sebelum menambah ML baru.
