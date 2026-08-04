# ADR-001: PZEM-004T V3.0 sebagai meter listrik utama

## Status
Accepted

## Context
Firmware aktual memakai ZMPT101B/SCT013 via ADC dan perhitungan daya manual. Target memerlukan tegangan, arus, daya aktif, energi aktif, frekuensi, dan faktor daya dari satu meter.

## Decision
PZEM-004T V3.0 menjadi meter listrik utama MVP. Sensor legacy dipertahankan sementara sebagai legacy/migration evidence sampai build dan HIL PZEM lulus. PZEM hanya untuk pengukuran; pemasangan AC diperiksa orang yang kompeten.

## Alternatives
Mempertahankan sensor ADC; memakai smart plug; memakai meter industri lain.

## Consequences
Contract data menjadi lebih lengkap dan perhitungan daya manual tidak lagi canonical. Dibutuhkan hardware, review wiring, UART, library, calibration/comparison test, dan adapter field legacy.
