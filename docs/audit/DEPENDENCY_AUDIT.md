# Dependency Audit

## Ringkasan

| Area | Manifest/lock | Kondisi | Status |
|---|---|---|---|
| Dashboard | `view_virtual/package.json`, lockfile terlacak | Dependency terpasang; `npm ls` lulus | `PARTIALLY_IMPLEMENTED` |
| Root Node | `package.json`, tanpa lockfile | Entry point yang disebut tidak ada | `PARTIALLY_IMPLEMENTED` |
| Azure Functions | `package.json`, tanpa lockfile | Reproducibility dan test belum ada | `PARTIALLY_IMPLEMENTED` |
| ML Python | `requirements.txt` | Pin lama dan dependency runtime hilang | `PARTIALLY_IMPLEMENTED` |
| Raspberry Pi YOLOv8 | `requirements.txt` | `ultralytics` tidak dipasang eksplisit | `PARTIALLY_IMPLEMENTED` |
| Raspberry Pi YOLOv3 | `requirements.txt` | Optional runtime (`azure-iot-device`, `waitress`) tidak terdokumentasi lengkap | `PARTIALLY_IMPLEMENTED` |
| Firmware | `platformio.ini` | Tidak memiliki `PZEM004Tv30` | `BLOCKED` untuk target PZEM |

## Temuan detail

1. Root `.gitignore` mengabaikan semua `package-lock.json`, padahal lockfile frontend sudah terlacak. Kebijakan ini tidak konsisten dan dapat membuat service baru tidak reproducible.
2. ML scripts mengimpor `azure.data.tables` dan Flask CORS, tetapi `ml_models/requirements.txt` tidak menyertakan `azure-data-tables` dan `flask-cors`.
3. `raspberry_pi/yolo_cam_dashboard.py` membutuhkan `ultralytics` dan `numpy`; requirements hanya menyebut YOLO sebagai opsional, padahal import dilakukan unconditional.
4. Edge YOLOv3 mencoba `azure.iot.device` dan `waitress` jika tersedia, tetapi compatibility matrix tidak ada.
5. Frontend memasang Babylon, Cesium, `@cesium/engine`, Three, Leaflet, dan MapLibre sekaligus serta menyimpan bundle Cesium vendor. Ukuran dan overlap perlu diukur sebelum penghapusan.
6. Model `.pkl` tidak memiliki hash, provenance dependency, atau model card.
7. `compile_commands.json` berisi path toolchain komputer lain dan cache clangd terlacak; keduanya bukan dependency source.

## Vulnerability scan

- `npm audit` frontend dicoba melalui registry resmi pada 2026-08-03, tetapi request timeout. Hasil: **BELUM DIUJI**, bukan “0 vulnerability”.
- `pip-audit` dan Gitleaks tidak tersedia.
- Azure Functions tidak memiliki lockfile sehingga `npm ci`/audit deterministik belum dapat dilakukan.

## Tindakan

1. Sanitasi secret sebelum instalasi/scan eksternal lanjutan.
2. Tetapkan lockfile policy per service dan jangan mengabaikan lockfile aplikasi.
3. Pisahkan requirements training, inference, dan edge; gunakan constraints/hash bila stabil.
4. Tambahkan PZEM004Tv30 saat implementasi PZEM dimulai.
5. Hasilkan SBOM dan jalankan audit blocking di CI.
