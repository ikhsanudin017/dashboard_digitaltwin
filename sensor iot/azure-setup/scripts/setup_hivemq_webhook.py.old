#!/usr/bin/env python3
"""
HiveMQ Cloud Webhook Configuration Script
Script ini untuk setup webhook di HiveMQ Cloud yang akan forward data ke Azure Function
"""

import requests
import json
import os

# Konfigurasi HiveMQ Cloud
HIVEMQ_CLUSTER_URL = "https://console.hivemq.cloud"
HIVEMQ_API_KEY = os.getenv("HIVEMQ_API_KEY", "YOUR_HIVEMQ_API_KEY")

# Konfigurasi Azure Function
AZURE_FUNCTION_URL = os.getenv("AZURE_FUNCTION_URL", "https://your-function-app.azurewebsites.net/api/MqttToIoTHub")
AZURE_FUNCTION_KEY = os.getenv("AZURE_FUNCTION_KEY", "YOUR_FUNCTION_KEY")

def create_hivemq_webhook():
    """
    Setup webhook di HiveMQ Cloud untuk forward MQTT messages ke Azure Function
    
    NOTE: HiveMQ Cloud saat ini tidak support webhook automation via API.
    Anda harus setup manual di HiveMQ Console:
    
    1. Login ke https://console.hivemq.cloud
    2. Pilih cluster Anda
    3. Navigate ke "Integrations" atau "Extensions"
    4. Add HTTP Webhook dengan konfigurasi:
       - URL: {AZURE_FUNCTION_URL}
       - Method: POST
       - Headers: 
         * Content-Type: application/json
         * x-functions-key: {AZURE_FUNCTION_KEY}
       - Topic Filter: sensor/dht11/data
    """
    
    webhook_config = {
        "url": f"{AZURE_FUNCTION_URL}?code={AZURE_FUNCTION_KEY}",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json"
        },
        "topic_filter": "sensor/dht11/data"
    }
    
    print("=" * 60)
    print("HIVEMQ WEBHOOK CONFIGURATION")
    print("=" * 60)
    print("\nManual Setup Required in HiveMQ Console:")
    print("\n1. Login: https://console.hivemq.cloud")
    print("2. Select your cluster")
    print("3. Go to: Integrations > Add Integration > HTTP Webhook")
    print("\n4. Configuration:")
    print(f"   URL: {webhook_config['url']}")
    print(f"   Method: {webhook_config['method']}")
    print(f"   Headers:")
    for key, value in webhook_config['headers'].items():
        print(f"     - {key}: {value}")
    print(f"   Topic Filter: {webhook_config['topic_filter']}")
    print("\n5. Test the webhook after setup")
    print("=" * 60)
    
    return webhook_config

def test_azure_function():
    """Test Azure Function endpoint"""
    
    test_payload = {
        "suhu": 27.5,
        "kelembaban": 85.0,
        "tegangan": 220.0,
        "arus": 1.5,
        "daya": 330.0,
        "status_tegangan": "terhubung",
        "status_arus": "terhubung"
    }
    
    try:
        url = f"{AZURE_FUNCTION_URL}?code={AZURE_FUNCTION_KEY}"
        response = requests.post(
            url,
            json=test_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print("\n" + "=" * 60)
        print("AZURE FUNCTION TEST")
        print("=" * 60)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        print("=" * 60)
        
        if response.status_code == 200:
            print("✓ Azure Function is working correctly!")
            return True
        else:
            print("✗ Azure Function returned an error")
            return False
            
    except Exception as e:
        print(f"\n✗ Error testing Azure Function: {e}")
        return False

if __name__ == "__main__":
    print("\n🚀 Setting up HiveMQ to Azure Digital Twins Integration\n")
    
    # Generate webhook configuration
    webhook_config = create_hivemq_webhook()
    
    # Test Azure Function
    print("\nTesting Azure Function endpoint...")
    test_azure_function()
    
    print("\n✓ Setup instructions generated!")
    print("\nNext steps:")
    print("1. Setup webhook in HiveMQ Console (manual)")
    print("2. Deploy Azure Function to Azure")
    print("3. Create Azure IoT Hub")
    print("4. Create Azure Digital Twins instance")
    print("5. Upload DTDL model to ADT")
    print("6. Create digital twin instance")
