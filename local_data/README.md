# Local Data

Folder ini dipakai untuk menyimpan data runtime lokal agar root project tetap rapi.

## Isi Folder

- `azurite/`
  - Menampung artefak lokal Azurite seperti `__azurite_db_queue__.json`, `__azurite_db_queue_extent__.json`, dan `__queuestorage__/`.

## Catatan

- Isi `local_data/` **tidak** untuk production.
- File di `local_data/azurite/` diabaikan oleh git (kecuali `.gitkeep`).
- Jika Azurite dijalankan dari root tanpa opsi lokasi, file bisa muncul lagi di root. Jalankan Azurite dengan lokasi `local_data/azurite` agar tetap rapi.
