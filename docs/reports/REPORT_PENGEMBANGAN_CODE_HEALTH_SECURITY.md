# Report Pengembangan Code Health dan Security (Per Jobdesk)

Tanggal update: 23 April 2026  
Scope: Review menyeluruh IoT edge, Azure Function, pipeline ML, frontend dashboard, CI/CD, dan posture security.  
Metode validasi: pembacaan source code lintas modul, verifikasi `npm run test:run` pada `view_virtual`, dan verifikasi `npm run build` pada `view_virtual`.

## Ringkasan Eksekutif

Proyek sudah memiliki fondasi digital twin yang baik, namun saat ini prioritas utama adalah stabilisasi lintas jobdesk sebelum ekspansi fitur baru.  
Prinsip eksekusi: selesaikan risiko paling krusial dulu per jobdesk, baru lanjut ke optimasi dan scale.

Temuan lintas tim paling penting:
- Kontrak data dan timestamp belum konsisten antar IoT, Function, ML, dan frontend.
- Ada risiko security tinggi dari pengelolaan secret dan pola proteksi endpoint write.
- Sebagian test/CI belum sinkron dengan implementasi saat ini.

## Status Validasi Teknis per 23 April 2026

### Yang Sudah Tervalidasi Berjalan
1. Build frontend produksi berhasil.
- `npm run build` pada folder `view_virtual` selesai sukses dan PWA generation berjalan.
- Ini menandakan konfigurasi Vite utama masih sehat untuk jalur build frontend.

2. Fallback prediksi ML sudah lebih matang dibanding modul lain.
- Frontend sudah punya fallback chain `Azure Function -> ML API lokal -> local calculation`.
- Metadata seperti `trace_id`, `source_tag`, dan `fallback_level` sudah dikelola di layer frontend.

3. Jalur auth user/admin di frontend sudah punya fondasi yang cukup rapi.
- Firebase auth, role check admin, session TTL admin, dan route guard sudah tersedia.
- Ini sudah lebih siap untuk hardening dibanding area data plane.

### Yang Tervalidasi Masih Drift atau Belum Sinkron
1. Test suite frontend belum sinkron dengan implementasi runtime.
- Hasil `npm run test:run`: 90 test lulus, 10 test gagal.
- Seluruh test gagal terpusat di `view_virtual/src/composables/__tests__/useMQTT.test.js`.
- Akar masalah utama: test masih mock `axios`, sedangkan implementasi `view_virtual/src/composables/useMQTT.js` sudah memakai `fetch`.

2. Arsitektur runtime frontend saat ini sudah bergeser dari dokumentasi lama.
- Jalur real-time utama sekarang adalah polling Azure Function tiap 5 detik, bukan browser MQTT direct.
- Drift ini sudah tampak di `view_virtual/src/composables/useMQTT.js` dan perlu diselaraskan di dokumentasi.

3. Timestamp end-to-end belum satu standar.
- ESP32 sudah mengirim UTC ISO-8601.
- Tetapi beberapa Azure Function masih menyimpan/mengembalikan varian waktu lokal `WIB`, sehingga frontend perlu normalisasi manual.

4. Ada placeholder teknis yang masih kosong.
- `view_virtual/src/components/AlertSettings.vue` masih kosong.
- `view_virtual/src/composables/useAlerts.js` masih kosong.

5. CI root belum merepresentasikan aplikasi utama yang sebenarnya dijalankan.
- `azure-pipelines.yml` saat ini menjalankan `npm install` dan `npm run build` di root repo.
- Padahal script build frontend aktif ada di `view_virtual/package.json`.

---

## Jobdesk Machine Learning

### Prioritas 1 (Paling Krusial)
1. Benahi sumber data training agar valid dan reproducible.
- Isu: `ml_models/train_model.py` dan `ml_models/train_ac_recommendation.py` masih mengarah ke `../sensor_data_sample_2026-01-04.csv`, yang tidak tersedia sebagai dataset default repo.
- Dampak: training gagal/inkonsisten antar mesin developer.
- Aksi: samakan path dataset melalui env/config tunggal, lalu validasi file existence sebelum training dijalankan.

2. Perkuat validitas label target model AC.
- Isu: target `recommended_temp` masih dibentuk dari rule internal di script training, bukan dari label operasional/ground truth terpisah.
- Dampak: metrik model terlihat bagus, tetapi bisa kurang representatif terhadap kondisi operasional nyata.
- Aksi: pisahkan label operasional (ground truth/validated rule set) dari pipeline training, lalu definisikan evaluasi out-of-sample.

3. Terapkan governance artefak model.
- Isu: artefak `.pkl`, `model_config.json`, dan `training_status.json` masih hidup di repo utama.
- Dampak: ukuran repo membesar, versioning model dan rollback sulit dikontrol.
- Aksi: pindahkan artefak ke model registry/storage terpisah, simpan hanya metadata versi di repo.

### Prioritas 2
1. Rapikan dependency ML.
- Isu: `ml_models/requirements.txt` masih memuat paket berat seperti `tensorflow`, `xgboost`, `jupyter`, `matplotlib`, dan `seaborn`, sementara jalur inferensi utama repo tidak memperlihatkan pemakaian langsung semuanya.
- Dampak: environment setup lambat dan attack surface dependency meningkat.
- Aksi: split `requirements-dev.txt` dan `requirements-runtime.txt`.

2. Hardening API prediksi lokal.
- Isu: `ml_models/prediction_api.py` masih menjalankan `app.run(..., debug=True)` untuk server lokal.
- Dampak: risiko kebocoran stack trace/perilaku runtime tidak ideal.
- Aksi: gunakan mode production default, logging terstruktur, dan error response yang konsisten.

### Output yang Ditargetkan
- Training dapat dijalankan konsisten di semua environment tim.
- Model versioning jelas (train -> evaluate -> release -> rollback).
- Metrik model lebih kredibel untuk keputusan operasional.

---

## Jobdesk IoT dan Website

### Prioritas 1 (Paling Krusial)
1. Standarisasi kontrak data end-to-end.
- Isu: field sensor inti relatif konsisten, tetapi metadata seperti `timestamp_utc`, `source`, `trace_id`, `fallback_level`, dan `model_version` belum menjadi schema baku lintas IoT, Function, ML, dan frontend.
- Dampak: data bisa salah parsing di UI dan fallback chain sulit ditelusuri.
- Aksi: tetapkan schema baku lintas modul (minimal `timestamp_utc`, `source`, `trace_id`, `fallback_level`, `model_version`).

2. Satu standar waktu (UTC ISO-8601) untuk semua jalur.
- Isu: `sensor iot/src/main.cpp` sudah mengirim UTC ISO, tetapi `GetTelemetryData`, `SaveSensorData`, dan `SavePeopleCount` masih memakai konversi/serialisasi `WIB`.
- Dampak: sorting historis tidak deterministik dan analytics berpotensi bias.
- Aksi: simpan dan kirim timestamp UTC ISO; konversi WIB hanya di layer presentasi frontend.

3. Deterministik query data people count.
- Isu: jalur `telemetry/people` masih mengumpulkan data sambil iterasi lalu melakukan `break` saat limit tercapai sebelum sort akhir.
- Dampak: dashboard bisa menampilkan data people count yang bukan terbaru.
- Aksi: lakukan sort berdasarkan timestamp UTC terlebih dahulu, baru apply limit.

### Prioritas 2
1. Perjelas source-of-truth rekomendasi.
- Isu: frontend sudah menampilkan source metadata, tetapi backend Azure Function belum memakai kontrak metadata yang sama secara penuh.
- Dampak: analisa insiden lambat karena ambiguity sumber prediksi.
- Aksi: tampilkan source tag dan fallback level secara konsisten di log/response/UI.

2. Pastikan response semantics akurat.
- Isu: ada jalur yang memilih `success: true` untuk kondisi kosong/fallback agar frontend tidak error, sehingga observability bisnis dan observability teknis bisa tercampur.
- Dampak: observability menipu dan SLA sulit dipantau.
- Aksi: success/failure response harus mencerminkan hasil operasi aktual.

### Output yang Ditargetkan
- Jalur data IoT -> Function -> Website lebih stabil dan mudah di-debug.
- Tidak ada mismatch schema antar tim.
- Incident triage lebih cepat karena telemetry dan source tagging konsisten.

---

## Jobdesk Website

### Prioritas 1 (Paling Krusial)
1. Kurangi request berlebih pada komponen rekomendasi.
- Isu: `view_virtual/src/components/ACRecommendation.vue` memicu prediksi dari `watch(sensorData)`, `mounted()`, interval 2 menit, dan fetch sensor tambahan sebelum prediksi.
- Dampak: beban API meningkat dan UI rentan jitter saat data sering berubah.
- Aksi: satukan strategi trigger, tambah debounce/throttle, dan batasi refresh manual terkontrol.

2. Sinkronkan test dengan implementasi aktual.
- Isu: `view_virtual/src/composables/__tests__/useMQTT.test.js` masih berbasis asumsi `axios`, sedangkan `useMQTT.js` sudah berbasis `fetch`.
- Dampak: test gagal bukan karena business bug, tetapi karena test debt.
- Aksi: update mocking strategy dan test contract sesuai implementasi sekarang.

3. Rapikan arsitektur routing/presentation.
- Isu: `view_virtual/src/router/index.js` memakai marker component, sementara `view_virtual/src/App.vue` tetap memegang branching render utama.
- Dampak: maintainability menurun saat fitur bertambah.
- Aksi: konsolidasikan pemisahan tanggung jawab route-level dan component-level.

### Prioritas 2
1. Selesaikan komponen placeholder.
- Isu: `AlertSettings.vue` dan `useAlerts.js` masih kosong.
- Dampak: debt teknis meningkat dan membingungkan handoff antar developer.
- Aksi: isi dengan implementasi minimum atau hapus sampai siap dipakai.

2. Samakan dokumentasi dengan arsitektur runtime saat ini.
- Isu: beberapa dokumen masih menonjolkan alur MQTT browser langsung, sedangkan runtime utama frontend sekarang polling Azure Function.
- Dampak: onboarding/devops drift.
- Aksi: update README agar mencerminkan arsitektur aktual.

### Output yang Ditargetkan
- UI lebih stabil pada update real-time.
- Test suite menjadi indikator kualitas yang valid.
- Dokumentasi frontend sinkron dengan real implementation.

---

## Jobdesk Security

### Prioritas 1 (Paling Krusial)
1. Rotasi dan bersihkan seluruh kredensial yang pernah terekspos.
- Isu: file contoh yang saya verifikasi di source tracked sudah berupa placeholder, tetapi workflow masih sangat bergantung pada `.env` lokal, function key, IoT Hub key, dan storage connection string berprivilege tinggi.
- Dampak: akses tidak sah ke IoT Hub/Storage/function bisa terjadi jika bocor.
- Aksi: rotasi semua key, revokasi key lama, dan gunakan secret manager/env secure workflow.

2. Hentikan pola pengiriman function key dari frontend browser.
- Isu: frontend masih menyiapkan `VITE_AZURE_FUNCTION_WRITE_KEY` untuk memanggil endpoint write protected dari browser.
- Dampak: risiko abuse pada endpoint write.
- Aksi: gunakan backend-mediated auth (token/session) untuk aksi write sensitif.

3. Terapkan policy secret hygiene di repo dan pipeline.
- Isu: kontrol secret scanning dan gate keamanan belum dijadikan mandatory gate.
- Dampak: kebocoran bisa terulang.
- Aksi: wajibkan secret scanning + dependency scanning pada CI, dan blok merge saat high risk ditemukan.

### Prioritas 2
1. Hardening CORS dan input validation.
- Isu: endpoint read dan sebagian endpoint write masih memakai `Access-Control-Allow-Origin: *`; endpoint read telemetry juga masih `anonymous`.
- Dampak: permukaan serangan lebih besar.
- Aksi: whitelist origin resmi + schema validation + rate limit untuk endpoint kritikal.

2. Perkuat policy session admin.
- Isu: session policy sudah ada namun perlu konsolidasi lockout, expiry, invalidation, dan audit login.
- Dampak: risiko penyalahgunaan panel admin.
- Aksi: implement policy auth komprehensif berbasis role claim + audit trail.

### Output yang Ditargetkan
- Tidak ada secret aktif di source tracked.
- Endpoint write aman tanpa bocor key di frontend.
- Security gate menjadi syarat wajib release.

---

## Jobdesk IoT

### Prioritas 1 (Paling Krusial)
1. Konsistensi payload dari edge device.
- Isu: ESP32 sudah lebih canonical, tetapi Raspberry Pi people counter masih memakai timestamp lokal `datetime.now().isoformat()` tanpa standardisasi metadata yang sama dengan jalur sensor utama.
- Dampak: ingestion dan analytics lintas modul rawan mismatch.
- Aksi: kirim payload canonical dari edge (UTC ISO + field baku + deviceId konsisten).

2. Reliability jalur kirim data.
- Isu: reconnect WiFi/MQTT pada ESP32 sudah ada, tetapi idempotency key dan strategi dedup belum dibakukan pada layer ingestion/storage.
- Dampak: potensi duplikasi data atau data hilang pada network flapping.
- Aksi: tetapkan retry policy, idempotent key, dan validasi ack untuk jalur penting.

3. Validasi kualitas data sensor di edge.
- Isu: status koneksi sensor sudah ada, namun threshold/kalibrasi perlu dibakukan sebagai SOP.
- Dampak: data outlier/noise dapat mengganggu analytics dan model.
- Aksi: tetapkan SOP kalibrasi dan quality check periodik per sensor.

### Prioritas 2
1. Optimasi beban komputasi people counter.
- Isu: kombinasi frame rate tinggi + detection kontinu dapat berat untuk perangkat edge tertentu.
- Dampak: thermal/performance drop dan stabilitas streaming menurun.
- Aksi: profil performa per perangkat, atur FPS/detection interval adaptif.

2. Rapikan naming dan tanggung jawab komponen ingestion.
- Isu: ada naming fungsi yang tidak sepenuhnya merepresentasikan perilaku aktual.
- Dampak: kebingungan operasional saat troubleshooting.
- Aksi: samakan nama komponen dengan behavior aktual dan perbarui dokumentasinya.

### Output yang Ditargetkan
- Data edge lebih bersih dan konsisten untuk layer cloud.
- Ketahanan pengiriman data meningkat saat jaringan tidak stabil.
- Operasional IoT lebih mudah di-maintain oleh tim lapangan.

---

## Jobdesk CI/CD dan Release

### Prioritas 1 (Paling Krusial)
1. Sinkronkan pipeline root dengan aplikasi utama yang benar-benar dibuild.
- Isu: `azure-pipelines.yml` masih mengeksekusi `npm install` dan `npm run build` di root repo, sedangkan build frontend aktif berada di `view_virtual`.
- Dampak: pipeline root berpotensi gagal atau memberi sinyal health yang menyesatkan.
- Aksi: arahkan pipeline ke `view_virtual`, tambahkan step test frontend, dan publish artifact `view_virtual/dist`.

2. Tambahkan gate kualitas minimum sebelum merge/release.
- Isu: belum terlihat gate wajib untuk test, dependency audit, dan secret scan.
- Dampak: regression dan security drift lebih mudah lolos ke branch utama.
- Aksi: wajibkan minimal `npm run test:run`, build frontend, dependency scan, dan secret scan sebagai release gate.

### Prioritas 2
1. Bedakan pipeline build frontend, pipeline backend function, dan pipeline ML.
- Isu: repo ini multi-modul, tetapi saat ini pipeline belum dipisah per concern.
- Dampak: troubleshooting release menjadi lambat dan coupling antar modul terlalu tinggi.
- Aksi: pisahkan workflow CI per domain agar failure lebih mudah diisolasi.

### Output yang Ditargetkan
- Pipeline benar-benar merefleksikan arsitektur repo saat ini.
- Status CI menjadi indikator kualitas yang valid, bukan sekadar formalitas.

---

## KPI Lintas Jobdesk (30-90 Hari)

1. 100% endpoint write kritikal tidak bergantung key di browser.
2. 100% payload utama lintas IoT-Function-Website menggunakan timestamp UTC ISO.
3. 0 secret aktif di source tracked.
4. Test jalur kritikal minimal 70% pada fase awal, naik bertahap ke 80%+.
5. Error rate endpoint kritikal turun konsisten tiap sprint.
6. MTTR insiden utama turun konsisten setelah observability distandardkan.

## Catatan Validasi Tambahan

1. Build frontend saat ini lulus, jadi fokus utama bukan “frontend tidak bisa dibuild”, tetapi pengurangan drift arsitektur, test debt, dan payload consistency.
2. Test frontend saat ini gagal terlokalisasi, sehingga quick win yang realistis adalah membenahi `useMQTT` test suite lebih dulu sebelum memperluas coverage.
3. Laporan ini sengaja menempatkan closed-loop control di fase akhir karena fondasi data contract, security, dan observability memang belum cukup stabil untuk automation yang lebih agresif.

## Catatan Penutup

Closed-loop control tetap diposisikan sebagai fase akhir, setelah seluruh fondasi code health, security, reliability, dan konsistensi data per jobdesk dinyatakan stabil.
