# ==========================================================
#  ML AUTO-TRAINING SYSTEM
#  Dashboard Digital Twin - Energy & AC Recommendation
# ==========================================================

## Overview

Sistem ini melakukan training ML secara otomatis dengan data real dari Azure Storage,
dan menyediakan API untuk prediction yang digunakan oleh dashboard.

## Files

| File | Deskripsi |
|------|-----------|
| `auto_train.py` | Script training otomatis dengan data Azure |
| `prediction_api.py` | Flask API untuk serving predictions ke dashboard |
| `run_auto_train.sh` | Shell script untuk scheduler (cron) |
| `models/` | Folder penyimpanan model (.pkl files) |

## Quick Start

### 1. Training Pertama Kali

```bash
cd ml_models
source ../.venv/bin/activate
python auto_train.py --force
```

### 2. Jalankan Prediction API

```bash
python prediction_api.py
# API akan jalan di http://localhost:5000
```

### 3. Test Prediction

```bash
curl -X POST http://localhost:5000/api/predict/all \
  -H "Content-Type: application/json" \
  -d '{"suhu": 28, "kelembaban": 65, "tegangan": 220, "arus": 0.8, "daya": 176}'
```

## Auto-Training Setup

### Opsi 1: Cron Job (Recommended)

Jalankan setiap 6 jam:

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini:
0 */6 * * * /Users/macbookpro/Desktop/dashboard_digitaltwin/ml_models/run_auto_train.sh
```

### Opsi 2: Launchd (macOS)

1. Buat file plist:

```bash
cat > ~/Library/LaunchAgents/com.digitaltwin.ml-training.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.digitaltwin.ml-training</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/macbookpro/Desktop/dashboard_digitaltwin/ml_models/run_auto_train.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>21600</integer>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF
```

2. Load service:

```bash
launchctl load ~/Library/LaunchAgents/com.digitaltwin.ml-training.plist
```

### Opsi 3: PM2 (Node.js Process Manager)

```bash
# Install pm2
npm install -g pm2

# Buat schedule
pm2 start ecosystem.config.js
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Get All Predictions
```
POST /api/predict/all
Content-Type: application/json

{
  "suhu": 28,
  "kelembaban": 65,
  "tegangan": 220,
  "arus": 0.8,
  "daya": 176,
  "jumlahOrang": 0
}
```

Response:
```json
{
  "timestamp": "2026-01-10T12:00:00",
  "model_version": 1,
  "energy": {
    "predicted_watt": 176.5,
    "daily_kwh": 4.24,
    "monthly_kwh": 127.08,
    "monthly_cost_idr": 183534,
    "confidence": 91.2
  },
  "ac": {
    "recommended_temp": 23.5,
    "action": "Turunkan suhu AC",
    "mode": "cooling",
    "confidence": 96.0
  }
}
```

### Get Model Info
```
GET /api/model/info
```

### Reload Models (after training)
```
POST /api/reload
```

## Training Flow

```
[ESP32] ──▶ [Azure IoT Hub] ──▶ [Azure Storage Table]
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │   auto_train.py         │
                           │   - Fetch dari Azure    │
                           │   - Preprocess data     │
                           │   - Train models        │
                           │   - Save .pkl files     │
                           └─────────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │   prediction_api.py     │
                           │   - Load models         │
                           │   - Serve predictions   │
                           │   - REST API            │
                           └─────────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │   Vue Dashboard         │
                           │   - useMLPrediction.js  │
                           │   - ACRecommendation    │
                           │   - Real-time display   │
                           └─────────────────────────┘
```

## Training Conditions

Model akan di-retrain otomatis jika:
- Ada minimal 50 records baru sejak training terakhir
- Force flag digunakan (`python auto_train.py --force`)

## Model Accuracy

Target minimum:
- Energy Forecast: R² > 0.85
- AC Recommendation: R² > 0.90

## Environment Variables (Dashboard)

Tambahkan ke `.env` di folder `view_virtual`:

```
VITE_ML_API_URL=http://localhost:5000/api
VITE_AZURE_FUNCTION_URL=https://your-function.azurewebsites.net/api
```

## Troubleshooting

### Training Error: No data from Azure
- Pastikan ESP32 sudah mengirim data ke Azure
- Cek connection string di auto_train.py

### API Error: Models not loaded
- Jalankan training dulu: `python auto_train.py --force`
- Cek apakah file .pkl ada di folder `models/`

### Dashboard tidak menampilkan prediction
- Pastikan prediction_api.py running
- Cek console browser untuk error
- Verifikasi VITE_ML_API_URL di .env
