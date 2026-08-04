# Product Requirements Document — Twinuvo AI

## 1. Informasi dokumen

| Field | Nilai |
|---|---|
| Nama produk | Twinuvo AI |
| Judul karya | Twinuvo AI: Intelligent Digital Twin Berbasis Edge AI dan IoT untuk Prediksi Konsumsi Energi serta Optimasi Operasional Ruang Hunian |
| Versi dokumen | 0.1.0 |
| Status | Draft berbasis audit; belum disetujui sebagai release baseline |
| Pemilik | Tim Twinuvo AI (nama individu belum ditetapkan di repository) |
| Kontributor | Belum dicatat di repository |
| Tanggal dibuat | 2026-08-03 |
| Tanggal diperbarui | 2026-08-03 |

## 2. Ringkasan produk

Twinuvo AI adalah Intelligent Digital Twin untuk satu ruang hunian aktif yang divisualisasikan dalam konteks model rumah 3D. Produk menggabungkan telemetry energi dan lingkungan, histori, prediksi, deteksi anomali, simulasi what-if, serta rekomendasi beralasan. Produk merupakan **Decision Support System**: pengguna meninjau dan menyetujui atau menolak rekomendasi; sistem tidak mengendalikan listrik AC secara otomatis.

Repository saat ini masih merupakan prototipe legacy bernama TwinSpace. Fitur target dalam PRD tidak otomatis berarti sudah diimplementasikan. Status aktual dirujuk dari [Feature Inventory](../audit/FEATURE_INVENTORY.md).

## 3. Latar belakang masalah

- Konsumsi listrik rumah biasanya terlihat sebagai angka agregat yang sulit dihubungkan dengan aktivitas ruangan.
- Pengguna sulit mengenali pola normal, penyimpangan, dan penyebab perubahan konsumsi.
- Dashboard monitoring biasa bersifat reaktif dan belum memberi forecast terukur.
- Monitoring tanpa scenario tidak membantu pengguna membandingkan alternatif operasional.
- Hubungan energi, suhu, kelembapan, occupancy, waktu, dan durasi penggunaan sulit dianalisis manual.
- Rekomendasi yang tidak memiliki evidence, confidence, asumsi, dan risiko kenyamanan sulit dipercaya.

## 4. Tujuan produk

1. Memantau kondisi energi dan lingkungan satu ruangan secara near-real-time.
2. Menyimpan histori yang dapat ditelusuri dan dinilai kualitasnya.
3. Menampilkan satu ruangan aktif pada model rumah 3D.
4. Membentuk Twin State formal yang memisahkan raw, validated, current, dan derived state.
5. Memprediksi daya/energi 30 dan 60 menit ke depan setelah data mencukupi.
6. Mendeteksi penyimpangan dengan evidence yang dapat diperiksa.
7. Membandingkan baseline dan scenario alternatif tanpa menyatakan estimasi sebagai hasil aktual.
8. Memberi rekomendasi beralasan dengan human-in-the-loop dan feedback outcome.
9. Berjalan pada cloud mode dan local/offline competition mode.
10. Menyediakan fondasi modular untuk multi-room di masa depan.

## 5. Non-goals

- Tidak memonitor seluruh rumah pada MVP.
- Tidak mengontrol AC, lampu, stopkontak, atau switching listrik AC secara otomatis.
- Tidak menyimpan atau mengirim video/frame mentah ke cloud.
- Tidak melakukan simulasi fisika bangunan penuh.
- Tidak mengklaim penghematan, akurasi, uptime, atau usability sebelum diuji.
- Tidak menjadikan multi-room, mobile app, atau renewable integration sebagai scope MVP.

## 6. Pengguna target

- Penghuni rumah yang ingin memahami dan memperbaiki kebiasaan energi.
- Pengelola ruang yang memerlukan pemantauan dan rekomendasi operasional.
- Teknisi yang memerlukan status sensor, perangkat, dan kualitas data.
- Peneliti yang mengevaluasi hubungan lingkungan, occupancy, dan energi.
- Pengembang yang mengoperasikan serta mengembangkan platform.

## 7. Persona

| Persona | Tujuan dan motivasi | Perilaku/kebutuhan | Pain point | Keputusan |
|---|---|---|---|---|
| Penghuni | Nyaman dengan konsumsi efisien | Melihat ringkasan, alert, alasan sederhana | Data listrik sulit dimaknai | Menerima/menolak rekomendasi |
| Pengelola ruang | Operasi stabil dan terukur | Membandingkan pola, scenario, dan outcome | Sulit menghubungkan aktivitas dan konsumsi | Menetapkan tindakan operasional |
| Teknisi | Sensor dan pipeline sehat | Memerlukan quality, timestamp, device, log | Nilai fallback dapat terlihat valid | Memeriksa wiring/perangkat |
| Peneliti | Evaluasi yang dapat direproduksi | Dataset, split waktu, baseline, model card | Klaim lama tidak dapat diverifikasi | Memilih metode/model |
| Pengembang | Sistem aman dan maintainable | Contract, test, local setup, observability | Konfigurasi dan domain bercampur | Merilis atau menahan perubahan |

## 8. User stories

- Sebagai penghuni, saya ingin melihat kondisi energi dan kenyamanan ruang aktif agar dapat mengambil keputusan penggunaan yang tepat.
- Sebagai penghuni, saya ingin mengetahui apakah data aktual atau demo agar tidak salah menginterpretasikan tampilan.
- Sebagai pengelola, saya ingin membandingkan baseline dan scenario agar estimasi manfaat dan risiko terlihat sebelum bertindak.
- Sebagai teknisi, saya ingin melihat quality status dan last-seen per device agar gangguan sensor tidak dianggap kondisi ruangan.
- Sebagai peneliti, saya ingin melihat baseline, time split, metrik, dan model version agar hasil forecast dapat direproduksi.
- Sebagai pengguna, saya ingin menerima atau menolak rekomendasi agar kontrol tetap berada pada manusia.
- Sebagai pengembang, saya ingin menjalankan demo lokal tanpa internet agar presentasi tidak bergantung pada layanan eksternal.

## 9. Ruang lingkup MVP

- Pembacaan PZEM-004T V3.0 dan sensor suhu/kelembapan.
- Pengiriman, validasi, normalisasi, dan penyimpanan telemetry.
- Dashboard real-time, grafik historis, model rumah 3D, dan satu ruang aktif.
- Twin State, forecast 30/60 menit, anomali dasar, scenario, dan rekomendasi dasar.
- Persetujuan pengguna serta pencatatan outcome.
- Mode demo lokal/replay dan dokumentasi teknis.

Istilah hardware yang digunakan: **“ESP32 membaca data PZEM-004T V3.0 melalui antarmuka serial UART menggunakan library PZEM004Tv30.”** Library menangani protokol internal perangkat; aplikasi tidak mengimplementasikan Modbus secara manual.

> Peringatan keselamatan: pemasangan PZEM-004T pada listrik AC harus dilakukan atau diperiksa oleh orang yang memahami instalasi listrik. PZEM digunakan hanya sebagai alat pengukuran. Repository MVP tidak boleh menambahkan switching listrik AC.

## 10. Ruang lingkup masa depan

Multi-room, multi-device, smart plug terotorisasi, tarif listrik, aplikasi mobile, model lintas ruangan, kontrol dengan persetujuan eksplisit, renewable energy, dan Digital Twin skala bangunan. Semua item berstatus `PLANNED` dan memerlukan keputusan arsitektur baru.

## 11. Functional requirements

| ID | Nama | Deskripsi | Prioritas | Dependensi | Acceptance criteria ringkas | Status |
|---|---|---|---|---|---|---|
| FR-001 | Electrical sensing | Baca enam besaran PZEM dengan timestamp/quality | P0 | PZEM, ESP32, wiring review | Payload valid untuk read sukses/gagal | `PLANNED` |
| FR-002 | Environment sensing | Baca suhu dan kelembapan | P0 | Sensor lingkungan | Failure tidak diganti nilai seolah valid | `IMPLEMENTED_NOT_VERIFIED` |
| FR-003 | Versioned telemetry | Kirim schemaVersion, IDs, units, messageId | P0 | Schema v1 | Validator menerima valid dan menolak invalid | `PLANNED` |
| FR-004 | Ingestion | Validasi, normalisasi, dedup, dan persist | P0 | FR-003, storage | Duplicate tidak membuat data ganda | `PARTIALLY_IMPLEMENTED` |
| FR-005 | Twin State | Bentuk current/historical/quality state | P0 | FR-004 | State per room deterministik | `PLANNED` |
| FR-006 | Dashboard | Tampilkan actual/demo, real-time, history, quality | P0 | API/Twin State | UI membedakan data aktual, cache, demo | `PARTIALLY_IMPLEMENTED` |
| FR-007 | 3D active room | Tampilkan satu ruang aktif dalam rumah | P1 | Model 3D, FR-005 | Hanya room aktif memetakan state | `PARTIALLY_IMPLEMENTED` |
| FR-008 | Forecast | Prediksi daya/energi 30 dan 60 menit | P1 | Histori cukup | Baseline dan test-window dilaporkan | `PARTIALLY_IMPLEMENTED` |
| FR-009 | Anomaly | Deteksi rule/statistical/residual | P1 | FR-005/008 | Evidence, severity, confidence tersedia | `PARTIALLY_IMPLEMENTED` |
| FR-010 | Scenario | Bandingkan baseline dan alternatif | P1 | FR-008 | Saving diberi label estimasi | `PLANNED` |
| FR-011 | Recommendation | Hasilkan tindakan, alasan, evidence, risk | P1 | FR-009/010 | Tidak dieksekusi otomatis | `PARTIALLY_IMPLEMENTED` |
| FR-012 | Human decision | Review/accept/reject/expire recommendation | P0 | Auth, audit log | Actor dan timestamp tersimpan | `PARTIALLY_IMPLEMENTED` |
| FR-013 | Outcome feedback | Catat before/after dan feedback | P1 | FR-012 | Prediksi dan perubahan aktual dibedakan | `PLANNED` |
| FR-014 | Edge occupancy | Kirim count/confidence/IDs/version saja | P2 | Kamera, Raspberry Pi | Tidak ada frame ke cloud | `PARTIALLY_IMPLEMENTED` |
| FR-015 | Local demo | Jalankan broker/backend/db/dashboard/replay lokal | P0 | Orchestration lokal | Demo selesai tanpa internet | `PARTIALLY_IMPLEMENTED` |
| FR-016 | Cloud mode | Jalankan pipeline cloud dengan contract sama | P1 | Azure config | E2E deployment tervalidasi | `IMPLEMENTED_NOT_VERIFIED` |

## 12. Non-functional requirements

| ID | Area | Requirement | Verifikasi | Status |
|---|---|---|---|---|
| NFR-001 | Performa | TARGET latensi dashboard rata-rata ≤ 5 detik | Test latency terukur | `BELUM DIUJI` |
| NFR-002 | Keamanan | Tidak ada secret di source/browser; least privilege | Current+history scan, access test | `BLOCKED` |
| NFR-003 | Privasi | Metadata occupancy minimum; stream raw default off | Privacy test/config review | `PARTIALLY_IMPLEMENTED` |
| NFR-004 | Reliabilitas | Retry bounded, offline buffer, idempotency | Fault injection | `PLANNED` |
| NFR-005 | Maintainability | Service boundaries, contract, test, README | Review/CI | `PARTIALLY_IMPLEMENTED` |
| NFR-006 | Scalability | IDs/partitioning siap multi-room | Contract/load review | `PLANNED` |
| NFR-007 | Usability | TARGET SUS ≥ 70 bila diuji | SUS study | `BELUM DIUJI` |
| NFR-008 | Portability | Cloud dan local mode memakai schema yang sama | E2E kedua mode | `PLANNED` |
| NFR-009 | Observability | Structured logs, health, correlation/message ID | Integration test | `PLANNED` |
| NFR-010 | Compatibility | Adapter payload legacy selama transisi | Contract test | `PLANNED` |

## 13. Data dan privasi

| Data | Sumber | Unit/format | Sensitivitas | Retensi awal |
|---|---|---|---|---|
| Electrical telemetry | PZEM | V, A, W, kWh, Hz, ratio | Operasional rumah | Belum ditetapkan |
| Environment | Sensor | °C, %RH | Operasional rumah | Belum ditetapkan |
| Occupancy aggregate | Edge | count, confidence | Potensial sensitif | Minimum yang diperlukan |
| Twin/derived state | Engines | Versioned JSON | Operasional/analitik | Belum ditetapkan |
| User decision/outcome | Pengguna/sistem | Audit event | Identitas/operasional | Belum ditetapkan |

Video mentah tidak disimpan dan tidak dikirim ke cloud. Akses harus dibatasi sesuai role; deletion/retention policy dan audit log perlu ditetapkan sebelum deployment produksi. Secret, credential, dan raw frame tidak termasuk telemetry yang diizinkan.

## 14. Metrik keberhasilan

| Metrik | TARGET | Hasil aktual | Metode | Status |
|---|---:|---:|---|---|
| Galat tegangan | ≤ 3% | — | Banding alat referensi | `BELUM DIUJI` |
| Galat arus | ≤ 5% | — | Banding alat referensi | `BELUM DIUJI` |
| Galat daya | ≤ 5% | — | Banding alat referensi | `BELUM DIUJI` |
| Packet loss | < 1% | — | Sequence/message ID test | `BELUM DIUJI` |
| Latensi dashboard rata-rata | ≤ 5 s | — | Timestamp end-to-end | `BELUM DIUJI` |
| Occupancy accuracy | ≥ 90% bila kamera digunakan | — | Labeled test set | `BELUM DIUJI` |
| MAPE forecast 30 menit | ≤ 15–20% | — | Time-based holdout | `BELUM DIUJI` |
| Uptime pengujian | ≥ 95% | — | Soak test | `BELUM DIUJI` |
| SUS | ≥ 70 bila studi dilakukan | — | SUS questionnaire | `BELUM DIUJI` |

## 15. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data historis tidak cukup | Forecast tidak valid | Mulai baseline sederhana; jangan klaim metrik |
| Sensor/PZEM gagal | State salah/stale | Quality status, last-seen, alert, HIL test |
| Wiring AC salah | Cedera/kerusakan | Review personel kompeten; measurement-only |
| Internet/cloud/MQTT putus | Telemetry hilang/demo gagal | Buffer, retry bounded, local mode, replay |
| Model/sensor drift | Keputusan menurun | Monitoring distribusi, rekalibrasi, versioning |
| Kamera tidak akurat | Occupancy menyesatkan | Confidence, opt-out, aggregate-only, benchmark |
| Secret bocor | Pengambilalihan layanan | Rotasi, secret manager, blocking scan |
| Timestamp tidak sinkron | Urutan/state salah | UTC, source timestamp, ingest timestamp, NTP health |
| Scenario optimistis | Keputusan salah | Assumptions/limitations/confidence dan outcome |
| Fallback terlihat aktual | Klaim demo menyesatkan | Label source/mode yang selalu terlihat |

## 16. Dependensi

ESP32, PZEM-004T V3.0, sensor suhu/kelembapan, Raspberry Pi/kamera opsional, jaringan, PZEM004Tv30, MQTT/API, storage, model 3D, dataset time-series, ruang dan pengguna uji, toolchain build, serta layanan Azure untuk cloud mode. Ketersediaan aktual tiap dependency dicatat di [Dependency Audit](../audit/DEPENDENCY_AUDIT.md).

## 17. Acceptance criteria

- **AC-001** — Given PZEM tersedia dan wiring telah diperiksa, when ESP32 membaca sample valid, then payload memuat enam besaran listrik, unit, timestamp, IDs, `schemaVersion`, dan quality valid.
- **AC-002** — Given sensor timeout/out-of-range, when telemetry dibentuk, then nilai tidak diganti dummy seolah aktual dan quality menunjukkan invalid/stale.
- **AC-003** — Given message duplikat, when ingestion memprosesnya, then hanya satu record canonical dibuat dan duplicate tercatat.
- **AC-004** — Given Twin State `ROOM-01`, when dashboard memperbarui visual, then hanya ruang aktif yang berubah dan source data terlihat.
- **AC-005** — Given dataset berurutan waktu, when forecast dievaluasi, then split waktu, naive baseline, horizon, metrik, model version, dan artifact hash dilaporkan.
- **AC-006** — Given sebuah scenario, when hasil ditampilkan, then baseline, estimasi alternatif, asumsi, confidence, comfort risk, horizon, dan limitations tersedia.
- **AC-007** — Given rekomendasi dibuat, when tidak ada persetujuan pengguna, then tidak ada perintah kontrol perangkat dikirim.
- **AC-008** — Given internet tidak tersedia, when runbook demo dijalankan, then alur normal→anomali→scenario→decision→outcome dapat diulang lokal.
- **AC-009** — Given repository dipindai, when CI selesai, then secret current tree tidak ditemukan dan hasil dependency/test tidak di-bypass.

## 18. Roadmap

Urutan resmi: Audit → Foundation → Reliable sensing/ingestion → Dashboard/Twin State → Prediction → Anomaly → Scenario/Decision → Evaluation → Competition hardening → Multi-room. Detail dan gate terdapat pada [Roadmap](ROADMAP.md).
