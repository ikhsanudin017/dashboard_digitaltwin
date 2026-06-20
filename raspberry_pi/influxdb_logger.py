#!/usr/bin/env python3
"""
InfluxDB Data Logger - Digital Twin Edge Gateway
Write sensor data + gateway metrics to InfluxDB

Usage:
    source /mnt/storage/venv_new/bin/activate
    python3 influxdb_logger.py
"""

import sys
import os
sys.path.insert(0, '/mnt/storage/venv_new/lib/python3.13/site-packages')

import time
import json
import logging
import requests
from datetime import datetime, timezone

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.rest import ApiException

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

INFLUX_URL = os.environ.get('INFLUX_URL', 'http://localhost:8086')
INFLUX_TOKEN = os.environ.get('INFLUX_TOKEN', '')
INFLUX_ORG = os.environ.get('INFLUX_ORG', 'digitaltwin')
INFLUX_BUCKET = os.environ.get('INFLUX_BUCKET', 'sensor_data')

LOCAL_API_URL = os.environ.get('LOCAL_API_URL', 'http://localhost:5001')
POLLING_INTERVAL = 10


def write_to_influx(client, data):
    """Write data point to InfluxDB"""
    if not client:
        logger.debug("InfluxDB client not configured; skipping writes")
        return
    try:
        with client.write_api() as write_api:
            # ESP32 Sensor Data
            esp32 = data.get('esp32', {})
            if esp32.get('suhu') is not None:
                point_esp32 = Point("esp32_sensor")
                point_esp32.time(datetime.now(timezone.utc), WritePrecision.S)
                point_esp32.tag("source", "esp32")
                point_esp32.field("suhu", float(esp32.get('suhu', 0)))
                point_esp32.field("kelembaban", float(esp32.get('kelembaban', 0)))
                point_esp32.field("arus", float(esp32.get('arus', 0)))
                point_esp32.field("tegangan", float(esp32.get('tegangan', 0)))
                point_esp32.field("daya", float(esp32.get('daya', 0)))
                point_esp32.field("received", esp32.get('received', ''))

                # TinyML data
                tinyml = esp32.get('tinyml', {})
                point_esp32.field("tinyml_anomaly", tinyml.get('anomaly', False))
                point_esp32.field("tinyml_confidence", tinyml.get('confidence', 0))
                point_esp32.field("tinyml_inference_us", tinyml.get('inference_us', 0))

                write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point_esp32)
                logger.info("ESP32 data written to InfluxDB")

            # Camera / People Count
            camera = data.get('camera', {})
            if camera:
                point_camera = Point("camera")
                point_camera.time(datetime.now(timezone.utc), WritePrecision.S)
                point_camera.tag("source", "rpi_yolo")
                point_camera.field("people_count", camera.get('people_count', 0))
                point_camera.field("fps", camera.get('fps', 0))
                write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point_camera)
                logger.info("Camera data written to InfluxDB")

            # Gateway / Hardware Metrics
            gateway = data.get('gateway', {})
            if gateway:
                point_gateway = Point("gateway")
                point_gateway.time(datetime.now(timezone.utc), WritePrecision.S)
                point_gateway.tag("source", "rpi_gateway")
                point_gateway.field("cpu_percent", gateway.get('cpu_percent', 0))
                point_gateway.field("cpu_temp_c", gateway.get('cpu_temp_c', 0))
                point_gateway.field("memory_percent", gateway.get('memory_percent', 0))
                point_gateway.field("disk_percent", gateway.get('disk_percent', 0))
                point_gateway.field("wifi_rssi_dbm", gateway.get('wifi_rssi_dbm', 0))
                point_gateway.field("uptime_seconds", gateway.get('uptime_seconds', 0))
                point_gateway.field("throttle_status", gateway.get('throttle_status', 0))
                write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point_gateway)
                logger.info("Gateway data written to InfluxDB")

    except ApiException as e:
        logger.error(f"InfluxDB API error: {e}")
    except Exception as e:
        logger.error(f"Error writing to InfluxDB: {e}")


def main():
    logger.info("=" * 60)
    logger.info("InfluxDB Data Logger - Digital Twin")
    logger.info("=" * 60)
    logger.info(f"URL: {INFLUX_URL}")
    logger.info(f"Bucket: {INFLUX_BUCKET}")
    logger.info(f"Org: {INFLUX_ORG}")
    logger.info(f"Local API: {LOCAL_API_URL}")
    logger.info("=" * 60)

    client = None
    if INFLUX_TOKEN:
        try:
            if not INFLUX_TOKEN:
                logger.warning('INFLUX_TOKEN not set; InfluxDB writes will be disabled')
                client = None
            else:
                client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
        except Exception as e:
            logger.error(f"Failed to create InfluxDB client: {e}")
            client = None
    else:
        logger.warning("INFLUX_TOKEN not set; InfluxDB writes disabled")

    try:
        while True:
            try:
                response = requests.get(f"{LOCAL_API_URL}/api/latest", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        write_to_influx(client, data.get('data', {}))
                else:
                    logger.warning(f"API error: {response.status_code}")
            except Exception as e:
                logger.error(f"Error fetching data: {e}")

            time.sleep(POLLING_INTERVAL)

    except KeyboardInterrupt:
        logger.info("Stopped")
    finally:
        if client:
            client.close()


if __name__ == '__main__':
    main()
