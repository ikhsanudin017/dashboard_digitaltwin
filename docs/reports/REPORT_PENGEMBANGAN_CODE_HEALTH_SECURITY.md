# Report Pengembangan Code Health dan Security

Tanggal: 20 April 2026
Scope: Review end-to-end IoT, Azure Function, ML pipeline, dan dashboard view virtual.

## 1. Ringkasan Eksekutif

Proyek sudah berada pada tahap digital twin yang baik untuk monitoring dan analytics:
- Telemetry perangkat sudah mengalir ke cloud.
- Data sudah tersimpan dan ditampilkan ke dashboard.
- Prediksi ML dan rekomendasi berbasis seluruh data sensor sudah tersedia (suhu, kelembaban, tegangan, arus, daya, dan people count), termasuk use case AC.

Fokus terpenting saat ini bukan menambah fitur baru, tetapi memperkuat fondasi:
- Kesehatan kode (kontrak data, testability, maintainability).
- Keamanan (credential hygiene, endpoint protection, auth enforcement).
- Reliability operasional (observability, error handling, data consistency).

Catatan strategis:
**Closed-loop control dijadikan opsi terakhir**, dieksekusi setelah seluruh gate keamanan dan stabilitas terpenuhi.

Catatan ruang lingkup rekomendasi:
Report ini membahas rekomendasi operasional untuk keseluruhan data sensor, bukan hanya pengaturan AC.

## 2. Area Perhatian Utama

### A. Code Health

1. Kontrak data rekomendasi multi-sensor belum konsisten antarmodul.
- Dampak: response cloud bisa tidak terbaca benar oleh frontend.
- Perlu perhatian: samakan schema request/response lintas frontend, function, dan ML API untuk seluruh fitur sensor.

2. Beberapa alur fallback rekomendasi sensor masih berpotensi membingungkan hasil akhir sumber data.
- Dampak: debugging lebih sulit saat terjadi failover.
- Perlu perhatian: tetapkan urutan fallback baku dan source tagging yang konsisten untuk telemetry dan rekomendasi multi-sensor.

3. Test coverage belum sepenuhnya fokus pada jalur berisiko tinggi.
- Dampak: regresi mudah lolos saat refactor.
- Perlu perhatian: tambah unit/integration test untuk payload contract, telemetry mapping, dan fallback.

### B. Security

1. Endpoint write/read penting masih longgar pada level auth.
- Dampak: risiko abuse, spam data, dan manipulasi data.
- Perlu perhatian: aktifkan auth untuk endpoint kritikal dan pisahkan read public vs write protected.

2. Credential sensitif masih ada di source perangkat/script.
- Dampak: kebocoran akses IoT dan cloud jika repo/log terekspos.
- Perlu perhatian: migrasi semua secret ke env/secret store, lakukan rotasi key setelah migrasi.

3. Akses admin di frontend masih sederhana.
- Dampak: kontrol admin rawan disalahgunakan jika tidak diperkuat.
- Perlu perhatian: ganti PIN statis dengan auth berbasis role + session policy.

### C. Reliability dan Operasional

1. Konsistensi data historis dan urutan query perlu dipastikan deterministik.
- Dampak: analytics bisa bias saat data besar.
- Perlu perhatian: pastikan filter/sort/limit stabil dan konsisten timezone.

2. Observability belum jadi standar lintas service.
- Dampak: root cause sulit ditemukan cepat.
- Perlu perhatian: structured logging, correlation id, dan baseline alert.

3. Konfigurasi endpoint antar environment masih perlu distandarkan.
- Dampak: deployment drift dan error environment-specific.
- Perlu perhatian: central config + startup validation untuk env wajib.

### D. Maturity Digital Twin

1. Model DTDL dan provisioning twin sudah ada.
- Nilai positif: fondasi semantic twin sudah tersedia.

2. Sinkronisasi runtime twin state perlu diperjelas sebagai source of truth.
- Dampak jika belum stabil: state antar komponen bisa tidak seragam.
- Perlu perhatian: tetapkan canonical twin state dan pipeline update yang baku.

## 3. Prioritas Pengembangan (90 Hari)

## Fase 1 (Hari 1-30) - Stabilization First

Tujuan:
- Menutup risiko paling tinggi pada keamanan dan kontrak data.

Fokus:
- Standarisasi payload rekomendasi multi-sensor (frontend/backend/ML) untuk suhu, kelembaban, tegangan, arus, daya, dan people count.
- Secret management tahap 1 (remove hardcoded credential dari source tracked).
- Hardening endpoint write path (auth + validasi input + rate control).
- Baseline test untuk jalur kritikal.

Keluaran:
- Kontrak data rekomendasi multi-sensor baku.
- Endpoint inti tidak lagi longgar untuk write.
- Tidak ada secret aktif di source tracked.

## Fase 2 (Hari 31-60) - Reliability and Visibility

Tujuan:
- Menjaga sistem stabil saat load dan gangguan nyata.

Fokus:
- Perbaikan query historis (deterministik, timezone jelas, hasil konsisten).
- Standarisasi konfigurasi endpoint per environment.
- Structured logging + correlation id + dashboard error/latency.
- Peningkatan test coverage untuk fallback dan skenario gagal.

Keluaran:
- Data analytics konsisten.
- Investigasi error lebih cepat.
- Pipeline quality gate lebih kuat.

## Fase 3 (Hari 61-90) - Twin and ML Maturity

Tujuan:
- Menjadikan arsitektur lebih siap scale dan maintain jangka panjang.

Fokus:
- Definisi canonical twin state minimum viable.
- Data quality gate untuk auto-training.
- Model versioning, release policy, dan rollback model.
- Integrasi QA lintas IoT-ML-View sebelum release.

Keluaran:
- Satu sumber kebenaran state twin.
- Jalur ML governance lebih aman dari data drift.
- Release lintas modul lebih terkendali.

## Fase 4 (Opsi Terakhir) - Closed-Loop Control

Posisi roadmap:
- Closed-loop control adalah opsi terakhir, bukan prioritas awal.

Prasyarat wajib sebelum eksekusi:
- Semua fokus Fase 1-3 terpenuhi.
- Endpoint command sudah terproteksi auth kuat.
- Audit trail command dan ack sudah aktif.
- Fail-safe perangkat siap (timeout, rollback, manual override).
- Observability command path sudah lengkap.

Scope PoC minimal:
- Satu skenario command perangkat (contoh AC atau relay beban) dari dashboard ke edge device.
- Device mengirim ack sukses/gagal.
- Twin state dan dashboard ter-update otomatis dari hasil eksekusi.

Kriteria sukses:
- End-to-end command berjalan aman, terukur, dan dapat di-rollback.

## 4. KPI Pemantauan Code Health dan Security

KPI yang disarankan:
- 100% endpoint write terlindungi auth.
- 0 secret aktif di source tracked.
- Coverage test jalur kritikal minimal 70% (naik bertahap).
- MTTR insiden utama turun secara konsisten.
- Semua release lolos checklist e2e lintas IoT-ML-View.

## 5. Checklist Review Berkala

Checklist mingguan:
- Audit error top 5 dan root cause.
- Audit perubahan payload contract lintas seluruh sensor.
- Audit key/credential exposure di commit terbaru.

Checklist bulanan:
- Review drift model dan kualitas data training.
- Review posture endpoint security.
- Review performa dashboard pada sesi panjang.

---
Dokumen ini difokuskan untuk menjaga proyek tetap sehat, aman, dan siap scale. Penambahan closed-loop control dilakukan setelah fondasi benar-benar stabil.
