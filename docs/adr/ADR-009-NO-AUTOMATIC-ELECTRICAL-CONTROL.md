# ADR-009: Tidak ada kontrol listrik otomatis pada MVP

## Status
Accepted

## Context
Firmware legacy memiliki closed-loop IR AC. Scope kompetisi adalah decision support dan tidak mengizinkan kontrol listrik AC otomatis.

## Decision
Build MVP bersifat measurement-only. Recommendation tidak mengirim command fisik. Jalur IR legacy diisolasi/deprecated dan tidak dihapus sampai reference serta hardware impact dipetakan.

## Alternatives
Mempertahankan auto-control; mengizinkan command setelah global opt-in; menghapus seluruh IR segera.

## Consequences
Risiko keselamatan dan scope berkurang. Demo tindakan menggunakan user decision/outcome atau simulasi, sementara eksperimen IR memerlukan profile terpisah jika tetap dipertahankan.
