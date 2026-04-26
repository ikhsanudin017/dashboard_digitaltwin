# Jobdesk: ML Engine (Machine Learning)

**Penanggung Jawab:** Data Scientist / ML Engineer
**Jobdesk Code:** ML-01

---

## 1. Overview

Tim ML Engine bertanggung jawab untuk semua model machine learning, training pipeline, prediction API, dan analytics engine yang mendukung keputusan AC serta forecast energi di Digital Twin system.

### Tools & Stack

| Tool | Fungsi |
|------|--------|
| Python 3.x | Bahasa utama training & inference |
| scikit-learn | RandomForest, GradientBoosting, preprocessing |
| pandas | Data manipulation & feature engineering |
| Flask | Prediction API server (port 5000) |
| numpy | Numerical computation |
| joblib / pickle | Model serialization |
| cron / bash | Auto-training scheduling |

---

## 2. Yang Sudah Ada (Fungsional)

### 2.1 Model Training

| Script | Model | R² Score | Output |
|--------|-------|----------|--------|
| `train_model.py` | RandomForest Regressor | ~0.85 | `energy_forecast_model.pkl` |
| `train_ac_recommendation.py` | GradientBoosting | ~0.96 | `ac_recommendation_model.pkl` |
| `train_from_azure.py` | Fetches data dari Azure Table Storage | — | Training data CSV |

**Feature Engineering:**

- **Energy Forecast Model:** `suhu`, `kelembaban`, `tegangan`, `arus`, `hour`
- **AC Recommendation Model:** `suhu`, `kelembaban`, `daya`, `hour`, `month`

### 2.2 Prediction API

**File:** `prediction_api.py`
**Port:** 5000
**Framework:** Flask + Waitress (production)

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/health` | GET | Health check |
| `/api/model/info` | GET | Model metadata |
| `/api/reload` | POST | Reload models |
| `/api/predict/energy` | POST | Energy forecast |
| `/api/predict/ac` | POST | AC recommendation |
| `/api/predict/all` | POST | Combined prediction |

**Model artifacts** (`ml_models/models/`):

- `energy_forecast_model.pkl` — RandomForest
- `ac_recommendation_model.pkl` — GradientBoosting
- `scaler.pkl` — Feature scaler (energy)
- `ac_scaler.pkl` — Feature scaler (AC)
- `energy_features.pkl` — Feature name list
- `ac_features.pkl` — Feature name list

### 2.3 Auto-Training Pipeline

| File | Fungsi |
|------|--------|
| `auto_train.py` | Orchestration script — fetch data, retrain, evaluate, deploy |
| `run_auto_train.sh` | Shell wrapper untuk cron |
| `training_status.json` | Metadata training: last run, status, model version |
| `model_config.json` | Model versioning config |

**Cron schedule:** `run_auto_train.sh` dijalankan via cron (documented di README_AUTO_TRAINING.md)

### 2.4 Fallback Chain (Frontend)

Di `useMLPrediction.js` (Vue composable) sudah ada 3-level fallback:

| Level | Source | Keterangan |
|-------|--------|------------|
| 0 | Azure Function `GetACRecommendation` | Rule-based approximation |
| 1 | ML Flask API `localhost:5000` | Trained model inference |
| 2 | Local rule calculation | Hardcoded comfort logic |

---

## 3. Yang Perlu Ditambahkan (Gap Analysis)

### 3.1 Simulation Engine — PRIORITY TINGGI

**Masalah:** Tidak ada physics-based room simulation. ML hanya memberikan prediksi point-in-time, tidak bisa menjalankan "what-if" scenarios.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Heat Balance Simulation** | Room temperature model: `T(t+dt) = T(t) + f(AC_power, ambient, occupancy, thermal_mass) * dt` |
| **What-If Scenario Runner** | API endpoint: `POST /simulate/scenario` — input: occupancy schedule, AC schedule, ambient temp; output: predicted temp/power curves |
| **Multi-Step Horizon Forecast** | Energy prediction untuk 24h, 48h, 72h (bukan hanya current power) |
| **Anomaly Injection** | Simulate sensor failures, spike loads untuk stress testing |

**File baru yang perlu dibuat:**

```
ml_models/
├── simulation/
│   ├── room_model.py          # Heat balance differential equations
│   ├── scenario_runner.py     # What-if scenario API
│   ├── thermal_properties.py  # Material thermal mass constants
│   └── simulate_api.py        # Flask endpoint untuk simulation
└── requirements.txt           # Update: add scipy, numpy extended
```

### 3.2 Model Drift Monitoring — PRIORITY TINGGI

**Masalah:** Tidak ada monitoring untuk model quality degradation. Jika sensor data distribution berubah, model bisa jadi tidak akurat tanpa ada warning.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Data Quality Gate** | Check incoming data distribution vs training distribution (feature drift detection) |
| **Prediction Confidence** | Per-prediction confidence score dengan uncertainty quantification |
| **Drift Alert** | Automatic alert jika feature drift exceeds threshold |
| **Model Evaluation Dashboard** | Weekly evaluation metrics (R², MAE, RMSE) terhadap holdout data |

**File baru:**

```
ml_models/
├── drift_detection/
│   ├── feature_drift.py       # PSI (Population Stability Index) calculation
│   ├── drift_monitor.py       # Scheduled drift check + alert
│   └── drift_report.py        # Weekly evaluation report generator
```

### 3.3 Advanced Forecasting — PRIORITY SEDANG

**Masalah:** Energy forecast hanya 1 step. Tidak ada multi-step horizon untuk planning.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Multi-Step Forecast** | 24h, 48h, 72h energy consumption forecast |
| **Uncertainty Bands** | Prediksi dengan confidence interval (low/mid/high) |
| **Time-of-Use Optimization** | Linear solver untuk minimize cost given TOU tariff schedule |
| **Occupancy-Aware Forecast** | Input occupancy schedule untuk improve accuracy |

**File baru:**

```
ml_models/
├── forecasting/
│   ├── multi_step_model.py    # Recursive/parallel multi-step forecast
│   ├── torch_model.py         # LSTM-based forecast (optional upgrade)
│   ├── cost_optimizer.py      # MILP solver untuk TOU optimization
│   └── forecast_api.py         # Extended Flask API endpoints
```

### 3.4 Data Pipeline Enhancement — PRIORITY SEDANG

**Masalah:** Training data hanya dari Azure Table Storage query. Tidak ada proper data versioning atau feature store.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Feature Store** | Centralized feature storage (dvc atau azure blob) |
| **Data Versioning** | Track dataset changes dengan DVC |
| **Data Validation** | Great Expectations atau custom validation rules |
| **Training Registry** | MLflow atau custom registry untuk model versioning |

---

## 4. Technical Details

### 4.1 File yang Perlu Dibuat (New Files)

```
ml_models/
├── simulation/
│   ├── __init__.py
│   ├── room_model.py          # 150-200 lines — heat balance physics
│   ├── thermal_properties.py  # Material constants (walls, windows, AC)
│   ├── scenario_runner.py     # What-if scenario logic
│   └── simulate_api.py        # Flask endpoints: POST /simulate/scenario
├── drift_detection/
│   ├── __init__.py
│   ├── feature_drift.py       # PSI calculator
│   ├── drift_monitor.py       # Scheduled monitor + alert
│   └── drift_report.py        # Report generator
├── forecasting/
│   ├── __init__.py
│   ├── multi_step_model.py    # 24h/48h/72h forecast
│   ├── cost_optimizer.py      # TOU tariff optimizer
│   └── forecast_api.py         # Extended API
└── requirements.txt           # Update dependencies
```

### 4.2 File yang Perlu Dimodifikasi

| File | Perubahan |
|------|-----------|
| `prediction_api.py` | Tambahkan simulation endpoints |
| `train_model.py` | Update untuk multi-step model |
| `training_status.json` | Tambahkan drift metrics |
| `requirements.txt` | Tambah scipy, matplotlib, requests |

### 4.3 Dependencies dengan Jobdesk Lain

| Jobdesk | Dependency | Notes |
|---------|-----------|-------|
| **Cloud Engine** | ML API endpoint dari Azure Function call | Fallback level 1 |
| **Website** | `useMLPrediction.js` consume ML API | Vue composable |
| **Cloud Engine** | Training data dari Azure Table Storage | `train_from_azure.py` |

---

## 5. API Specification (Yang Perlu Ditambah)

### POST /api/simulate/scenario

**Request:**
```json
{
  "room_area_sqm": 20,
  "occupancy_schedule": [
    {"hour": 8, "people": 3},
    {"hour": 12, "people": 1},
    {"hour": 14, "people": 5}
  ],
  "ac_schedule": [
    {"hour": 8, "setpoint": 24, "mode": "cool"},
    {"hour": 18, "setpoint": 25, "mode": "cool"}
  ],
  "ambient_temp": 33,
  "duration_hours": 24
}
```

**Response:**
```json
{
  "trace_id": "sim_...",
  "room_temperature_curve": [30.1, 29.5, 28.2, ...],
  "energy_kwh_curve": [0.8, 0.7, 1.2, ...],
  "comfort_score_avg": 0.87,
  "total_energy_kwh": 18.5,
  "estimated_cost_idr": 26740
}
```

### GET /api/drift/status

**Response:**
```json
{
  "feature_drift_detected": false,
  "psi_scores": {"suhu": 0.02, "kelembaban": 0.05},
  "latest_model_r2": 0.964,
  "last_evaluation": "2026-04-26T00:00:00Z",
  "alert_threshold": 0.1
}
```

---

## 6. Timeline Suggestion

| Fase | Durasi | Fitur |
|------|--------|-------|
| **Phase 1** | 1-2 minggu | Heat balance simulation engine (`room_model.py` + `simulate_api.py`) |
| **Phase 2** | 1 minggu | What-if scenario runner (`scenario_runner.py`) |
| **Phase 3** | 1-2 minggu | Multi-step energy forecast (`multi_step_model.py`) |
| **Phase 4** | 1 minggu | Drift detection (`feature_drift.py` + `drift_monitor.py`) |
| **Phase 5** | 1 minggu | TOU cost optimizer (`cost_optimizer.py`) |

---

## 7. Verification Checklist

- [ ] `simulation/room_model.py` dapat di-import tanpa error
- [ ] `/api/simulate/scenario` mengembalikan response valid
- [ ] `train_model.py` dapat dijalankan dan menghasilkan model baru
- [ ] Drift detection dapat dijalankan secara scheduled (cron)
- [ ] API Flask running di port 5000, semua endpoint return 200
- [ ] Model R² score di atas threshold yang ditetapkan
- [ ] Training auto-trigger via cron berfungsi

---

## 8. Notes

- Model artifacts (.pkl) saat ini di-commit ke repo — perlu dipertimbangkan untuk move ke Azure Blob Storage atau MLflow registry
- Prediction API Flask menggunakan `waitress` untuk production — ini sudah benar
- Fallback chain di `useMLPrediction.js` sudah dirancang dengan baik — simulasi engine harus menjadi fallback level 3

**Next Action:** Mulai dari Phase 1 — buat `simulation/room_model.py` dengan heat balance model dasar.