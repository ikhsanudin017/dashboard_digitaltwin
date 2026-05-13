#!/usr/bin/env python3
"""
Azure Forwarder - Digital Twin Edge Gateway
Forward data aggregated dari RPi ke Azure Cloud

Usage:
    python3 azure_forwarder.py

Fungsi:
    - Batch data dari ESP32 + Camera + Gateway
    - Forward ke Azure Function setiap 30 detik
    - Retry logic dengan exponential backoff
"""

import sys
import os
sys.path.insert(0, '/mnt/storage/venv_new/lib/python3.13/site-packages')

import time
import json
import logging
import requests
from datetime import datetime
from threading import Thread, Lock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

# Azure Function URL
AZURE_FUNCTION_URL = os.environ.get(
    'AZURE_FUNCTION_URL',
    'https://func-digitaltwin-2026.azurewebsites.net/api/SaveSensorData'
)

# Batch interval (30 detik)
BATCH_INTERVAL_SECONDS = 30

# Retry config
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5

# ============================================================
# DATA STORAGE
# ============================================================

class AzureForwarder:
    """Forward data ke Azure dengan batching"""

    def __init__(self):
        self.lock = Lock()
        self.buffer = []
        self.last_send = time.time()
        self.total_sent = 0
        self.total_failed = 0
        self.running = True

    def add_data(self, data):
        """Tambah data ke buffer"""
        with self.lock:
            self.buffer.append({
                'data': data,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
            logger.debug(f"Data added to buffer, size: {len(self.buffer)}")

    def should_send(self):
        """Cek apakah sudah waktunya kirim"""
        return time.time() - self.last_send >= BATCH_INTERVAL_SECONDS

    def send_to_azure(self):
        """Kirim data ke Azure"""
        with self.lock:
            if len(self.buffer) == 0:
                return True

            data_to_send = self.buffer.copy()
            self.buffer.clear()

        # Create aggregated payload
        payload = self.create_aggregated_payload(data_to_send)

        # Retry logic
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Sending {len(data_to_send)} records to Azure (attempt {attempt + 1})")

                response = requests.post(
                    AZURE_FUNCTION_URL,
                    json=payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )

                if response.status_code == 200:
                    logger.info(f"Azure forward success: {response.text}")
                    self.total_sent += len(data_to_send)
                    self.last_send = time.time()
                    return True
                else:
                    logger.warning(f"Azure forward failed ({response.status_code}): {response.text}")

            except requests.exceptions.Timeout:
                logger.warning(f"Azure forward timeout (attempt {attempt + 1}/{MAX_RETRIES})")
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"Azure connection error: {e}")
            except Exception as e:
                logger.error(f"Azure forward error: {e}")

            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAY_SECONDS * (2 ** attempt)  # Exponential backoff
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)

        # All retries failed - restore buffer
        with self.lock:
            self.buffer = data_to_send + self.buffer
            self.total_failed += len(data_to_send)

        logger.error(f"Azure forward failed after {MAX_RETRIES} retries")
        return False

    def create_aggregated_payload(self, data_list):
        """Buat aggregated payload untuk Azure"""
        if not data_list:
            return {}

        # Get latest data point
        latest = data_list[-1]['data']

        return {
            "deviceId": "RASPBERRY_PI_GATEWAY_001",
            "timestamp": datetime.utcnow().isoformat() + 'Z',
            "esp32": latest.get('esp32', {}),
            "camera": latest.get('camera', {}),
            "gateway": latest.get('gateway', {}),
            "batch": {
                "count": len(data_list),
                "first_timestamp": data_list[0]['timestamp'],
                "last_timestamp": data_list[-1]['timestamp']
            }
        }

    def get_stats(self):
        """Get forwarder stats"""
        with self.lock:
            return {
                'buffer_size': len(self.buffer),
                'total_sent': self.total_sent,
                'total_failed': self.total_failed,
                'last_send_seconds_ago': int(time.time() - self.last_send)
            }


# ============================================================
# MAIN LOOP
# ============================================================

def forwarder_loop(forwarder, api_url):
    """Main loop untuk forwarder"""
    logger.info("Azure Forwarder started")
    logger.info(f"Azure URL: {AZURE_FUNCTION_URL}")
    logger.info(f"Batch interval: {BATCH_INTERVAL_SECONDS} seconds")

    while forwarder.running:
        try:
            # Fetch data dari local API
            try:
                response = requests.get(f"{api_url}/api/latest", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        forwarder.add_data(data.get('data', {}))
                else:
                    logger.warning(f"Failed to fetch data from local API: {response.status_code}")
            except Exception as e:
                logger.error(f"Error fetching from local API: {e}")

            # Check if should send
            if forwarder.should_send():
                forwarder.send_to_azure()

            # Log stats every minute
            stats = forwarder.get_stats()
            if stats['buffer_size'] > 0:
                logger.info(f"Buffer: {stats['buffer_size']} pending, Sent: {stats['total_sent']}, Failed: {stats['total_failed']}")

            time.sleep(5)  # Check every 5 seconds

        except KeyboardInterrupt:
            logger.info("Received KeyboardInterrupt, stopping...")
            forwarder.running = False
            break
        except Exception as e:
            logger.error(f"Forwarder loop error: {e}")
            time.sleep(5)

    # Final send before exit
    if forwarder.get_stats()['buffer_size'] > 0:
        logger.info("Sending final batch before exit...")
        forwarder.send_to_azure()

    logger.info("Azure Forwarder stopped")


def main():
    """Main entry point"""
    # Local API URL
    local_api_url = os.environ.get('LOCAL_API_URL', 'http://localhost:5001')

    logger.info("=" * 60)
    logger.info("Azure Forwarder - Digital Twin Edge Gateway")
    logger.info("=" * 60)
    logger.info(f"Local API: {local_api_url}")
    logger.info(f"Azure Function: {AZURE_FUNCTION_URL}")
    logger.info(f"Batch interval: {BATCH_INTERVAL_SECONDS}s")
    logger.info("=" * 60)

    forwarder = AzureForwarder()

    try:
        forwarder_loop(forwarder, local_api_url)
    except KeyboardInterrupt:
        logger.info("Shutting down...")


if __name__ == '__main__':
    main()
