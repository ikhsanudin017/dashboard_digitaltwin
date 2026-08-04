# Traceability Matrix

| Klaim produk | Lokasi kode | Pengujian | Dokumentasi | Status | Gap |
|---|---|---|---|---|---|
| Monitoring listrik satu ruangan | Firmware legacy + Azure API + dashboard | Frontend mock test saja | README lama | `PARTIALLY_IMPLEMENTED` | Belum PZEM/roomId/E2E |
| Monitoring suhu/kelembapan | DHT11 firmware + dashboard | Frontend mock test | README lama | `IMPLEMENTED_NOT_VERIFIED` | HIL tidak ada |
| PZEM-004T via UART/PZEM004Tv30 | Tidak ada | Tidak ada | PRD/ADR target | `PLANNED` | Implementasi dan wiring safety |
| Telemetry real-time | Azure HTTP polling 5 detik | Composable test lulus | Audit/architecture | `IMPLEMENTED_AND_VERIFIED` | Hanya unit; cloud belum diverifikasi |
| Historis | Azure Table API + localStorage | Test frontend parsial | README lama | `PARTIALLY_IMPLEMENTED` | Retention/query contract |
| Rumah 3D dengan satu ruang aktif | Babylon model/mapping | Build gagal | Architecture target | `PARTIALLY_IMPLEMENTED` | Active room semantic belum ada |
| Occupancy edge-only | Dua service camera | Tidak ada | README edge lama | `IMPLEMENTED_NOT_VERIFIED` | Benchmark/privacy enforcement |
| Tidak menyimpan video | Tidak ada disk writer produksi | Tidak ada | Audit/security | `IMPLEMENTED_NOT_VERIFIED` | Stream raw masih terbuka |
| Forecast 30 menit | Model same-row | Metrik lama invalid | ML README lama | `PARTIALLY_IMPLEMENTED` | Future target/time split |
| Forecast 60 menit | Tidak ada | Tidak ada | PRD target | `PLANNED` | Semua layer |
| Deteksi anomali | Rule firmware + heuristic UI | Tidak ada | TinyML report | `PARTIALLY_IMPLEMENTED` | Entity/evidence/test |
| Scenario what-if | Tidak ada | Tidak ada | PRD target | `PLANNED` | Engine/schema/UI |
| Rekomendasi beralasan | Azure rule + Flask + UI | Composable fallback test | README lama | `PARTIALLY_IMPLEMENTED` | Contract/lifecycle/evidence |
| Human-in-the-loop | UI emit/alert | Tidak ada | PRD/ADR | `PARTIALLY_IMPLEMENTED` | Persistence accepted/rejected |
| Outcome feedback | Tidak ada | Tidak ada | PRD target | `PLANNED` | Schema/service |
| Cloud mode | Azure/Vercel code | Tidak diverifikasi | README lama | `IMPLEMENTED_NOT_VERIFIED` | Deployment evidence |
| Local/offline mode | Cache/fallback/tile prototype | Tidak ada E2E | Architecture target | `PARTIALLY_IMPLEMENTED` | Broker/db/backend/replay |
| Aman dari secret | Ignore/examples parsial | Scan pola gagal | Security audit | `BLOCKED` | Rotasi/history scan |
| Dashboard release-ready | Vue source | Unit test lulus; build gagal | Testing audit | `BLOCKED` | Empty AdminDashboard |
| Kontrol tetap pada pengguna | UI review ada; firmware auto-control ada | Tidak ada | PRD/ADR | `BLOCKED` | Nonaktifkan/remove jalur otomatis MVP |
