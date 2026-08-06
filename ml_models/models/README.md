# Model artifacts

Folder ini tidak menyimpan model produksi. Azure Machine Learning Model Registry
menjadi source of truth untuk model yang telah divalidasi dan diberi versi.

Artifact lokal hanya boleh digunakan untuk pengembangan sementara dan tidak boleh
di-commit. Setiap model yang akan di-deploy wajib memiliki:

- nama dan versi model;
- tujuan yang eksplisit, misalnya `power-estimator`, `forecast-30m`, atau
  `forecast-60m`;
- daftar fitur, tipe data, urutan fitur, satuan, dan kebijakan missing value;
- periode serta hash dataset;
- metode chronological train/validation/test split;
- metrik pada test set yang belum dipakai untuk tuning;
- versi Python dan dependency;
- SHA-256 artifact dan model card;
- kontrak request/response inference.

Gunakan format native model bila tersedia, seperti XGBoost JSON/UBJSON. Jangan
memuat file pickle dari sumber yang tidak dipercaya karena proses unpickle dapat
menjalankan kode.

Model legacy Random Forest dan Gradient Boosting telah dihapus karena tidak dapat
direproduksi, memakai random split dan target baris yang sama, serta model AC-nya
belajar dari label sintetis berbasis aturan. Model tersebut tidak membuktikan
forecast 30/60 menit maupun efektivitas rekomendasi AC.
