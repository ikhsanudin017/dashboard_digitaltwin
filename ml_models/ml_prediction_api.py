"""
Azure Function - ML Prediction API
Endpoint untuk prediksi menggunakan model ML yang sudah di-train
Deploy ke Azure Functions (Python Runtime)
"""

import json
import pickle
import numpy as np
import os
from datetime import datetime

# Load models saat startup
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_models():
    """Load semua model ML"""
    models = {}
    
    try:
        # Load Energy Forecast Model
        with open(os.path.join(MODEL_DIR, 'energy_forecast_model.pkl'), 'rb') as f:
            models['energy_model'] = pickle.load(f)
        with open(os.path.join(MODEL_DIR, 'scaler.pkl'), 'rb') as f:
            models['energy_scaler'] = pickle.load(f)
        with open(os.path.join(MODEL_DIR, 'energy_features.pkl'), 'rb') as f:
            models['energy_features'] = pickle.load(f)
        
        # Load AC Recommendation Model
        with open(os.path.join(MODEL_DIR, 'ac_recommendation_model.pkl'), 'rb') as f:
            models['ac_model'] = pickle.load(f)
        with open(os.path.join(MODEL_DIR, 'ac_scaler.pkl'), 'rb') as f:
            models['ac_scaler'] = pickle.load(f)
        with open(os.path.join(MODEL_DIR, 'ac_features.pkl'), 'rb') as f:
            models['ac_features'] = pickle.load(f)
        
        print("[OK] Models loaded successfully")
        return models
    
    except Exception as e:
        print(f"[ERROR] Failed to load models: {e}")
        return None

# Global models
MODELS = None

def get_models():
    global MODELS
    if MODELS is None:
        MODELS = load_models()
    return MODELS

def predict_energy(sensor_data):
    """Prediksi konsumsi energi berdasarkan data sensor"""
    models = get_models()
    if not models:
        return None
    
    features = models['energy_features']
    model = models['energy_model']
    scaler = models['energy_scaler']
    
    # Prepare input
    X = np.array([[sensor_data.get(f, 0) for f in features]])
    X_scaled = scaler.transform(X)
    
    # Predict
    prediction = model.predict(X_scaled)[0]
    
    return {
        'predicted_power': round(float(prediction), 2),
        'unit': 'W',
        'features_used': features,
        'input_data': {f: sensor_data.get(f) for f in features}
    }

def predict_ac_recommendation(sensor_data):
    """Prediksi rekomendasi suhu AC optimal"""
    models = get_models()
    if not models:
        return None
    
    features = models['ac_features']
    model = models['ac_model']
    scaler = models['ac_scaler']
    
    # Prepare input
    X = np.array([[sensor_data.get(f, 0) for f in features]])
    X_scaled = scaler.transform(X)
    
    # Predict
    prediction = model.predict(X_scaled)[0]
    recommended_temp = round(float(prediction), 1)
    
    # Determine comfort level
    if recommended_temp <= 21:
        comfort_level = "COOL"
        reason = "AC lebih dingin karena kondisi ruangan panas atau padat"
    elif recommended_temp <= 23:
        comfort_level = "COOL_COMFORTABLE"
        reason = "Slightly cool untuk kenyamanan maksimal"
    elif recommended_temp <= 25:
        comfort_level = "COMFORTABLE"
        reason = "Setting standar untuk kenyamanan dan efisiensi energi"
    elif recommended_temp <= 26:
        comfort_level = "WARM_COMFORTABLE"
        reason = "Sedikit lebih hangat untuk penghematan energi"
    else:
        comfort_level = "WARM"
        reason = "Setting hemat energi karena kondisi ruangan sudah nyaman"
    
    # Calculate energy saving
    base_temp = 24.0
    energy_saving = abs(recommended_temp - base_temp) * 3  # ~3% per degree
    
    return {
        'recommended_temp': recommended_temp,
        'comfort_level': comfort_level,
        'reason': reason,
        'energy_saving_percent': round(energy_saving, 1),
        'confidence': 0.96,  # R2 score dari training
        'features_used': features,
        'input_data': {f: sensor_data.get(f) for f in features}
    }

# ===== HTTP Handler untuk Azure Function =====
def main(req):
    """Azure Function HTTP Trigger handler"""
    try:
        # Parse request
        req_body = req.get_json()
        prediction_type = req_body.get('type', 'ac')  # 'ac' atau 'energy'
        sensor_data = req_body.get('data', {})
        
        # Add time features jika tidak ada
        now = datetime.now()
        if 'hour' not in sensor_data:
            sensor_data['hour'] = now.hour
        if 'month' not in sensor_data:
            sensor_data['month'] = now.month
        
        # Predict
        if prediction_type == 'energy':
            result = predict_energy(sensor_data)
        else:
            result = predict_ac_recommendation(sensor_data)
        
        if result:
            return {
                'status': 200,
                'body': json.dumps({
                    'success': True,
                    'prediction_type': prediction_type,
                    'result': result,
                    'timestamp': now.isoformat()
                })
            }
        else:
            return {
                'status': 500,
                'body': json.dumps({
                    'success': False,
                    'error': 'Model not loaded'
                })
            }
    
    except Exception as e:
        return {
            'status': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }


# ===== Standalone Testing =====
if __name__ == "__main__":
    print("=" * 60)
    print("   ML PREDICTION API - Standalone Test")
    print("=" * 60)
    
    # Test data (simulasi data sensor real-time)
    test_sensor_data = {
        'suhu': 29.0,
        'kelembaban': 76,
        'tegangan': 215,
        'arus': 0.54,
        'daya': 120,
        'hour': 14,
        'month': 1,
        'jumlahOrang': 10  # Akan diabaikan jika model tidak ditraining dengan ini
    }
    
    print("\n[INPUT] Sensor Data:")
    for k, v in test_sensor_data.items():
        print(f"   {k}: {v}")
    
    # Test Energy Prediction
    print("\n[TEST] Energy Prediction:")
    energy_result = predict_energy(test_sensor_data)
    if energy_result:
        print(f"   Predicted Power: {energy_result['predicted_power']} W")
        print(f"   Features: {energy_result['features_used']}")
    else:
        print("   [ERROR] Failed to predict")
    
    # Test AC Recommendation
    print("\n[TEST] AC Recommendation:")
    ac_result = predict_ac_recommendation(test_sensor_data)
    if ac_result:
        print(f"   Recommended Temp: {ac_result['recommended_temp']} C")
        print(f"   Comfort Level: {ac_result['comfort_level']}")
        print(f"   Reason: {ac_result['reason']}")
        print(f"   Energy Saving: {ac_result['energy_saving_percent']}%")
        print(f"   Confidence: {ac_result['confidence'] * 100}%")
    else:
        print("   [ERROR] Failed to predict")
    
    print("\n" + "=" * 60)
