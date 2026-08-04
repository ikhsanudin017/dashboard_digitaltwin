# Architecture Decision Records

ADR mencatat keputusan arah. Status `Accepted` tidak berarti implementasi sudah selesai; kolom implementasi menyatakan kondisi repository saat snapshot 2026-08-03.

| ADR | Keputusan | Status ADR | Implementasi |
|---|---|---|---|
| [ADR-001](ADR-001-PZEM-004T.md) | PZEM-004T V3.0 sebagai meter utama | Accepted | `PLANNED` |
| [ADR-002](ADR-002-UART-PZEM004TV30.md) | UART dan PZEM004Tv30 | Accepted | `PLANNED` |
| [ADR-003](ADR-003-ESP32-ENERGY-NODE.md) | ESP32 untuk energy node | Accepted | `IMPLEMENTED_NOT_VERIFIED` |
| [ADR-004](ADR-004-MQTT-API-TRANSPORT.md) | MQTT telemetry, API untuk query/decision | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-005](ADR-005-EDGE-CAMERA-PROCESSING.md) | Kamera diproses pada edge | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-006](ADR-006-TIME-SERIES-STORAGE.md) | Interface time-series, backend pluggable | Proposed | `PARTIALLY_IMPLEMENTED` |
| [ADR-007](ADR-007-INITIAL-PREDICTION-MODEL.md) | Baseline-first forecast 30/60 menit | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-008](ADR-008-HUMAN-IN-THE-LOOP.md) | Human-in-the-loop | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-009](ADR-009-NO-AUTOMATIC-ELECTRICAL-CONTROL.md) | Tidak ada kontrol listrik otomatis | Accepted | `BLOCKED` oleh firmware legacy |
| [ADR-010](ADR-010-LOCAL-FIRST-DEMO.md) | Local-first demo kompetisi | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-011](ADR-011-MONOREPO.md) | Pertahankan monorepo bertahap | Accepted | `IMPLEMENTED_AND_VERIFIED` |
| [ADR-012](ADR-012-3D-HOUSE-MODEL.md) | Rumah 3D sebagai konteks spasial | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-013](ADR-013-SINGLE-ROOM-POC.md) | Satu ruangan sebagai proof of concept | Accepted | `PARTIALLY_IMPLEMENTED` |
| [ADR-014](ADR-014-CLOUD-LOCAL-MODES.md) | Cloud dan local memakai domain contract sama | Accepted | `PARTIALLY_IMPLEMENTED` |
