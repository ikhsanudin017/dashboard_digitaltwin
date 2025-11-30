#!/usr/bin/env python3
"""
Raspberry Pi People Counter - LITE VERSION
Menggunakan deteksi motion sederhana tanpa YOLO
Untuk testing koneksi MQTT dan sistem dasar
"""

import time
import json
import ssl
import paho.mqtt.client as mqtt
from datetime import datetime
import random

# ===== KONFIGURASI MQTT =====
MQTT_BROKER = "02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USERNAME = "digitaltwin"
MQTT_PASSWORD = "Digitaltwin1"
MQTT_TOPIC = "sensor/camera/people"

# ===== KONFIGURASI DEVICE =====
DEVICE_ID = "RASPBERRY_PI_CAMERA_001"
LOCATION = "Ruang Server"
PUBLISH_INTERVAL = 5  # seconds

# ===== MQTT CALLBACKS =====
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ Connected to MQTT Broker!")
        print(f"📡 Publishing to topic: {MQTT_TOPIC}")
        print(f"⏱️  Interval: {PUBLISH_INTERVAL} seconds")
        print("-" * 50)
    else:
        print(f"❌ Connection failed with code {rc}")

def on_publish(client, userdata, mid, properties=None):
    pass  # Silent publish

def on_disconnect(client, userdata, rc, properties=None):
    if rc != 0:
        print("⚠️  Unexpected disconnection. Reconnecting...")

# ===== MQTT CLIENT SETUP =====
print("🚀 Starting Raspberry Pi People Counter (LITE MODE)...")
print("=" * 50)

client = mqtt.Client(
    client_id=f"raspberry_pi_{int(time.time())}",
    protocol=mqtt.MQTTv5
)

client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)

client.on_connect = on_connect
client.on_publish = on_publish
client.on_disconnect = on_disconnect

try:
    print(f"🔌 Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    
    print("✅ MQTT client started")
    print("")
    print("📊 LITE MODE: Sending simulated people count data")
    print("💡 This is for testing - will be replaced with real camera detection")
    print("")
    
    # Simulate people counting (untuk testing)
    people_count = 0
    
    while True:
        # Simulasi perubahan jumlah orang (naik/turun/tetap)
        change = random.choice([-1, 0, 0, 0, 1])  # More likely to stay same
        people_count = max(0, min(20, people_count + change))  # Keep between 0-20
        
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        payload = {
            "deviceId": DEVICE_ID,
            "jumlahOrang": people_count,
            "timestamp": timestamp,
            "location": LOCATION
        }
        
        message = json.dumps(payload)
        result = client.publish(MQTT_TOPIC, message, qos=1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 👥 Count: {people_count} | Published ✅")
        else:
            print(f"❌ Publish failed with code {result.rc}")
        
        time.sleep(PUBLISH_INTERVAL)

except KeyboardInterrupt:
    print("\n\n🛑 Stopping...")
    client.loop_stop()
    client.disconnect()
    print("✅ Disconnected from MQTT")
    print("=" * 50)

except Exception as e:
    print(f"❌ Error: {e}")
    client.loop_stop()
    client.disconnect()
