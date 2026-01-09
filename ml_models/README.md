# Machine Learning Models untuk Digital Twin Energy Monitoring

Folder ini berisi semua model ML untuk prediksi dan analisis data sensor.

## 📁 Struktur

- `train_model.py` - Script untuk training model
- `predict.py` - Script untuk prediksi menggunakan trained model
- `eda.ipynb` - Exploratory Data Analysis (Jupyter Notebook)
- `models/` - Tempat menyimpan trained models (.pkl, .h5, dll)

## 📊 Dataset

Data diambil dari `sensor_data_sample_2026-01-04.csv` atau dapat di-generate menggunakan script di root folder.

**Fitur yang tersedia:**
- `suhu` - Temperatur ruangan (°C)
- `kelembaban` - Kelembaban udara (%)
- `jumlahOrang` - Jumlah orang di ruangan
- `daya` - Konsumsi daya listrik (kW)
- `tegangan` - Tegangan listrik (V)
- `arus` - Arus listrik (A)

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Training model
python train_model.py

# Prediksi
python predict.py
```

## 🔧 Requirements

Lihat `requirements.txt` untuk semua dependencies yang diperlukan.
