# Repository Cleanup Report — 2026-08-04

## Baseline

- Branch: `main`
- Commit awal: `ed4a22292b45423946a70f4472a1a989f31571eb`
- Working tree sebelum cleanup: tidak bersih
- Commit/deployment yang dilakukan: tidak ada

Cleanup dilaksanakan pada working tree yang sudah memiliki perubahan pengguna. Tidak ada perubahan lama yang di-reset, ditimpa, atau dimasukkan ke commit otomatis.

## Hasil

Sekitar **646.6 MB** cache, generated dependency, compilation database, dan local artifact dihapus. Source asset, model 3D, model ML, YOLO weight, MBTiles, local environment, serta file operasional yang belum pasti dipertahankan.

## File dan Folder yang Dihapus

| Path | Kategori | Recovery |
|---|---|---|
| `view_virtual/node_modules/` | Generated dependency tree | Jalankan `npm ci` |
| `ml_models/__pycache__/` | Python bytecode cache | Dibuat ulang Python |
| `raspberry_pi/__pycache__/` | Python bytecode cache | Dibuat ulang Python |
| `sensor iot/raspberry-pi/__pycache__/` | Python bytecode cache | Dibuat ulang Python |
| `sensor iot/.cache/` | Tracked clangd index cache, 290 file | Dibuat ulang clangd |
| `sensor iot/compile_commands.json` | Generated compilation database | `pio run -t compiledb` |
| `Screenshot-2025-10-13-163215-1536x731.png` | Untracked dan tidak direferensikan | Tidak tersedia di Git |
| `view_virtual/env.example.txt` | Duplicate/unsafe legacy environment template | Riwayat Git; diganti `.env.example` canonical |
| `view_virtual/src/components/AlertSettings.vue` | Empty, unimported placeholder | Riwayat Git |
| `view_virtual/src/composables/useAlerts.js` | Empty, unimported placeholder | Riwayat Git |

## Perubahan Pendamping

- `.gitignore` sekarang mencegah `__pycache__`, Python bytecode, `.cache`, dan `compile_commands.json` kembali ter-track.
- `package-lock.json` tidak lagi di-ignore agar instalasi dependency reproducible.
- `view_virtual/.env.example` diganti dengan template canonical berbasis placeholder dan peringatan bahwa `VITE_*` bersifat publik.
- README dashboard dan `.github` diringkas agar sesuai tanggung jawab modul serta tidak mengklaim placeholder kosong sebagai fitur.
- Referensi setup utama diarahkan ke `view_virtual/.env.example`.

## File yang Sengaja Dipertahankan

- `AdminDashboard.vue`: kosong tetapi masih di-import dan merupakan blocker build, bukan junk aman.
- `view_virtual/public/models/**` dan `public/cesium/**`: runtime/offline visualization assets.
- `sensor iot/raspberry-pi/yolov3-tiny.weights`: edge model aktif.
- `ml_models/models/**`: inference artifacts yang masih direferensikan.
- `yogyakarta.mbtiles` dan `local_tileserver.py`: local map prototype yang saling direferensikan.
- `api_endpoints.txt`: membutuhkan security/credential review terpisah; tidak dihapus sebagai junk.
- File `.env` ignored: konfigurasi lokal pengguna.
- `.claude/`, `.vscode/`, `.gitkeep`: tooling atau placeholder yang masih memiliki tujuan.

## Validasi

- Semua target removal telah diperiksa tidak lagi ada pada filesystem.
- Referensi aktif ke `env.example.txt`, `AlertSettings`, `useAlerts`, dan screenshot telah dibersihkan.
- JSON manifest/config diperiksa secara terpisah setelah cleanup.
- Python source diperiksa melalui AST parsing tanpa menghasilkan bytecode cache.
- Frontend unit test sebelumnya exit code 0 dengan 113 deklarasi test sebelum `node_modules` dihapus.
- Frontend build sebelumnya gagal pada `AdminDashboard.vue`; cleanup tidak menyebabkan atau menyembunyikan blocker tersebut.
- Test/build frontend setelah cleanup memerlukan `npm ci` dan tidak dijalankan ulang tanpa dependency tree.
- PlatformIO tetap tidak tersedia pada environment audit.

## Risiko Tersisa

1. Credential yang pernah terpapar tetap harus dirotasi; menghapus template current-tree tidak membersihkan Git history.
2. `api_endpoints.txt` memerlukan keputusan pemilik dan sanitasi terpisah.
3. `AdminDashboard.vue` tetap memblokir production build.
4. Bundle Cesium dan duplikasi library visualisasi memerlukan reference/bundle test sebelum dapat dikurangi.
5. Working tree masih memuat perubahan pengguna yang tidak terkait cleanup.

## Langkah Berikutnya

1. Review diff cleanup dan pisahkan dari perubahan aplikasi sebelum commit.
2. Rotasi credential yang tercatat pada security audit.
3. Jalankan `npm ci`, unit test, dan build setelah dependency dapat diunduh.
4. Pulihkan implementasi `AdminDashboard.vue` dengan task terpisah.
5. Lanjutkan inventarisasi struktur sebelum melakukan `git mv` apa pun.
