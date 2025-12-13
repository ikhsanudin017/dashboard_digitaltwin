#!/usr/bin/env python3
"""
MQTT to Azure Bridge
Menggantikan HiveMQ Webhook (karena free tier tidak punya webhook feature)

Script ini:
1. Subscribe ke MQTT topic sensor/dht11/data
2. Forward setiap message ke Azure Function
3. Berjalan di background terus-menerus
"""

import paho.mqtt.client as mqtt
import requests
import json
import time
import sys

# ===== KONFIGURASI HIVEMQ =====
MQTT_BROKER = "aa736fd1494847d087ef6244a8428cf9.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USERNAME = "digitaltwin"
MQTT_PASSWORD = "Digitaltwin1"
MQTT_TOPIC = "sensor/dht11/data"

# ===== KONFIGURASI AZURE FUNCTION =====
AZURE_FUNCTION_URL = "https://func-energymonitor-7d2e5be2.azurewebsites.net/api/MqttToIoTHub"
AZURE_FUNCTION_KEY = "mNpa40kUFdVOKzkFl3KjL_JQvVFJKm9R7VY747Y5eBB4AzFuIOZ1ow=="

# Statistik
messages_received = 0
messages_sent = 0
messages_failed = 0

def on_connect(client, userdata, flags, rc):
    """Callback saat connect ke MQTT broker"""
    if rc == 0:
        print("✅ Connected to HiveMQ Cloud!")
        print(f"📡 Subscribing to topic: {MQTT_TOPIC}")
        client.subscribe(MQTT_TOPIC, qos=1)
    else:
        print(f"❌ Connection failed with code {rc}")
        sys.exit(1)

def on_disconnect(client, userdata, rc):
    """Callback saat disconnect dari MQTT broker"""
    if rc != 0:
        print(f"⚠️  Unexpected disconnect. Reconnecting...")

def on_message(client, userdata, msg):
    """Callback saat menerima message dari MQTT"""
    global messages_received, messages_sent, messages_failed
    
    messages_received += 1
    
    try:
        # Parse JSON payload
        payload = json.loads(msg.payload.decode())
        
        print(f"\n📥 [{messages_received}] Data received from ESP32:")
        print(f"   Suhu: {payload.get('suhu')}°C")
        print(f"   Kelembaban: {payload.get('kelembaban')}%")
        print(f"   Tegangan: {payload.get('tegangan')}V")
        print(f"   Arus: {payload.get('arus')}A")
        print(f"   Daya: {payload.get('daya')}W")
        
        # Forward ke Azure Function
        url = f"{AZURE_FUNCTION_URL}?code={AZURE_FUNCTION_KEY}"
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            messages_sent += 1
            print(f"✅ Forwarded to Azure (Total: {messages_sent})")
        else:
            messages_failed += 1
            print(f"❌ Azure Function error: {response.status_code}")
            print(f"   Response: {response.text[:100]}")
            
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        messages_failed += 1
    except requests.RequestException as e:
        print(f"❌ Network error: {e}")
        messages_failed += 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        messages_failed += 1

def main():
    print("=" * 60)
    print("🌉 MQTT to Azure Bridge")
    print("=" * 60)
    print(f"MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"Topic: {MQTT_TOPIC}")
    print(f"Azure Function: {AZURE_FUNCTION_URL}")
    print("=" * 60)
    print()
    
    # Create MQTT client
    client = mqtt.Client(client_id=f"bridge_{int(time.time())}", protocol=mqtt.MQTTv311)
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.tls_set(cert_reqs=mqtt.ssl.CERT_NONE)  # Disable cert verification for simplicity
    client.tls_insecure_set(True)
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    # Connect to broker
    print("🔌 Connecting to HiveMQ Cloud...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    # Start loop
    print("🔄 Bridge is running... (Press Ctrl+C to stop)")
    print()
    
    try:
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping bridge...")
        print(f"\n📊 Statistics:")
        print(f"   Messages received: {messages_received}")
        print(f"   Messages sent: {messages_sent}")
        print(f"   Messages failed: {messages_failed}")
        print(f"   Success rate: {(messages_sent/messages_received*100) if messages_received > 0 else 0:.1f}%")
        client.disconnect()
        print("✅ Bridge stopped")

if __name__ == "__main__":
    main()
