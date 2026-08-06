# Twinuvo ML and Recommendation Engine

Modul ini menyediakan fondasi Azure-first untuk decision support energi satu
ruangan. Sistem tidak mengontrol AC secara otomatis; rekomendasi selalu memerlukan
persetujuan pengguna.

## Kapabilitas

| Komponen | Status | Fungsi |
|---|---|---|
| Power estimator | Belum di-deploy | Estimasi/fallback ketika daya sensor tidak tersedia |
| Forecast 30 menit | Baseline | Naive persistence sebagai pembanding wajib model ML |
| Comfort calculation | Tersedia | Estimasi transparan, belum PMV/PPD terkalibrasi |
| AC recommendation | Tersedia | Ranking skenario setpoint 22–26°C |
| Recommendation engine | Tersedia | Menggabungkan forecast dan comfort secara human-in-the-loop |

Artifact produksi disimpan di Azure Machine Learning Model Registry. Folder
`models/` tidak menjadi source of truth dan mengabaikan binary model lokal.

## Struktur

```text
ml_models/
├── contracts/          # Validasi dan normalisasi telemetry
├── power_estimator/    # Boundary estimator daya opsional
├── forecast_30m/       # Forecast daya horizon tunggal 30 menit
├── comfort/            # Comfort calculation transparan
├── recommendation/     # Scenario ranking dan rekomendasi AC
├── services/           # Orkestrasi seluruh komponen
├── api/                # Flask dan adapter Azure Functions
├── azure/              # Scoring, environment, YAML, model card, dan runbook handoff
├── training/           # Script training legacy; belum menjadi pipeline canonical
├── models/             # Kebijakan artifact; binary tidak di-commit
└── tests/              # Unit test kontrak dan service
```

## Kontrak input

Nama canonical berikut direkomendasikan. Adapter sementara juga menerima field
legacy Indonesia seperti `suhu`, `kelembaban`, `daya`, dan `jumlahOrang`.

```json
{
  "schema_version": "1.0.0",
  "timestamp_utc": "2026-08-06T03:00:00Z",
  "room_id": "room-01",
  "device_id": "esp32-01",
  "temperature_c": 29.0,
  "humidity_percent": 70.0,
  "voltage_v": 220.0,
  "current_a": 0.55,
  "power_w": 120.0,
  "occupancy_count": 5
}
```

`temperature_c` dan `humidity_percent` wajib. Timestamp tanpa timezone ditolak.
Nilai daya tidak direkayasa menjadi nol ketika hilang.

## Menjalankan test

Dari root repository:

```bash
python -m unittest discover -s ml_models/tests -v
```

## Menjalankan API pengembangan

```bash
python -m ml_models.api.app
```

Endpoint utama:

- `GET /api/health`
- `GET /api/model/info`
- `POST /api/predict/energy`
- `POST /api/predict/ac`
- `POST /api/predict/all`

## Tahap berikutnya

1. Engineer deployment mengikuti `azure/DEPLOYMENT_HANDOFF.md`.
2. Registrasikan model bundle dan environment di Azure ML.
3. Deploy managed endpoint dan jalankan kedua smoke test.
4. Hubungkan Azure Function ke endpoint menggunakan credential server-side.
5. Retrain forecast dengan timezone eksplisit dan purge 30 menit sebelum status production.
6. Simpan feedback dan outcome rekomendasi sebelum melatih recommendation model.
