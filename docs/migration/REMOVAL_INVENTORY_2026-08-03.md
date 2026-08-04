# Removal Inventory — 2026-08-03

## Baseline

| Field | Nilai |
|---|---|
| Branch | `main` |
| Commit awal | `ed4a22292b45423946a70f4472a1a989f31571eb` |
| Working tree | Tidak bersih sebelum cleanup; perubahan pengguna dipertahankan |
| Scope | Menghapus junk/generated yang terbukti, tanpa memindahkan struktur atau mengubah business logic |

Branch `chore/repository-structure` tidak dibuat pada checkpoint ini karena brief mensyaratkan working tree bersih, sedangkan repository telah memiliki perubahan pengguna dan dokumen untracked. Cleanup dilakukan sebagai working-tree change yang dapat ditinjau, tanpa commit.

## Kriteria keputusan

Kandidat hanya berstatus `DELETE` bila seluruh kondisi berikut terpenuhi:

1. Merupakan generated/cache/reproducible output atau file kosong tanpa consumer.
2. Tidak menjadi input runtime, test fixture, deployment asset, model aktif, atau dokumentasi yang masih unik.
3. Referensi source/deployment telah diperiksa.
4. Recovery jelas melalui package manager, regeneration tool, atau riwayat Git.

## Kandidat yang dihapus

| Path | Jenis | Bukti tidak diperlukan | Ukuran sebelum | Recovery | Keputusan |
|---|---|---|---:|---|---|
| `view_virtual/node_modules/` | Generated dependency tree | Ignored Git; source memakai lockfile; bukan source asset | 638,326,204 B | `npm ci` | `DELETE` |
| `ml_models/__pycache__/` | Python bytecode cache | Tidak tracked; dibuat ulang Python | 86,964 B | Jalankan Python | `DELETE` |
| `raspberry_pi/__pycache__/` | Python bytecode cache | Tidak tracked; dibuat ulang Python | 10,430 B | Jalankan Python | `DELETE` |
| `sensor iot/raspberry-pi/__pycache__/` | Python bytecode cache | Tidak tracked; dibuat ulang Python | 49,591 B | Jalankan Python | `DELETE` |
| `sensor iot/.cache/` | clangd index cache | 290 file tracked tetapi tidak direferensikan runtime/test/deploy | 2,547,008 B | clangd membuat ulang | `DELETE` |
| `sensor iot/compile_commands.json` | Generated compilation database | Hanya direferensikan konfigurasi IDE; dapat dibuat ulang PlatformIO | 3,702,369 B | `pio run -t compiledb` | `DELETE` |
| `Screenshot-2025-10-13-163215-1536x731.png` | Untracked local screenshot | Tidak memiliki satu pun referensi repository | 1,851,454 B | Tidak tersedia di Git; penghapusan diotorisasi pengguna | `DELETE` |
| `view_virtual/src/components/AlertSettings.vue` | Empty placeholder | Blob kosong; tidak pernah diimpor; hanya diklaim README lama | 0 B | Git history | `DELETE` |
| `view_virtual/src/composables/useAlerts.js` | Empty placeholder | Blob kosong; tidak pernah diimpor; hanya diklaim README lama | 0 B | Git history | `DELETE` |
| `view_virtual/env.example.txt` | Duplicate/unsafe legacy template | Source tidak memakai MQTT variables; `.env.example` menjadi template canonical | Tracked text | Git history | `DELETE` setelah template canonical disanitasi |

Total generated/local data yang dibersihkan sekitar **646.6 MB** sebelum filesystem allocation overhead.

## Kandidat yang dipertahankan

| Path | Alasan dipertahankan | Status |
|---|---|---|
| `view_virtual/src/components/AdminDashboard.vue` | Kosong tetapi di-import `App.vue`; penghapusan akan memutus route dan bukan cleanup aman | `KEEP_BLOCKED` |
| `view_virtual/public/models/**` | Model 3D dan texture direferensikan dashboard | `KEEP_ACTIVE` |
| `view_virtual/public/cesium/**` | Digunakan untuk asset Cesium/offline; penghapusan memerlukan bundle/reference test | `NEEDS_REVIEW` |
| `sensor iot/raspberry-pi/yolov3-tiny.weights` | Model edge runtime | `KEEP_ACTIVE` |
| `ml_models/models/**` | Model artifacts yang masih dimuat inference | `KEEP_ACTIVE` |
| `yogyakarta.mbtiles` | Direferensikan tile server dan dashboard prototype | `KEEP_EXPERIMENTAL` |
| `local_tileserver.py` | Direferensikan dashboard untuk local tile mode | `KEEP_EXPERIMENTAL` |
| `api_endpoints.txt` | Tidak direferensikan source, tetapi berisi catatan operasi/credential yang perlu rotasi dan keputusan terpisah | `KEEP_SECURITY_REVIEW` |
| File `.env` aktual yang ignored | Konfigurasi lokal pengguna; bukan junk meskipun tidak boleh di-commit | `KEEP_LOCAL_SECRET` |
| `.claude/` | Metadata/tooling lokal aktif; ukuran kecil | `KEEP_LOCAL_TOOLING` |
| `.vscode/` | Konfigurasi workspace; compilation database dapat diregenerasi | `KEEP_ACTIVE` |
| Empty `.gitkeep` Azurite | Menjaga placeholder runtime directory yang sengaja tracked | `KEEP_ACTIVE` |

## Perubahan pendamping

- Tambahkan ignore untuk `__pycache__/`, `*.py[cod]`, `.cache/`, dan `compile_commands.json`.
- Jangan ignore `package-lock.json`; lockfile aplikasi harus tetap reproducible.
- Ganti `view_virtual/.env.example` dengan placeholder-only canonical template.
- Ganti README dashboard dan `.github` yang stale/duplikatif dengan dokumentasi ringkas yang tidak mengklaim placeholder kosong sebagai fitur.
- Tidak melakukan history rewrite, credential rotation, deployment, atau pemindahan path.
