# Security Audit

## Status

**FAIL / tindakan P0 diperlukan.** Audit ini tidak mencantumkan nilai credential.

## Temuan

| ID | Severity | Temuan | Bukti lokasi | Risiko | Tindakan |
|---|---|---|---|---|---|
| SEC-001 | Critical | Credential cloud/device yang tampak aktif berada pada file lokal belum terlacak | `api_endpoints.txt` | Akses write/function/device | Rotasi segera; pindahkan catatan ke secret manager; hapus aman setelah persetujuan |
| SEC-002 | Critical | Credential broker pernah berada pada file contoh terlacak dan masih ada di riwayat Git | `view_virtual/env.example.txt` (dihapus dari current tree 2026-08-04) | Publish/subscribe tanpa izin | Rotasi, audit broker ACL, dan bersihkan riwayat secara terkoordinasi |
| SEC-003 | High | Token layanan peta memiliki fallback hardcoded di frontend | `view_virtual/src/lib/appConfig.js`, `CesiumViewer.vue` | Penyalahgunaan kuota/aset | Rotasi/restrict origin; environment-only; tanpa fallback |
| SEC-004 | Critical | Password admin lokal dipasok sebagai `VITE_*` dan dibandingkan di browser | `useFirebaseAuth.js` dan konfigurasi lokal | Credential terlihat dalam bundle | Hapus mode ini dari production; gunakan backend/Firebase claims |
| SEC-005 | High | Function write key dipasok ke frontend | `useAzureTelemetry.js` | Semua pengguna bundle dapat menulis data | Gunakan authenticated backend/BFF dan identity-scoped authorization |
| SEC-006 | High | Password SSH nyata tampak dalam dokumen terlacak | `docs/reports/RPI_SETUP_STATUS_2026-05-05.md` | Akses perangkat | Rotasi, hapus dari dokumen/history, gunakan key-based SSH |
| SEC-007 | High | Endpoint telemetry/rekomendasi anonymous dan CORS `*` | Function JSON/source | Data exposure/abuse | Auth, allowlist, rate limit, least privilege |
| SEC-008 | High | Endpoint camera frame/MJPEG/snapshot tanpa auth, bind `0.0.0.0` | dua service Raspberry Pi | Pelanggaran privasi | Metadata-only default; auth/network ACL; stream opt-in |
| SEC-009 | Medium | Payload dan error tidak divalidasi/ditutup | Azure Functions/Flask | Injection, DoS, info leak | JSON Schema, size/range limit, generic error response |
| SEC-010 | Medium | Full telemetry/payload dicatat | ingestion/function logs | Data leakage/log injection | Redaction dan structured logging |
| SEC-011 | High | Tidak ada secret scanning quality gate | CI | Kebocoran berulang | Gitleaks/secret scanning blocking |
| SEC-012 | Medium | Pickle artifacts dimuat langsung | ML API | Code execution jika artifact diganti | Trusted artifact store, hash/signature, restricted write |
| SEC-013 | Medium | API reload model tidak diautentikasi | `prediction_api.py` | Availability/integrity | Lindungi endpoint atau hilangkan dari production |
| SEC-014 | Medium | CI dependency audit memakai `|| true` | `.github/workflows/ci.yml` | Vulnerability tidak memblokir merge | Jadikan threshold eksplisit dan blocking |

## Catatan riwayat Git

Pencarian pola terbatas menemukan file credential/token pada beberapa commit historis. Commit lama juga menunjukkan upaya security cleanup, tetapi secret kembali muncul melalui perubahan berikutnya. Karena secret yang pernah masuk Git harus dianggap bocor, menghapus nilai pada branch saat ini saja tidak cukup; rotasi tetap wajib.

## STRIDE ringkas

| Ancaman | Contoh saat ini | Kontrol target |
|---|---|---|
| Spoofing | device/function key bersama | Per-device identity, token pendek, Firebase/Entra validation |
| Tampering | endpoint write dari browser | AuthZ server, schema signature/idempotency |
| Repudiation | tidak ada audit keputusan | Audit event immutable dengan actor/timestamp |
| Information disclosure | camera stream/log payload/secret | Metadata-only, redaction, TLS, access policy |
| Denial of service | endpoint anonymous tanpa limit | Rate limit, quota, bounded payload, backpressure |
| Elevation of privilege | local admin credential di bundle | Server-side roles/claims dan least privilege |

## Checklist respons P0

1. Inventaris pemilik setiap credential dan catat waktu rotasi.
2. Rotasi broker, Azure device key, Function key, token peta, dan password SSH yang terpapar.
3. Verifikasi log/access sebelum dan sesudah rotasi.
4. Sanitasi file tracked/untracked tanpa mencatat nilai lama di commit message.
5. Jalankan secret scan current tree dan full history.
6. Jika history rewrite dipilih, koordinasikan clone/fork/deployment sebelum eksekusi.

Perubahan credential dan history rewrite sengaja belum dilakukan karena memerlukan persetujuan dan koordinasi deployment.
