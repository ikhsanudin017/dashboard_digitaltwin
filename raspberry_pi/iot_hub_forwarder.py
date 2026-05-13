#!/usr/bin/env python3
"""
IoT Hub REST Forwarder - Digital Twin Edge Gateway
Forward data ke Azure IoT Hub via HTTPS REST API

Usage:
    source /mnt/storage/venv_new/bin/activate
    python3 iot_hub_forwarder.py

Fungsi:
    - Fetch data dari local API
    - Forward ke Azure IoT Hub via HTTPS REST API
    - Pakai device SAS token
"""

import sys
import os
sys.path.insert(0, '/mnt/storage/venv_new/lib/python3.13/site-packages')

import time
import json
import logging
import base64
import hashlib
import hmac
import urllib.parse
import requests
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

# Azure IoT Hub Configuration
IOT_HUB_NAME = "iothub-digitaltwin-2026"
IOT_HUB_HOST = f"{IOT_HUB_NAME}.azure-devices.net"

# Device credentials (from Azure CLI)
DEVICE_ID = "RASPBERRY_PI_GATEWAY_001"
DEVICE_KEY = "44Wf9Bd557KxEXiQSNxAOUrD4GWjuBx56D2lK1Qw7mg="

# Local API URL
LOCAL_API_URL = os.environ.get('LOCAL_API_URL', 'http://localhost:5001')

# Polling interval
POLLING_INTERVAL = 30  # detik

# ============================================================
# SAS TOKEN GENERATION (for REST API)
# ============================================================

def generate_sas_token(uri, key, expiry=3600):
    """
    Generate SAS token untuk Azure IoT Hub REST API
    URI should be the hub hostname only (lowercase)
    """
    import time
    ttl = int(time.time()) + expiry

    # URI for IoT Hub - must be lowercase hub hostname
    resource_uri = IOT_HUB_HOST.lower()

    # Create string to sign: resource URI + expiry
    string_to_sign = f"{resource_uri}\n{ttl}"

    # Decode key and compute HMAC-SHA256
    key_bytes = base64.b64decode(key)
    message = string_to_sign.encode('utf-8')
    signed_hmac = hmac.new(key_bytes, message, hashlib.sha256)
    signature = base64.b64encode(signed_hmac.digest()).decode('utf-8')

    # URL encode the signature
    encoded_sig = urllib.parse.quote(signature, safe='')
    encoded_uri = urllib.parse.quote(resource_uri, safe='')

    return f"SharedAccessSignature sr={encoded_uri}&sig={encoded_sig}&se={ttl}"

# ============================================================
# IOT HUB REST FORWARDER
# ============================================================

class IoTHubRestForwarder:
    """Forward data ke Azure IoT Hub via HTTPS REST API"""

    def __init__(self):
        self.base_url = f"https://{IOT_HUB_HOST}"
        self.sas_token = None
        self.total_sent = 0
        self.total_failed = 0

    def generate_token(self):
        """Generate/refresh SAS token"""
        # Use hub hostname only (lowercase) for the URI
        self.sas_token = generate_sas_token(IOT_HUB_HOST.lower(), DEVICE_KEY)
        logger.info("SAS token generated")

    def send_message(self, payload):
        """Send message ke IoT Hub via REST API"""
        if not self.sas_token:
            self.generate_token()

        url = f"{self.base_url}/devices/{DEVICE_ID}/messages/events?api-version=2021-04-12"

        headers = {
            'Content-Type': 'application/json',
            'Authorization': self.sas_token,
            'iothub-app-custom-header': 'digitaltwin-gateway'
        }

        try:
            response = requests.post(url, data=json.dumps(payload), headers=headers, timeout=30)

            # 204 No Content = Success (message accepted by IoT Hub)
            # 200 OK = also success
            if response.status_code in [200, 204]:
                logger.info(f"Message sent to IoT Hub (status: {response.status_code})")
                self.total_sent += 1
                return True
            elif response.status_code == 401:
                # Token expired, regenerate
                logger.warning("Token expired, regenerating...")
                self.generate_token()
                return self.send_message(payload)
            else:
                logger.error(f"Failed to send (status: {response.status_code}): {response.text}")
                self.total_failed += 1
                return False

        except requests.exceptions.Timeout:
            logger.error("Request timeout")
            self.total_failed += 1
            return False
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {e}")
            self.total_failed += 1
            return False
        except Exception as e:
            logger.error(f"Error: {e}")
            self.total_failed += 1
            return False

# ============================================================
# MAIN LOOP
# ============================================================

def main():
    logger.info("=" * 60)
    logger.info("IoT Hub REST Forwarder - Digital Twin Edge Gateway")
    logger.info("=" * 60)
    logger.info(f"IoT Hub: {IOT_HUB_HOST}")
    logger.info(f"Device ID: {DEVICE_ID}")
    logger.info(f"Local API: {LOCAL_API_URL}")
    logger.info(f"Polling interval: {POLLING_INTERVAL}s")
    logger.info("=" * 60)

    # Create forwarder
    forwarder = IoTHubRestForwarder()

    # Generate initial token
    forwarder.generate_token()

    logger.info("Starting forwarder loop...")

    try:
        while True:
            # Fetch data dari local API
            try:
                response = requests.get(f"{LOCAL_API_URL}/api/latest", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        payload = data.get('data', {})

                        # Add gateway metadata
                        payload['gateway'] = payload.get('gateway', {})
                        payload['gateway']['deviceId'] = DEVICE_ID
                        payload['gateway']['timestamp'] = datetime.now(timezone.utc).isoformat()

                        # Send to IoT Hub
                        if forwarder.send_message(payload):
                            logger.info(f"Data sent (Total: {forwarder.total_sent})")
                        else:
                            logger.warning(f"Failed (Failed: {forwarder.total_failed})")
                else:
                    logger.warning(f"API error: {response.status_code}")
            except Exception as e:
                logger.error(f"Error fetching data: {e}")

            # Wait for next interval
            time.sleep(POLLING_INTERVAL)

    except KeyboardInterrupt:
        logger.info("Stopped")
    finally:
        logger.info(f"Total sent: {forwarder.total_sent}, Failed: {forwarder.total_failed}")


if __name__ == '__main__':
    main()
