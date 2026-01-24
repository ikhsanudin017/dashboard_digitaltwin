"""
Training ML Models dengan Data Real dari Azure Storage
Mengambil data langsung dari Azure Table Storage
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import pickle
import os
from datetime import datetime
from azure.data.tables import TableClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ===== CONFIG =====
STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
TABLE_NAME = os.getenv("AZURE_TABLE_NAME", "SensorTelemetry")
MODEL_DIR = "./models"

# ===== STEP 1: FETCH DATA FROM AZURE =====
def fetch_data_from_azure():
    """Mengambil data sensor dari Azure Table Storage"""
    print("=" * 60)
    print("[STEP 1] FETCHING DATA FROM AZURE STORAGE")
    print("=" * 60)
    # Extract account name from connection string
    account_name = "unknown"
    if STORAGE_CONNECTION_STRING:
        for part in STORAGE_CONNECTION_STRING.split(";"):
            if part.startswith("AccountName="):
                account_name = part.split("=")[1]
                break
    print(f"   Storage Account: {account_name}")
    print(f"   Table: {TABLE_NAME}")
    print()
    
    try:
        table_client = TableClient.from_connection_string(
            STORAGE_CONNECTION_STRING, 
            TABLE_NAME
        )
        
        entities = []
        for entity in table_client.list_entities():
            entities.append(entity)
        
        print(f"[OK] Berhasil mengambil {len(entities)} records dari Azure!")
        
        if len(entities) == 0:
            print("[ERROR] Tidak ada data di Azure Storage!")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(entities)
        
        # Show sample
        print(f"\n[INFO] Sample Data (5 records pertama):")
        print("-" * 60)
        cols_to_show = ['timestamp', 'deviceId', 'suhu', 'kelembaban', 'daya']
        available_cols = [c for c in cols_to_show if c in df.columns]
        print(df[available_cols].head())
        
        return df
        
    except Exception as e:
        print(f"[ERROR] Error fetching data: {e}")
        return None

# ===== STEP 2: PREPROCESS DATA =====
def preprocess_data(df):
    """Preprocessing data untuk training"""
    print("\n" + "=" * 60)
    print("[STEP 2] PREPROCESSING DATA")
    print("=" * 60)
    
    # Convert timestamp - coba berbagai kolom timestamp
    timestamp_col = None
    for col in ['timestamp', 'receivedAt', 'Timestamp']:
        if col in df.columns:
            timestamp_col = col
            break
    
    if timestamp_col:
        print(f"   Using timestamp column: {timestamp_col}")
        df['timestamp'] = pd.to_datetime(df[timestamp_col], errors='coerce')
        df['hour'] = df['timestamp'].dt.hour.fillna(12).astype(int)
        df['month'] = df['timestamp'].dt.month.fillna(1).astype(int)
        df['day_of_week'] = df['timestamp'].dt.dayofweek.fillna(0).astype(int)
    else:
        print("[WARNING] No timestamp column found, using default values")
        df['hour'] = 12
        df['month'] = 1
        df['day_of_week'] = 0
    
    # Convert numeric columns
    numeric_cols = ['suhu', 'kelembaban', 'tegangan', 'arus', 'daya']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Handle jumlahOrang - gunakan data real jika ada, jika tidak set None
    if 'jumlahOrang' in df.columns:
        df['jumlahOrang'] = pd.to_numeric(df['jumlahOrang'], errors='coerce')
        valid_people = df['jumlahOrang'].notna().sum()
        if valid_people > 0:
            print(f"[OK] jumlahOrang tersedia: {valid_people} records dengan data valid")
        else:
            print("[WARNING] jumlahOrang tidak ada data valid (Raspberry Pi belum mengirim)")
            df['jumlahOrang'] = None
    else:
        print("[WARNING] jumlahOrang tidak tersedia (Raspberry Pi belum mengirim)")
        df['jumlahOrang'] = None
    
    # Drop rows with NaN in critical columns
    critical_cols = ['suhu', 'kelembaban', 'daya']
    df = df.dropna(subset=[c for c in critical_cols if c in df.columns])
    
    print(f"[OK] Data setelah preprocessing: {len(df)} records")
    print(f"\n[INFO] Statistik Data:")
    print("-" * 60)
    stats_cols = ['suhu', 'kelembaban', 'daya', 'jumlahOrang']
    available_stats = [c for c in stats_cols if c in df.columns]
    print(df[available_stats].describe())
    
    return df

# ===== STEP 3: TRAIN ENERGY FORECAST MODEL =====
def train_energy_model(df):
    """Train model untuk prediksi konsumsi energi"""
    print("\n" + "=" * 60)
    print("[STEP 3] TRAINING: ENERGY FORECAST MODEL")
    print("=" * 60)
    
    # Features yang tersedia - hanya gunakan yang ada datanya
    all_features = ['suhu', 'kelembaban', 'tegangan', 'arus', 'hour']
    available_features = []
    
    for f in all_features:
        if f in df.columns and df[f].notna().sum() > 0:
            available_features.append(f)
    
    # Tambah jumlahOrang hanya jika ada data valid
    if 'jumlahOrang' in df.columns and df['jumlahOrang'].notna().sum() > 0:
        available_features.append('jumlahOrang')
        print("[OK] jumlahOrang digunakan dalam training")
    else:
        print("[WARNING] jumlahOrang TIDAK digunakan (tidak ada data dari Raspberry Pi)")
    
    if 'daya' not in df.columns:
        print("[ERROR] Kolom 'daya' tidak ditemukan!")
        return None, None, None
    
    # Filter rows dengan data lengkap
    df_clean = df.dropna(subset=available_features + ['daya'])
    
    X = df_clean[available_features].values
    y = df_clean['daya'].values
    
    print(f"\n   Features: {available_features}")
    print(f"   Target: daya (power consumption)")
    print(f"   Dataset size: {len(X)} samples")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("\n   Training RandomForestRegressor...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=20,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n[RESULT] Model Performance:")
    print(f"   MSE: {mse:.4f}")
    print(f"   MAE: {mae:.4f}")
    print(f"   R2 Score: {r2:.4f}")
    
    # Feature importance
    print(f"\n[INFO] Feature Importance:")
    for feat, imp in zip(available_features, model.feature_importances_):
        print(f"   {feat}: {imp:.4f}")
    
    return model, scaler, available_features

# ===== STEP 4: TRAIN AC RECOMMENDATION MODEL =====
def train_ac_model(df):
    """Train model untuk rekomendasi suhu AC optimal"""
    print("\n" + "=" * 60)
    print("[STEP 4] TRAINING: AC RECOMMENDATION MODEL")
    print("=" * 60)
    
    # Cek apakah jumlahOrang tersedia
    has_people_data = 'jumlahOrang' in df.columns and df['jumlahOrang'].notna().sum() > 0
    
    # Calculate recommended AC temperature
    def calculate_recommended_temp(row):
        base_temp = 24.0
        
        # People factor (more people = cooler) - hanya jika ada data
        if has_people_data and pd.notna(row.get('jumlahOrang')):
            people_factor = -row['jumlahOrang'] / 20
        else:
            people_factor = 0
        
        # Ambient temp factor
        ambient_factor = (row['suhu'] - 25) * 0.3 if row['suhu'] > 25 else 0
        
        # Humidity factor
        humidity_factor = -0.5 if row['kelembaban'] > 60 else 0
        
        # Time factor - hanya jika ada data orang
        hour = row.get('hour', 12)
        if has_people_data and pd.notna(row.get('jumlahOrang')) and 8 <= hour <= 17 and row['jumlahOrang'] > 10:
            time_factor = -1.0
        else:
            time_factor = 0
        
        recommended = base_temp + people_factor - ambient_factor + humidity_factor + time_factor
        return np.clip(recommended, 18, 28)
    
    df['recommended_temp'] = df.apply(calculate_recommended_temp, axis=1)
    
    # Features - hanya gunakan yang ada
    all_features = ['suhu', 'kelembaban', 'daya', 'hour', 'month']
    available_features = [f for f in all_features if f in df.columns and df[f].notna().sum() > 0]
    
    # Tambah jumlahOrang hanya jika ada data valid
    if has_people_data:
        available_features.append('jumlahOrang')
        print("[OK] jumlahOrang digunakan dalam training")
    else:
        print("[WARNING] jumlahOrang TIDAK digunakan (tidak ada data dari Raspberry Pi)")
    
    # Filter rows dengan data lengkap
    df_clean = df.dropna(subset=available_features + ['recommended_temp'])
    
    X = df_clean[available_features].values
    y = df_clean['recommended_temp'].values
    
    print(f"\n   Features: {available_features}")
    print(f"   Target: recommended AC temperature")
    print(f"   Dataset size: {len(X)} samples")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train
    print("\n   Training GradientBoostingRegressor...")
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n[RESULT] Model Performance:")
    print(f"   MSE: {mse:.4f}")
    print(f"   MAE: {mae:.4f}")
    print(f"   R2 Score: {r2:.4f}")
    
    return model, scaler, available_features

# ===== STEP 5: SAVE MODELS =====
def save_models(energy_model, energy_scaler, energy_features, ac_model, ac_scaler, ac_features):
    """Simpan models ke file"""
    print("\n" + "=" * 60)
    print("[STEP 5] SAVING MODELS")
    print("=" * 60)
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Save energy model dengan feature list
    with open(os.path.join(MODEL_DIR, 'energy_forecast_model.pkl'), 'wb') as f:
        pickle.dump(energy_model, f)
    with open(os.path.join(MODEL_DIR, 'scaler.pkl'), 'wb') as f:
        pickle.dump(energy_scaler, f)
    with open(os.path.join(MODEL_DIR, 'energy_features.pkl'), 'wb') as f:
        pickle.dump(energy_features, f)
    print(f"[OK] Energy Forecast Model saved!")
    print(f"   Features: {energy_features}")
    
    # Save AC model dengan feature list
    with open(os.path.join(MODEL_DIR, 'ac_recommendation_model.pkl'), 'wb') as f:
        pickle.dump(ac_model, f)
    with open(os.path.join(MODEL_DIR, 'ac_scaler.pkl'), 'wb') as f:
        pickle.dump(ac_scaler, f)
    with open(os.path.join(MODEL_DIR, 'ac_features.pkl'), 'wb') as f:
        pickle.dump(ac_features, f)
    print(f"[OK] AC Recommendation Model saved!")
    print(f"   Features: {ac_features}")
    
    print(f"\n[INFO] Models saved to: {os.path.abspath(MODEL_DIR)}/")

# ===== STEP 6: TEST PREDICTIONS =====
def test_predictions(energy_model, energy_scaler, energy_features, ac_model, ac_scaler, ac_features):
    """Test prediksi dengan data sample"""
    print("\n" + "=" * 60)
    print("[STEP 6] TESTING PREDICTIONS")
    print("=" * 60)
    
    # Test case dengan data real saat ini
    test_cases = [
        {"suhu": 29.0, "kelembaban": 76, "tegangan": 215, "arus": 0.54, "daya": 120, "hour": 8, "month": 1, "jumlahOrang": 10},
        {"suhu": 32.0, "kelembaban": 80, "tegangan": 220, "arus": 0.8, "daya": 200, "hour": 14, "month": 1, "jumlahOrang": 25},
        {"suhu": 27.0, "kelembaban": 65, "tegangan": 218, "arus": 0.4, "daya": 80, "hour": 20, "month": 1, "jumlahOrang": 5},
    ]
    
    for i, tc in enumerate(test_cases, 1):
        print(f"\n[Test Case {i}]")
        print(f"   Suhu: {tc['suhu']} C, Kelembaban: {tc['kelembaban']}%, Tegangan: {tc['tegangan']}V")
        
        # Energy prediction
        X_energy = np.array([[tc[f] for f in energy_features]])
        X_energy_scaled = energy_scaler.transform(X_energy)
        energy_pred = energy_model.predict(X_energy_scaled)[0]
        print(f"   Predicted Power: {energy_pred:.2f} W")
        
        # AC recommendation
        X_ac = np.array([[tc[f] for f in ac_features]])
        X_ac_scaled = ac_scaler.transform(X_ac)
        ac_pred = ac_model.predict(X_ac_scaled)[0]
        print(f"   Recommended AC: {ac_pred:.1f} C")

# ===== MAIN =====
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("   ML TRAINING WITH REAL AZURE DATA")
    print("=" * 60 + "\n")
    
    # Step 1: Fetch data from Azure
    df = fetch_data_from_azure()
    if df is None:
        exit(1)
    
    # Step 2: Preprocess
    df = preprocess_data(df)
    if len(df) < 10:
        print("[ERROR] Data terlalu sedikit untuk training! Minimal 10 records.")
        exit(1)
    
    # Step 3: Train Energy Model
    energy_model, energy_scaler, energy_features = train_energy_model(df)
    
    # Step 4: Train AC Model
    ac_model, ac_scaler, ac_features = train_ac_model(df)
    
    # Step 5: Save Models
    if energy_model and ac_model:
        save_models(energy_model, energy_scaler, energy_features, ac_model, ac_scaler, ac_features)
    
    # Step 6: Test
    if energy_model and ac_model:
        test_predictions(energy_model, energy_scaler, energy_features, ac_model, ac_scaler, ac_features)
    
    print("\n" + "=" * 60)
    print("[COMPLETE] TRAINING COMPLETE!")
    print("=" * 60)
    print(f"   Data source: Azure Storage (stordigitaltwin2026)")
    print(f"   Records used: {len(df)}")
    print(f"   Models saved to: {os.path.abspath(MODEL_DIR)}/")
    
    # Check jumlahOrang status
    has_people = 'jumlahOrang' in df.columns and df['jumlahOrang'].notna().sum() > 0
    if not has_people:
        print("\n[NOTE] CATATAN: jumlahOrang tidak digunakan dalam training")
        print("   Jalankan Raspberry Pi people counter untuk mendapatkan data orang")
        print("   Setelah ada data, jalankan ulang script ini untuk retrain model")
    
    print("=" * 60 + "\n")
