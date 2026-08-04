# Migration Map

Tidak ada perpindahan atau penghapusan yang dilakukan pada checkpoint ini.

| Lokasi lama | Lokasi baru | Status | Alasan | Risiko | Tindakan |
|---|---|---|---|---|---|
| `view_virtual/` | `apps/dashboard/` | PROPOSED | Nama tanggung jawab jelas | Vercel path/import/cache | Pindah setelah build hijau dan deployment map diverifikasi |
| `sensor iot/` | `firmware/esp32-energy-node/` | PROPOSED | Hilangkan spasi dan pisahkan firmware | PlatformIO path/workflow | Modularisasi in-place lebih dulu |
| `sensor iot/src/main.cpp` sensor ADC | adapter legacy di firmware | DEPRECATED | Diganti PZEM | Kehilangan prototipe yang masih aktif | Pertahankan di branch/history hingga HIL PZEM lulus |
| `sensor iot/raspberry-pi/` | `edge/occupancy-ai/` | PROPOSED | Kandidat edge canonical | Service remote mungkin memakai path lama | Inventaris systemd/deployment dahulu |
| `raspberry_pi/yolo_cam_dashboard.py` | `edge/occupancy-ai/experiments/yolov8_service.py` | INVESTIGATE | Implementasi alternatif | Salah pilih model canonical | Benchmark dua implementasi |
| `ml_models/` | `ml/` + `services/prediction-service/` | PROPOSED | Pisahkan training/inference/artifact | Path pickle dan cron | Tambah tests/model card sebelum pindah |
| `sensor iot/azure-setup/azure-function/IoTHubToStorage` | `services/ingestion-service/` | PROPOSED | Domain ingestion eksplisit | Function app layout | Tambah schema adapter lalu migrasi |
| `GetTelemetryData` | backend API/read model | PROPOSED | Pisahkan query dari ingestion | Endpoint publik aktif | Pertahankan route compatibility |
| `GetACRecommendation` | `services/decision-engine/legacy-rule-adapter` | DEPRECATED | Bukan ML aktual/lifecycle formal | Dashboard masih memanggil | Version route dan beri label experimental |
| `ml_models/models/*.pkl` | `ml/artifacts/energy-forecast/v1/` | BLOCKED | Perlu provenance/hash | Artifact incompatibility | Jangan pindah sebelum model baru direproduksi |
| `view_virtual/public/cesium/` | build/dependency-managed assets | INVESTIGATE | Duplikasi package npm | Offline map dapat rusak | Ukur referensi dan bundle dahulu |
| `sensor iot/.cache/` | tidak dilacak | REMOVED_2026-08-04 | Artefak IDE | Tidak ada runtime risk | Dihapus setelah reference check; `.cache/` di-ignore |
| `sensor iot/compile_commands.json` | generated local file | REMOVED_2026-08-04 | Path absolut mesin lain | IDE convenience | Dihapus; dapat dibuat ulang dengan `pio run -t compiledb` |
| `view_virtual/env.example.txt` | `view_virtual/.env.example` | REMOVED_2026-08-04 | Duplikasi berisi credential | Credential aktif/history | Current tree dihapus; rotasi dan history cleanup tetap wajib |
| `api_endpoints.txt` (untracked) | secret manager/private runbook | BLOCKED_SECURITY | Mengandung credential aktif | Akses layanan | Rotasi dan minta persetujuan sebelum menghapus |
| `TwinSpace` UI/storage keys | `Twinuvo AI` + versioned keys | PROPOSED | Branding resmi | Logout/cache loss | Tambah migration fallback satu release |
| MQTT/device topic legacy | `twinuvo/v1/rooms/{roomId}/...` | PROPOSED | Contract multi-room | Memutus publisher/subscriber | Jalankan dual-publish/adapter saat transisi |
| Azure Table field legacy (`suhu`, `daya`) | versioned canonical fields | PROPOSED | Unit dan naming konsisten | Historical queries | Read adapter dan backfill opsional |
| `docs/reports/TINYML_ESP32_REPORT.md` | `docs/archive/legacy/` | PROPOSED | Klaim bercampur proposal | Referensi tim | Tambah banner legacy sebelum memindah |
| `docs/reports/RPI_SETUP_STATUS_2026-05-05.md` | sanitized private incident record | BLOCKED_SECURITY | Mengandung credential/IP | Kehilangan incident context | Rotasi credential, sanitasi, simpan ringkasan |
| `local_tileserver.py` + `yogyakarta.mbtiles` | `infrastructure/local/tiles/` | INVESTIGATE | Aset offline potensial | Path saat ini salah; lisensi belum jelas | Verifikasi lisensi dan perbaiki path lebih dulu |
