# Azure ML deployment handoff

Dokumen ini untuk engineer yang melakukan deployment. Resource Azure tidak dibuat
oleh tahap persiapan repository ini.

## Prasyarat

- Azure CLI dan extension `ml` v2.
- Login ke subscription yang benar.
- Resource group dan Azure ML workspace sudah tersedia.
- Hak untuk membuat model, environment, managed endpoint, dan deployment.
- Kuota CPU untuk `Standard_DS3_v2`, atau ganti instance sesuai kuota workspace.

Set default agar setiap perintah mengarah ke workspace yang benar:

```bash
az configure --defaults group=<RESOURCE_GROUP> workspace=<AML_WORKSPACE> location=<REGION>
```

## 1. Siapkan dan verifikasi model bundle

Dari root repository:

```bash
python ml_models/azure/prepare_artifacts.py \
  --estimator /path/to/model_xgb_daya.json \
  --forecast /path/to/model_artifacts/xgb_power_forecast.json
```

Script menolak artifact jika SHA-256 berbeda dari artifact yang diaudit. Output
lokal berada di `ml_models/models/azure_bundle/` dan sengaja diabaikan Git.

## 2. Jalankan quality gate lokal

```bash
python -m unittest discover -s ml_models/tests -v
python -m compileall -q ml_models
```

Untuk smoke test scoring lokal, install `ml_models/azure/conda.yml`, set
`AZUREML_MODEL_DIR` ke absolute path bundle, lalu panggil `init()` dan `run()`.

## 3. Registrasikan environment dan model

Jalankan dari folder `ml_models/azure` agar path YAML diselesaikan dengan benar:

```bash
az ml environment create --file environment.yml
az ml model create --file model.yml
```

Verifikasi bahwa versi yang tercipta adalah:

```text
twinuvo-xgboost-inference:1
twinuvo-energy-model-bundle:1
```

## 4. Buat endpoint dan deployment

Pembuatan managed endpoint mulai menimbulkan penggunaan resource Azure. Pastikan
owner subscription menyetujui instance type dan biaya sebelum melanjutkan.

```bash
az ml online-endpoint create --file endpoint.yml
az ml online-deployment create --file deployment.yml --all-traffic
```

Jika deployment gagal, periksa log:

```bash
az ml online-deployment get-logs \
  --endpoint-name twinuvo-energy-ml \
  --name candidate-v1 \
  --lines 200
```

## 5. Smoke test endpoint

Buat request forecast valid:

```bash
python generate_sample_request.py > /tmp/twinuvo-forecast-request.json
az ml online-endpoint invoke \
  --name twinuvo-energy-ml \
  --request-file /tmp/twinuvo-forecast-request.json
```

Uji estimator:

```bash
az ml online-endpoint invoke \
  --name twinuvo-energy-ml \
  --request-file sample-request-estimator.json
```

## 6. Integrasi aplikasi

- Azure Function menjadi gateway; browser tidak menyimpan endpoint key.
- Function mengambil 31 titik telemetry satu-menit yang kontinu.
- Jika endpoint gagal atau history tidak cukup, gunakan persistence baseline.
- Simpan `model_name`, `model_version`, `generated_at`, `target_time`, input quality,
  dan outcome aktual.
- Jangan mengubah status model dari `candidate` sebelum retraining dengan timezone,
  split purge, dan evaluasi periode/device tambahan.

## Rollback

Jangan menghapus deployment yang sehat sebelum candidate baru lolos smoke test.
Gunakan deployment baru dan alihkan traffic setelah validasi. Jika candidate gagal,
alihkan traffic kembali ke deployment sebelumnya melalui Azure ML.
