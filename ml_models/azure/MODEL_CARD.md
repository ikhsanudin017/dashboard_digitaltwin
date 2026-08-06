# Model card — Twinuvo energy candidate v1

## Intended use

- `power_estimator`: mengestimasi daya saat ini jika pembacaan daya tidak tersedia.
- `forecast_30m`: memprediksi daya satu ruangan 30 menit setelah telemetry terbaru.

Kedua model hanya untuk decision support. Model tidak boleh mengontrol AC atau
peralatan listrik secara otomatis.

## Artifacts

| Model | Format | XGBoost | SHA-256 |
|---|---|---:|---|
| Power estimator | Native JSON | 3.3.0 | `6d361a5d4270e3d3817f7f72f4845ce9f376e9badd6902fe994fabcffb146b3b` |
| Forecast 30m | Native JSON | 3.3.0 | `1bc35923c281987a9f24c71f2c90b99699955d3a5394e051d0a14f36e9e30195` |

## Forecast training data

- Device: `RASPBERRY_PI_GATEWAY_001`.
- Raw period: 2026-02-23 through 2026-05-24.
- Raw rows: 2,027,520; median interval 3.53 seconds.
- Resampled interval: one minute.
- Final supervised rows: 126,451.
- Split: chronological 70% train, 15% validation, 15% test.
- Features: 44 current, lag, rolling, and calendar features.

## Forecast test metrics

| Model | MAE (W) | RMSE (W) | MAPE | R2 |
|---|---:|---:|---:|---:|
| Persistence | 1.1667 | 1.6393 | 3.1780% | 0.6120 |
| Linear Regression | 1.0617 | 1.4968 | 2.8914% | 0.6765 |
| XGBoost candidate | 0.3093 | 0.4011 | 0.8402% | 0.9768 |

## Known limitations

- Training timestamp tidak menyimpan timezone secara eksplisit.
- Belum ada purge 30 menit pada batas train/validation/test.
- Outlier threshold dihitung sebelum chronological split.
- Hanya diuji pada satu device dan satu periode sekitar tiga bulan.
- Belum ada prediction interval dan drift monitoring.
- Akurasi tinggi dipengaruhi kestabilan beban dan kuatnya hubungan arus-daya.

Status: `candidate`, bukan `production_approved`.
