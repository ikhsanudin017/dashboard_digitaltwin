#!/usr/bin/env python3
"""
ML Processing Pipeline - Digital Twin Edge Gateway
Reliable data sync to Azure with retry and buffer mechanism.

Data flow:
  ESP32 → RPi (local_api) → Azure Function (Table Storage)

Features:
  - Retry with exponential backoff (3 attempts)
  - Local buffer queue for failed data
  - Auto-retry buffered data periodically
  - Better error handling and logging

Usage:
    source /mnt/storage/venv_new/bin/activate
    python3 ml_pipeline.py

Environment Variables:
    - AZURE_FUNCTION_URL: Azure Function endpoint
    - AZURE_FUNCTION_KEY: Azure Function access key
    - DEVICE_ID: Device identifier
    - LOCAL_API_URL: Local RPi API endpoint (default: http://localhost:5001)
    - POLLING_INTERVAL: Seconds between polls (default: 3)
    - BUFFER_FILE: Path to local buffer file (default: /mnt/storage/send_buffer.json)
    - BUFFER_RETRY_INTERVAL: Seconds between buffer retry attempts (default: 30)
"""

import sys
import os
sys.path.insert(0, '/mnt/storage/venv_new/lib/python3.13/site-packages')

import time
import json
import logging
import requests
import statistics
import threading
from datetime import datetime, timezone
from collections import deque
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

DEVICE_ID = os.environ.get('DEVICE_ID', 'RASPBERRY_PI_GATEWAY_001')
AZURE_FUNCTION_URL = os.environ.get('AZURE_FUNCTION_URL', 'https://func-digitaltwin-2026.azurewebsites.net/api/sensor/save')
AZURE_FUNCTION_KEY = os.environ.get('AZURE_FUNCTION_KEY', '')
LOCAL_API_URL = os.environ.get('LOCAL_API_URL', 'http://localhost:5001')
POLLING_INTERVAL = int(os.environ.get('POLLING_INTERVAL', '3'))
BUFFER_FILE = os.environ.get('BUFFER_FILE', '/mnt/storage/send_buffer.json')
BUFFER_RETRY_INTERVAL = int(os.environ.get('BUFFER_RETRY_INTERVAL', '30'))
MAX_RETRIES = 3
INITIAL_BACKOFF = 1  # seconds


# ============================================================
# DATA VALIDATOR
# ============================================================

class DataValidator:
    """Validasi range sensor"""

    VALID_RANGES = {
        'suhu': (0, 60),
        'kelembaban': (0, 100),
        'arus': (0, 50),
        'tegangan': (0, 300),
        'daya': (0, 5000),
        'people_count': (0, 100),
    }

    def is_valid(self, field, value):
        if field not in self.VALID_RANGES or value is None:
            return True
        min_val, max_val = self.VALID_RANGES[field]
        return min_val <= value <= max_val


# ============================================================
# LOCAL BUFFER (for failed sends)
# ============================================================

class LocalBuffer:
    """Persistent local buffer for failed data"""

    def __init__(self, buffer_file):
        self.buffer_file = buffer_file
        self.lock = threading.Lock()
        self.buffer = self._load()

    def _load(self):
        """Load buffer from file"""
        try:
            if os.path.exists(self.buffer_file):
                with open(self.buffer_file, 'r') as f:
                    data = json.load(f)
                    logger.info(f"Loaded {len(data)} buffered records")
                    return deque(data)
        except Exception as e:
            logger.warning(f"Failed to load buffer: {e}")
        return deque()

    def _save(self):
        """Save buffer to file"""
        try:
            with open(self.buffer_file, 'w') as f:
                json.dump(list(self.buffer), f)
        except Exception as e:
            logger.error(f"Failed to save buffer: {e}")

    def add(self, data):
        """Add data to buffer"""
        with self.lock:
            # Add timestamp for tracking
            data['buffered_at'] = datetime.now(timezone.utc).isoformat()
            data['retry_count'] = 0
            self.buffer.append(data)
            self._save()
            logger.debug(f"Added to buffer. Buffer size: {len(self.buffer)}")

    def get_batch(self, max_items=50):
        """Get batch of data for retry"""
        with self.lock:
            batch = []
            for i, item in enumerate(self.buffer):
                if i >= max_items:
                    break
                batch.append(item)
            return batch

    def remove(self, items):
        """Remove successfully sent items from buffer"""
        with self.lock:
            for item in items:
                try:
                    self.buffer.remove(item)
                except ValueError:
                    pass
            if items:
                self._save()
                logger.info(f"Removed {len(items)} items from buffer. Remaining: {len(self.buffer)}")

    def size(self):
        """Get buffer size"""
        with self.lock:
            return len(self.buffer)

    def increment_retry(self, item):
        """Increment retry count for an item"""
        with self.lock:
            for i, buf_item in enumerate(self.buffer):
                if buf_item.get('buffered_at') == item.get('buffered_at'):
                    self.buffer[i]['retry_count'] = self.buffer[i].get('retry_count', 0) + 1
                    break
            self._save()


# ============================================================
# AZURE SENDER WITH RETRY
# ============================================================

class AzureSender:
    """Send data to Azure with retry logic"""

    def __init__(self):
        self.validator = DataValidator()
        self.buffer = LocalBuffer(BUFFER_FILE)
        self.stats = {
            'total_sent': 0,
            'total_failed': 0,
            'buffer_retries': 0
        }

    def send_with_retry(self, payload, max_retries=MAX_RETRIES):
        """Send data with exponential backoff retry"""
        headers = {
            'Content-Type': 'application/json',
            'x-functions-key': AZURE_FUNCTION_KEY
        }

        # Prepare payload
        send_payload = {
            'deviceId': DEVICE_ID,
            'timestamp': payload.get('timestamp', datetime.now(timezone.utc).isoformat()),
            'suhu': payload.get('suhu'),
            'kelembaban': payload.get('kelembaban'),
            'arus': payload.get('arus'),
            'tegangan': payload.get('tegangan'),
            'daya': payload.get('daya'),
            'jumlahOrang': payload.get('people_count', 0),
            'ml_processed': True
        }

        # Validate data before sending
        for field in ['suhu', 'kelembaban', 'arus', 'tegangan', 'daya']:
            value = send_payload.get(field)
            if not self.validator.is_valid(field, value):
                logger.warning(f"Invalid {field} value: {value} - skipping")
                return False

        # Retry loop with exponential backoff
        last_error = None
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    AZURE_FUNCTION_URL,
                    json=send_payload,
                    headers=headers,
                    timeout=30
                )

                if response.status_code in [200, 204]:
                    self.stats['total_sent'] += 1
                    return True
                elif response.status_code == 401:
                    logger.error("Azure Function authentication failed (401)")
                    last_error = f"Auth error: {response.status_code}"
                    break  # Don't retry auth errors
                else:
                    last_error = f"HTTP {response.status_code}: {response.text[:100]}"
                    logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {last_error}")

            except requests.exceptions.Timeout:
                last_error = "Connection timeout"
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: timeout")
            except requests.exceptions.ConnectionError as e:
                last_error = f"Connection error: {str(e)[:50]}"
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {last_error}")
            except Exception as e:
                last_error = str(e)
                logger.error(f"Unexpected error: {last_error}")
                break

            # Exponential backoff
            if attempt < max_retries - 1:
                backoff = INITIAL_BACKOFF * (2 ** attempt)
                logger.info(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)

        # All retries failed - add to buffer
        self.stats['total_failed'] += 1
        self.buffer.add(send_payload)
        logger.error(f"Failed after {max_retries} attempts. Added to buffer. Last error: {last_error}")
        return False

    def retry_buffer(self):
        """Retry sending buffered data"""
        if self.buffer.size() == 0:
            return

        self.stats['buffer_retries'] += 1
        logger.info(f"Retrying buffered data ({self.buffer.size()} records)...")

        batch = self.buffer.get_batch(max_items=50)
        success_items = []

        for item in batch:
            # Check if max retries exceeded
            retry_count = item.get('retry_count', 0)
            if retry_count >= MAX_RETRIES * 2:  # Give buffer 2x retries
                logger.warning(f"Max retries exceeded for buffered item. Dropping.")
                success_items.append(item)  # Remove from buffer
                continue

            try:
                headers = {
                    'Content-Type': 'application/json',
                    'x-functions-key': AZURE_FUNCTION_KEY
                }

                response = requests.post(
                    AZURE_FUNCTION_URL,
                    json=item,
                    headers=headers,
                    timeout=30
                )

                if response.status_code in [200, 204]:
                    self.stats['total_sent'] += 1
                    success_items.append(item)
                elif response.status_code == 401:
                    logger.error("Auth failed during buffer retry")
                    break
                else:
                    # Increment retry count and keep in buffer
                    self.buffer.increment_retry(item)

            except Exception as e:
                logger.warning(f"Buffer retry failed: {e}")
                self.buffer.increment_retry(item)

        # Remove successful items from buffer
        if success_items:
            self.buffer.remove(success_items)
            logger.info(f"Buffer retry complete. Sent: {len(success_items)}, Remaining: {self.buffer.size()}")

    def get_stats(self):
        """Get sender statistics"""
        return {
            **self.stats,
            'buffer_size': self.buffer.size()
        }


# ============================================================
# ML PIPELINE
# ============================================================

class MLPipeline:
    """Pipeline processing data sensor"""

    def __init__(self):
        self.sender = AzureSender()
        self.total_processed = 0
        self.last_buffer_retry = 0

    def process_and_send(self, raw_data):
        """Process and send data to Azure"""
        esp32 = raw_data.get('esp32', {})
        camera = raw_data.get('camera', {})

        # Check TinyML anomaly
        tinyml = esp32.get('tinyml', {})
        if tinyml.get('anomaly'):
            logger.debug("TinyML anomaly detected - data may be noisy")

        payload = {
            'suhu': esp32.get('suhu'),
            'kelembaban': esp32.get('kelembaban'),
            'arus': esp32.get('arus'),
            'tegangan': esp32.get('tegangan'),
            'daya': esp32.get('daya'),
            'people_count': camera.get('people_count', 0),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'device_id': DEVICE_ID,
            'ml_processed': True
        }

        self.total_processed += 1
        success = self.sender.send_with_retry(payload)

        if self.total_processed % 100 == 0:
            stats = self.sender.get_stats()
            logger.info(f"Stats: sent={stats['total_sent']}, failed={stats['total_failed']}, buffer={stats['buffer_size']}")

        return success


# ============================================================
# MAIN
# ============================================================

def main():
    logger.info("=" * 60)
    logger.info("ML Pipeline - Digital Twin (v2 - Reliable)")
    logger.info("=" * 60)
    logger.info(f"Azure Function: {AZURE_FUNCTION_URL}")
    logger.info(f"Device ID: {DEVICE_ID}")
    logger.info(f"Polling: {POLLING_INTERVAL}s")
    logger.info(f"Buffer file: {BUFFER_FILE}")
    logger.info("=" * 60)

    pipeline = MLPipeline()
    esp32_seen = False
    start_time = time.time()

    try:
        while True:
            try:
                # Send buffered data periodically
                current_time = time.time()
                if current_time - pipeline.last_buffer_retry >= BUFFER_RETRY_INTERVAL:
                    pipeline.sender.retry_buffer()
                    pipeline.last_buffer_retry = current_time

                # Poll local API
                response = requests.get(f"{LOCAL_API_URL}/api/latest", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        raw_data = data.get('data', {})
                        esp32 = raw_data.get('esp32', {})

                        # Check if ESP32 is online
                        suhu = esp32.get('suhu')
                        kelembaban = esp32.get('kelembaban')
                        arus = esp32.get('arus')
                        tegangan = esp32.get('tegangan')
                        daya = esp32.get('daya')

                        all_null = all(v is None for v in [suhu, kelembaban, arus, tegangan, daya])

                        if all_null:
                            if esp32_seen:
                                if int(current_time) % 60 == 0:  # Log once per minute
                                    logger.debug("ESP32 offline - waiting...")
                        else:
                            esp32_seen = True
                            pipeline.process_and_send(raw_data)

            except requests.exceptions.ConnectionError as e:
                logger.warning(f"Cannot connect to local API: {e}")
            except Exception as e:
                logger.error(f"Error in main loop: {e}")

            time.sleep(POLLING_INTERVAL)

    except KeyboardInterrupt:
        elapsed = time.time() - start_time
        stats = pipeline.sender.get_stats()
        logger.info("=" * 60)
        logger.info("ML Pipeline stopped")
        logger.info(f"Uptime: {int(elapsed / 60)} minutes")
        logger.info(f"Total processed: {pipeline.total_processed}")
        logger.info(f"Stats: sent={stats['total_sent']}, failed={stats['total_failed']}, buffer={stats['buffer_size']}")
        logger.info("=" * 60)


if __name__ == '__main__':
    main()