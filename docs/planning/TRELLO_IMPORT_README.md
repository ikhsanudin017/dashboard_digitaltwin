# Trello Import - 90 Hari

File siap import:
- [TRELLO_IMPORT_90_HARI.csv](TRELLO_IMPORT_90_HARI.csv)

## Update Report (20 April 2026)
- Report audit terbaru dibuat terpisah di file: `docs/reports/REPORT_PENGEMBANGAN_CODE_HEALTH_SECURITY.md`.
- Fokus utama pengembangan tetap pada stabilisasi, code health, dan security hardening terlebih dahulu.
- **Closed-loop control ditempatkan sebagai opsi terakhir** dalam urutan pengembangan.

## Cara Pakai di Trello
1. Buka Trello.
2. Buat board baru atau buka board existing.
3. Pilih menu import CSV (Workspace/Table View/Importer yang tersedia di akun Anda).
4. Upload file `TRELLO_IMPORT_90_HARI.csv`.
5. Mapping kolom:
   - `Name` -> Card Name
   - `Description` -> Description
   - `List` -> List
   - `Labels` -> Labels
6. Jalankan import.

## Struktur yang Diimport
- 12 card (Week 01 sampai Week 12)
- List otomatis berdasarkan fase:
  - Bulan 1 - Stabilization
  - Bulan 2 - Reliability
  - Bulan 3 - Maturity
- Label per card:
  - Prioritas (`P0`, `P1`, `P2`)
  - Identitas minggu (`Week-01` sampai `Week-12`)

## Catatan
- Checklist ditulis di Description dengan format markdown `- [ ]`.
- Jika importer Trello Anda tidak membaca markdown checklist sebagai checklist native, ubah menjadi checklist native setelah import dengan copy isi section Checklist tiap card.
- Eksekusi card terkait closed-loop control dilakukan setelah seluruh gate P0 dan P1 terpenuhi.
