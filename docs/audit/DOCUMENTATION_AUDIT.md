# Documentation Audit

## Kondisi aktual

Dokumentasi lama cukup kaya secara naratif, tetapi tidak dapat menjadi sumber kebenaran karena mencampur implementasi, contoh, target, dan hasil aktual. Banyak file juga mengalami mojibake pada emoji, simbol derajat, panah, dan box drawing.

## Ketidaksesuaian utama

| Dokumen/klaim | Kondisi source | Status |
|---|---|---|
| README menyatakan TwinSpace v1.0 lengkap | Build gagal dan beberapa service hilang | Tidak akurat |
| README menyebut PZEM target | Tidak ada pada README/source lama; masih ZMPT/SCT | Belum sinkron |
| README menyebut `scripts/*` | Folder/file tidak ada | Broken reference |
| README menautkan LICENSE/CHANGELOG | File tidak ada | Broken reference |
| Frontend README menyebut `useMQTT.js` | File sudah menjadi `useAzureTelemetry.js` | Stale |
| Camera setup menyebut `camera_stream_server.py` | File tidak ada | Stale |
| CLAUDE.md menyebut `local_api.py` | File tidak ada | Stale/untracked |
| ML README menyajikan R²/akurasi | Split acak dan target sintetis; bukan forecast horizon | Klaim perlu ditarik |
| Azure README menyebut akurasi 0.96 | Cloud function rule-based, bukan model artifact | Klaim menyesatkan |
| TinyML report berstatus “Complete” | Banyak contoh hanya proposal | Status tidak valid |
| CI disebut siap deploy | Workflow tidak deploy dan banyak check di-skip | Tidak akurat |

## Branding inventory

Nama TwinSpace ditemukan pada root README, UI dashboard/login, local storage keys, fallback admin name, icon filename, environment example, dan dokumentasi. Penggantian harus melalui adapter/migration agar tidak memutus local storage/session atau deployment.

## Dokumentasi yang belum ada pada snapshot awal

- Product baseline dan status feature formal
- Architecture aktual/target serta ADR
- API/OpenAPI/MQTT contract
- Hardware PZEM dan electrical safety
- Test strategy dan acceptance evidence
- Threat model, incident response, secret management
- Local demo/GEMASTIK runbook
- Contribution/release/security policy

## Aturan perbaikan

1. README utama hanya menjadi portal dan menampilkan status aktual.
2. Semua metrik memakai kolom `TARGET`, `HASIL AKTUAL`, metode, dan status.
3. Contoh arsitektur diberi label target; diagram aktual dipisah.
4. Legacy docs tidak dihapus sebelum migration map dan referensi diverifikasi.
