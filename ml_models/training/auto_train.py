"""
Auto-Training ML System with data from Azure Storage
Fetch sensor data → train models → save to ml_models/models/*.pkl

Trigger: Run manually or via cron (every 6 hours)
Threshold: min 100 records, retrain if 50+ new records since last training
Output: energy_forecast_model.pkl, ac_recommendation_model.pkl, model_config.json
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import pickle
import os
import json
from datetime import datetime
from azure.data.tables import TableClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ===== CONFIG =====
STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
TABLE_NAME = os.getenv("AZURE_TABLE_NAME", "SensorTelemetry")
MODEL_DIR = "./models"
MIN_RECORDS_FOR_TRAINING = 100  # Minimal records untuk training
RETRAIN_THRESHOLD = 50  # Retrain jika ada 50+ records baru

# ===== TRAINING STATUS FILE =====
STATUS_FILE = os.path.join(MODEL_DIR, "training_status.json")

def load_training_status():
    """Load status training terakhir"""
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, 'r') as f:
            return json.load(f)
    return {
        "last_training": None,
        "last_record_count": 0,
        "model_version": 0,
        "accuracy": {}
    }

def save_training_status(status):
    """Simpan status training"""
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2, default=str)

def fetch_data_from_azure():
    """Fetch data dari Azure Storage"""
    print("[FETCH] Mengambil data dari Azure Storage...")
    
    try:
        table_client = TableClient.from_connection_string(
            STORAGE_CONNECTION_STRING, 
            TABLE_NAME
        )
        
        entities = []
        for entity in table_client.list_entities():
            entities.append(entity)
        
        print(f"[OK] Berhasil mengambil {len(entities)} records")
        return pd.DataFrame(entities) if entities else None
        
    except Exception as e:
        print(f"[ERROR] Gagal fetch data: {e}")
        return None

def preprocess_data(df):
    """Preprocessing data untuk training"""
    print("[PREPROCESS] Memproses data...")
    
    # Convert timestamp
    timestamp_col = None
    for col in ['timestamp', 'receivedAt', 'Timestamp']:
        if col in df.columns:
            timestamp_col = col
            break
    
    if timestamp_col:
        df['timestamp'] = pd.to_datetime(df[timestamp_col], errors='coerce')
        df['hour'] = df['timestamp'].dt.hour.fillna(12).astype(int)
        df['month'] = df['timestamp'].dt.month.fillna(1).astype(int)
    else:
        df['hour'] = 12
        df['month'] = 1
    
    # Convert numeric columns
    numeric_cols = ['suhu', 'kelembaban', 'tegangan', 'arus', 'daya']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Handle jumlahOrang
    if 'jumlahOrang' in df.columns:
        df['jumlahOrang'] = pd.to_numeric(df['jumlahOrang'], errors='coerce')
        valid_people = df['jumlahOrang'].notna().sum()
        if valid_people == 0:
            df['jumlahOrang'] = None
    else:
        df['jumlahOrang'] = None
    
    # Drop NaN pada kolom critical
    critical_cols = ['suhu', 'kelembaban', 'daya']
    df = df.dropna(subset=[c for c in critical_cols if c in df.columns])
    
    print(f"[OK] Data setelah preprocessing: {len(df)} records")
    return df

def train_energy_model(df):
    """Train Energy Forecast Model"""
    print("[TRAIN] Training Energy Forecast Model...")
    
    all_features = ['suhu', 'kelembaban', 'tegangan', 'arus', 'hour']
    available_features = [f for f in all_features if f in df.columns and df[f].notna().sum() > 0]
    
    if 'jumlahOrang' in df.columns and df['jumlahOrang'].notna().sum() > 0:
        available_features.append('jumlahOrang')
    
    df_clean = df.dropna(subset=available_features + ['daya'])
    X = df_clean[available_features].values
    y = df_clean['daya'].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    model = RandomForestRegressor(n_estimators=100, max_depth=20, random_state=42, n_jobs=-1)
    model.fit(X_train_scaled, y_train)
    
    y_pred = model.predict(X_test_scaled)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"[OK] Energy Model - R2: {r2:.4f}, MAE: {mae:.4f}")
    
    return model, scaler, available_features, {'r2': r2, 'mae': mae}

def train_ac_model(df):
    """Train AC Recommendation Model"""
    print("[TRAIN] Training AC Recommendation Model...")
    
    has_people_data = 'jumlahOrang' in df.columns and df['jumlahOrang'].notna().sum() > 0
    
    def calculate_recommended_temp(row):
        base_temp = 24.0
        if has_people_data and pd.notna(row.get('jumlahOrang')):
            base_temp -= row['jumlahOrang'] / 20
        if row['suhu'] > 25:
            base_temp -= (row['suhu'] - 25) * 0.3
        if row['kelembaban'] > 60:
            base_temp -= 0.5
        hour = row.get('hour', 12)
        if 8 <= hour <= 17:
            base_temp -= 0.3
        return np.clip(base_temp, 18, 28)
    
    df['recommended_temp'] = df.apply(calculate_recommended_temp, axis=1)
    
    all_features = ['suhu', 'kelembaban', 'daya', 'hour', 'month']
    available_features = [f for f in all_features if f in df.columns and df[f].notna().sum() > 0]
    
    if has_people_data:
        available_features.append('jumlahOrang')
    
    df_clean = df.dropna(subset=available_features + ['recommended_temp'])
    X = df_clean[available_features].values
    y = df_clean['recommended_temp'].values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    model = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    y_pred = model.predict(X_test_scaled)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"[OK] AC Model - R2: {r2:.4f}, MAE: {mae:.4f}")
    
    return model, scaler, available_features, {'r2': r2, 'mae': mae}

def save_models(energy_model, energy_scaler, energy_features, 
                ac_model, ac_scaler, ac_features, metrics):
    """Simpan semua model"""
    print("[SAVE] Menyimpan model...")
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Save Energy Model
    with open(os.path.join(MODEL_DIR, 'energy_forecast_model.pkl'), 'wb') as f:
        pickle.dump(energy_model, f)
    with open(os.path.join(MODEL_DIR, 'scaler.pkl'), 'wb') as f:
        pickle.dump(energy_scaler, f)
    with open(os.path.join(MODEL_DIR, 'energy_features.pkl'), 'wb') as f:
        pickle.dump(energy_features, f)
    
    # Save AC Model
    with open(os.path.join(MODEL_DIR, 'ac_recommendation_model.pkl'), 'wb') as f:
        pickle.dump(ac_model, f)
    with open(os.path.join(MODEL_DIR, 'ac_scaler.pkl'), 'wb') as f:
        pickle.dump(ac_scaler, f)
    with open(os.path.join(MODEL_DIR, 'ac_features.pkl'), 'wb') as f:
        pickle.dump(ac_features, f)
    
    # Save model config untuk API
    config = {
        "energy_features": energy_features,
        "ac_features": ac_features,
        "energy_metrics": metrics['energy'],
        "ac_metrics": metrics['ac'],
        "training_date": datetime.now().isoformat(),
        "model_version": metrics.get('version', 1)
    }
    with open(os.path.join(MODEL_DIR, 'model_config.json'), 'w') as f:
        json.dump(config, f, indent=2)
    
    print("[OK] Model tersimpan!")

def should_retrain(current_count, status):
    """Cek apakah perlu training ulang"""
    if status['last_record_count'] == 0:
        return True
    
    new_records = current_count - status['last_record_count']
    if new_records >= RETRAIN_THRESHOLD:
        print(f"[INFO] {new_records} records baru ditemukan, perlu retrain")
        return True
    
    print(f"[INFO] Hanya {new_records} records baru, belum perlu retrain (threshold: {RETRAIN_THRESHOLD})")
    return False

def run_auto_training(force=False):
    """Main function untuk auto-training"""
    print("=" * 60)
    print("   AUTO-TRAINING ML SYSTEM")
    print("   " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 60)
    
    # Load status
    status = load_training_status()
    print(f"[INFO] Last training: {status['last_training']}")
    print(f"[INFO] Last record count: {status['last_record_count']}")
    
    # Fetch data
    df = fetch_data_from_azure()
    if df is None or len(df) == 0:
        print("[ERROR] Tidak ada data dari Azure")
        return False
    
    current_count = len(df)
    print(f"[INFO] Current record count: {current_count}")
    
    # Cek apakah perlu retrain
    if not force and not should_retrain(current_count, status):
        print("[SKIP] Training dilewati, data belum cukup berubah")
        return False
    
    # Preprocess
    df = preprocess_data(df)
    if len(df) < MIN_RECORDS_FOR_TRAINING:
        print(f"[ERROR] Data tidak cukup untuk training (min: {MIN_RECORDS_FOR_TRAINING})")
        return False
    
    # Train models
    energy_model, energy_scaler, energy_features, energy_metrics = train_energy_model(df)
    ac_model, ac_scaler, ac_features, ac_metrics = train_ac_model(df)
    
    # Save models
    new_version = status['model_version'] + 1
    metrics = {
        'energy': energy_metrics,
        'ac': ac_metrics,
        'version': new_version
    }
    save_models(energy_model, energy_scaler, energy_features,
                ac_model, ac_scaler, ac_features, metrics)
    
    # Update status
    status['last_training'] = datetime.now().isoformat()
    status['last_record_count'] = current_count
    status['model_version'] = new_version
    status['accuracy'] = {
        'energy_r2': energy_metrics['r2'],
        'ac_r2': ac_metrics['r2']
    }
    save_training_status(status)
    
    print("\n" + "=" * 60)
    print("[COMPLETE] Auto-training selesai!")
    print(f"   Model Version: {new_version}")
    print(f"   Records Used: {len(df)}")
    print(f"   Energy R2: {energy_metrics['r2']:.4f}")
    print(f"   AC R2: {ac_metrics['r2']:.4f}")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    import sys
    force = '--force' in sys.argv
    run_auto_training(force=force)
