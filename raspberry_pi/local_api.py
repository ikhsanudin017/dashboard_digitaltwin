#!/usr/bin/env python3
"""
RPi Local API Server - Digital Twin Edge Gateway
HTTP API untuk collect data dari ESP32 + Camera + RPi Health

Usage:
    python3 local_api.py

API Endpoints:
    POST /api/collect     - ESP32 kirim data via HTTP
    GET  /api/latest      - Semua data terbaru (dashboard polling)
    GET  /api/esp32       - Data ESP32 only
    GET  /api/camera      - People count only
    GET  /api/health      - RPi health only
    GET  /api/status      - Server status
"""

import sys
import os
sys.path.insert(0, '/mnt/storage/venv/lib/python3.11/site-packages')

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import time
import logging
import subprocess
from datetime import datetime
from threading import Thread, Lock

# API Key for admin endpoints (set via environment variable)
ADMIN_API_KEY = os.environ.get('ADMIN_API_KEY', 'digital-twin-admin-key')

# List of managed services
MANAGED_SERVICES = [
    {'name': 'yolo_cam', 'displayName': 'YOLO Camera', 'port': 5000},
    {'name': 'local-api', 'displayName': 'Local API', 'port': 5001},
    {'name': 'influxdb', 'displayName': 'InfluxDB', 'port': 8086},
    {'name': 'influxdb-logger', 'displayName': 'InfluxDB Logger', 'port': None},
    {'name': 'ml-pipeline', 'displayName': 'ML Pipeline', 'port': None},
    {'name': 'grafana-server', 'displayName': 'Grafana', 'port': 3000}
]

# RPi health monitor
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("WARNING: psutil not installed, health monitoring limited")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ============================================================
# DATA STORAGE (in-memory, latest values only)
# ============================================================

class DataStore:
    """In-memory data store untuk latest values"""

    def __init__(self):
        self.lock = Lock()

        # ESP32 data
        self.esp32 = {
            "received": None,
            "suhu": None,
            "kelembaban": None,
            "tegangan": None,
            "arus": None,
            "daya": None,
            "tinyml": {
                "anomaly": None,
                "confidence": None,
                "inference_us": None,
                "power_mode": None
            },
            "ac": {
                "power": None,
                "mode": None,
                "setpoint": None,
                "closed_loop": None
            },
            "health": {
                "esp32_temp_c": None,
                "free_heap_bytes": None,
                "wifi_rssi_dbm": None
            }
        }

        # Camera data (from yolo_cam_dashboard.py)
        self.camera = {
            "people_count": 0,
            "fps": 0,
            "last_update": None
        }

        # Gateway health data
        self.gateway = {
            "cpu_temp_c": 0,
            "cpu_percent": 0,
            "memory_percent": 0,
            "disk_percent": 0,
            "wifi_rssi_dbm": 0,
            "throttle_status": 0,
            "uptime_seconds": 0
        }

        # Server stats
        self.start_time = time.time()
        self.total_received = 0
        self.total_requests = 0

    def update_esp32(self, data):
        """Update ESP32 data"""
        with self.lock:
            self.esp32["received"] = datetime.utcnow().isoformat() + "Z"
            self.esp32["suhu"] = data.get("suhu")
            self.esp32["kelembaban"] = data.get("kelembaban")
            self.esp32["tegangan"] = data.get("tegangan")
            self.esp32["arus"] = data.get("arus")
            self.esp32["daya"] = data.get("daya")

            # TinyML
            tinyml = data.get("tinyml", {})
            self.esp32["tinyml"]["anomaly"] = tinyml.get("anomaly")
            self.esp32["tinyml"]["confidence"] = tinyml.get("confidence")
            self.esp32["tinyml"]["inference_us"] = tinyml.get("inference_us")
            self.esp32["tinyml"]["power_mode"] = tinyml.get("power_mode")

            # AC status
            ac = data.get("ac", {})
            self.esp32["ac"]["power"] = ac.get("power")
            self.esp32["ac"]["mode"] = ac.get("mode")
            self.esp32["ac"]["setpoint"] = ac.get("setpoint")
            self.esp32["ac"]["closed_loop"] = ac.get("closed_loop")

            # ESP32 health
            health = data.get("health", {})
            self.esp32["health"]["esp32_temp_c"] = health.get("esp32_temp_c")
            self.esp32["health"]["free_heap_bytes"] = health.get("free_heap_bytes")
            self.esp32["health"]["wifi_rssi_dbm"] = health.get("wifi_rssi_dbm")

            self.total_received += 1

    def update_camera(self, people_count, fps):
        """Update camera data"""
        with self.lock:
            self.camera["people_count"] = people_count
            self.camera["fps"] = fps
            self.camera["last_update"] = datetime.utcnow().isoformat() + "Z"

    def update_gateway_health(self, health_data):
        """Update gateway health"""
        with self.lock:
            self.gateway.update(health_data)
            self.gateway["uptime_seconds"] = int(time.time() - self.start_time)

    def get_all(self):
        """Get semua data terbaru"""
        with self.lock:
            return {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "esp32": dict(self.esp32),
                "camera": dict(self.camera),
                "gateway": dict(self.gateway),
                "stats": {
                    "uptime_seconds": int(time.time() - self.start_time),
                    "total_received": self.total_received,
                    "total_requests": self.total_requests
                }
            }

    def get_esp32(self):
        """Get ESP32 data only"""
        with self.lock:
            return dict(self.esp32)

    def get_camera(self):
        """Get camera data only"""
        with self.lock:
            return dict(self.camera)

    def get_gateway(self):
        """Get gateway health only"""
        with self.lock:
            return dict(self.gateway)

    def increment_request(self):
        """Increment request counter"""
        with self.lock:
            self.total_requests += 1


# Global data store
data_store = DataStore()


# ============================================================
# HEALTH MONITORING
# ============================================================

def get_rpi_health():
    """Get RPi health metrics"""
    health = {
        "cpu_temp_c": 0,
        "cpu_percent": 0,
        "memory_percent": 0,
        "disk_percent": 0,
        "wifi_rssi_dbm": 0,
        "throttle_status": 0
    }

    if HAS_PSUTIL:
        # CPU percent
        health["cpu_percent"] = psutil.cpu_percent(interval=0.1)

        # Memory
        mem = psutil.virtual_memory()
        health["memory_percent"] = mem.percent

        # Disk
        disk = psutil.disk_usage('/')
        health["disk_percent"] = disk.percent

    # CPU temperature via vcgencmd
    try:
        import subprocess
        result = subprocess.check_output(
            ['vcgencmd', 'measure_temp'],
            text=True,
            stderr=subprocess.DEVNULL
        )
        temp_str = result.replace('temp=', '').replace("'C", '').strip()
        health["cpu_temp_c"] = float(temp_str)
    except Exception as e:
        logger.debug(f"Could not get CPU temp: {e}")

    # Throttle status
    try:
        import subprocess
        result = subprocess.check_output(
            ['vcgencmd', 'get_throttled'],
            text=True,
            stderr=subprocess.DEVNULL
        )
        hex_val = result.split('=')[1].strip()
        health["throttle_status"] = int(hex_val, 16)
    except Exception as e:
        logger.debug(f"Could not get throttle status: {e}")

    # WiFi RSSI - try multiple methods
    health["wifi_rssi_dbm"] = get_wifi_rssi()

    return health


def get_wifi_rssi():
    """Get WiFi RSSI using multiple fallback methods"""
    import re

    # Method 1: Use iw dev
    try:
        import subprocess
        result = subprocess.check_output(
            ['iw', 'dev'],
            text=True,
            stderr=subprocess.DEVNULL
        )
        # Find wireless interface
        interfaces = re.findall(r'Interface\s+(\w+)', result)
        for iface in interfaces:
            try:
                signal = subprocess.check_output(
                    ['iw', 'dev', iface, 'link'],
                    text=True,
                    stderr=subprocess.DEVNULL
                )
                match = re.search(r'signal:\s*(-?\d+)', signal)
                if match:
                    return int(match.group(1))
            except:
                continue
    except Exception as e:
        logger.debug(f"iw dev method failed: {e}")

    # Method 2: Use /proc/net/wireless
    try:
        with open('/proc/net/wireless', 'r') as f:
            content = f.read()
        match = re.search(r'(\w+):\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(-?\d+)', content)
        if match:
            return int(match.group(2))
    except Exception as e:
        logger.debug(f"/proc/net/wireless method failed: {e}")

    # Method 3: Use iwconfig if available
    try:
        import subprocess
        for iface in ['wlan0', 'wlan1', 'wlp']:
            try:
                result = subprocess.check_output(
                    ['iwconfig', iface],
                    text=True,
                    stderr=subprocess.DEVNULL
                )
                match = re.search(r'Signal level[=-](\d+)', result)
                if match:
                    return -int(match.group(1))
            except:
                continue
    except Exception as e:
        logger.debug(f"iwconfig method failed: {e}")

    # Method 4: Use nmcli if available
    try:
        import subprocess
        result = subprocess.check_output(
            ['nmcli', '-t', '-f', 'DEVICE,SIGNAL', 'dev', 'wifi'],
            text=True,
            stderr=subprocess.DEVNULL
        )
        for line in result.strip().split('\n'):
            parts = line.split(':')
            if len(parts) >= 2:
                signal = int(parts[1])
                if signal > 0:
                    # Convert 0-100 to dBm (approximate)
                    return -100 + (signal * 70 // 100)
    except Exception as e:
        logger.debug(f"nmcli method failed: {e}")

    logger.debug("Could not get WiFi RSSI with any method")
    return 0


# ============================================================
# THREAD: Update gateway health periodically
# ============================================================

def health_monitor_thread():
    """Background thread untuk update RPi health"""
    while True:
        try:
            health = get_rpi_health()
            data_store.update_gateway_health(health)
        except Exception as e:
            logger.error(f"Health monitor error: {e}")
        time.sleep(10)  # Update every 10 seconds


# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/api/collect', methods=['POST', 'OPTIONS'])
def api_collect():
    """
    POST /api/collect
    ESP32 kirim data via HTTP POST
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()

        if not data:
            logger.warning("No data in request body")
            return jsonify({"error": "No data in request body"}), 400

        device_id = data.get("deviceId", "unknown")
        logger.info(f"Received data from {device_id}")

        # Update data store
        data_store.update_esp32(data)

        return jsonify({
            "success": True,
            "message": "Data collected",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }), 200

    except Exception as e:
        logger.error(f"Error collecting data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/latest', methods=['GET', 'OPTIONS'])
def api_latest():
    """
    GET /api/latest
    Semua data terbaru (untuk dashboard polling)
    """
    data_store.increment_request()

    try:
        data = data_store.get_all()
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        logger.error(f"Error getting latest data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/esp32', methods=['GET', 'OPTIONS'])
def api_esp32():
    """
    GET /api/esp32
    Data ESP32 only
    """
    data_store.increment_request()

    try:
        data = data_store.get_esp32()
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        logger.error(f"Error getting ESP32 data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/camera', methods=['GET', 'OPTIONS'])
def api_camera():
    """
    GET /api/camera
    People count only
    """
    data_store.increment_request()

    try:
        # Try to get camera data from yolo_cam_dashboard.py
        # If running on same Pi, we can import its shared data
        camera_data = data_store.get_camera()

        # If no data received yet, try to fetch from camera service
        if camera_data["people_count"] == 0 and camera_data["last_update"] is None:
            try:
                import requests as req
                resp = req.get('http://localhost:5000/count', timeout=2)
                if resp.status_code == 200:
                    camera_data = resp.json()
            except Exception:
                pass  # Camera service not running or not accessible

        return jsonify({
            "success": True,
            "data": camera_data
        }), 200
    except Exception as e:
        logger.error(f"Error getting camera data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET', 'OPTIONS'])
def api_health():
    """
    GET /api/health
    RPi health only
    """
    data_store.increment_request()

    try:
        health = get_rpi_health()
        health["uptime_seconds"] = int(time.time() - data_store.start_time)
        return jsonify({
            "success": True,
            "data": health
        }), 200
    except Exception as e:
        logger.error(f"Error getting health: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/status', methods=['GET', 'OPTIONS'])
def api_status():
    """
    GET /api/status
    Server status untuk debug
    """
    data_store.increment_request()

    try:
        return jsonify({
            "success": True,
            "status": "running",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uptime_seconds": int(time.time() - data_store.start_time),
            "stats": {
                "total_received": data_store.total_received,
                "total_requests": data_store.total_requests
            },
            "python_version": sys.version,
            "has_psutil": HAS_PSUTIL
        }), 200
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/camera/update', methods=['POST', 'OPTIONS'])
def api_camera_update():
    """
    POST /api/camera/update
    Camera service kirim update people count
    """
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()
        people_count = data.get("people_count", 0)
        fps = data.get("fps", 0)

        data_store.update_camera(people_count, fps)

        return jsonify({
            "success": True,
            "message": "Camera data updated"
        }), 200
    except Exception as e:
        logger.error(f"Error updating camera data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_root():
    """Health check endpoint"""
    return 'OK', 200


# ============================================================
# ADMIN ENDPOINTS (Service & System Control)
# ============================================================

def verify_api_key():
    """Verify API key from request header"""
    provided_key = request.headers.get('X-API-Key')
    if not provided_key:
        return False, jsonify({"error": "API key required", "code": "AUTH_REQUIRED"}), 401
    if provided_key != ADMIN_API_KEY:
        return False, jsonify({"error": "Invalid API key", "code": "AUTH_INVALID"}), 403
    return True, None, None


def get_service_status(service_name):
    """Get systemd service status"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', service_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        status = result.stdout.strip()
        return status  # 'active', 'inactive', 'failed', 'activating'
    except Exception as e:
        logger.error(f"Failed to get service status for {service_name}: {e}")
        return 'unknown'


def get_service_info(service_name):
    """Get detailed service info including port status"""
    status = get_service_status(service_name)
    port = next((s['port'] for s in MANAGED_SERVICES if s['name'] == service_name), None)

    return {
        'name': service_name,
        'displayName': next((s['displayName'] for s in MANAGED_SERVICES if s['name'] == service_name), service_name),
        'status': status,
        'port': port
    }


@app.route('/api/admin/services', methods=['GET', 'OPTIONS'])
def api_admin_services():
    """
    GET /api/admin/services
    Get status of all managed services
    """
    if request.method == 'OPTIONS':
        return '', 200

    # Verify API key
    valid, error_response, status_code = verify_api_key()
    if not valid:
        return error_response, status_code

    try:
        services_status = []
        for svc in MANAGED_SERVICES:
            service_info = get_service_info(svc['name'])
            services_status.append(service_info)

        return jsonify({
            "success": True,
            "data": {
                "services": services_status,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }), 200
    except Exception as e:
        logger.error(f"Error getting services status: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/service-control', methods=['POST', 'OPTIONS'])
def api_admin_service_control():
    """
    POST /api/admin/service-control
    Control a systemd service
    Body: {"service": "service_name", "action": "start|stop|restart"}
    """
    if request.method == 'OPTIONS':
        return '', 200

    # Verify API key
    valid, error_response, status_code = verify_api_key()
    if not valid:
        return error_response, status_code

    try:
        data = request.get_json()
        service_name = data.get('service')
        action = data.get('action')

        if not service_name or not action:
            return jsonify({"error": "service and action are required", "code": "INVALID_PARAMS"}), 400

        # Validate action
        valid_actions = ['start', 'stop', 'restart', 'status']
        if action not in valid_actions:
            return jsonify({"error": f"Invalid action. Must be one of: {valid_actions}", "code": "INVALID_ACTION"}), 400

        # Check if service exists
        known_service = any(s['name'] == service_name for s in MANAGED_SERVICES)
        if not known_service:
            logger.warning(f"Unknown service requested: {service_name}")

        # Execute systemctl command
        logger.info(f"Executing: systemctl {action} {service_name}")
        result = subprocess.run(
            ['systemctl', action, service_name],
            capture_output=True,
            text=True,
            timeout=30
        )

        # Get new status
        new_status = get_service_status(service_name)

        return jsonify({
            "success": True,
            "data": {
                "service": service_name,
                "action": action,
                "status": new_status,
                "stdout": result.stdout,
                "stderr": result.stderr if result.returncode != 0 else None,
                "returncode": result.returncode
            }
        }), 200

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command timeout", "code": "TIMEOUT"}), 504
    except Exception as e:
        logger.error(f"Error controlling service: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/system', methods=['GET', 'POST', 'OPTIONS'])
def api_admin_system():
    """
    GET /api/admin/system - Get RPi system info
    POST /api/admin/system - Reboot or shutdown RPi
    Body: {"action": "reboot|shutdown"}
    """
    if request.method == 'OPTIONS':
        return '', 200

    # Verify API key
    valid, error_response, status_code = verify_api_key()
    if not valid:
        return error_response, status_code

    if request.method == 'GET':
        # Return system info
        try:
            # Get RPi health
            health = get_rpi_health()

            # Get system info
            hostname = subprocess.check_output(['hostname'], text=True).strip()
            kernel = subprocess.check_output(['uname', '-r'], text=True).strip()

            return jsonify({
                "success": True,
                "data": {
                    "hostname": hostname,
                    "kernel": kernel,
                    "health": health,
                    "uptime_seconds": int(time.time() - data_store.start_time),
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            }), 200
        except Exception as e:
            logger.error(f"Error getting system info: {e}")
            return jsonify({"error": str(e)}), 500

    else:  # POST
        try:
            data = request.get_json()
            action = data.get('action')

            if not action:
                return jsonify({"error": "action is required", "code": "INVALID_PARAMS"}), 400

            if action not in ['reboot', 'shutdown']:
                return jsonify({"error": "Invalid action. Must be 'reboot' or 'shutdown'", "code": "INVALID_ACTION"}), 400

            logger.warning(f"System {action} requested via API")

            # Execute command
            if action == 'reboot':
                subprocess.Popen(['sudo', 'reboot'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                message = "Reboot initiated. Connection will be lost."
            else:
                subprocess.Popen(['sudo', 'shutdown', '-h', 'now'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                message = "Shutdown initiated. System will power off."

            return jsonify({
                "success": True,
                "data": {
                    "action": action,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            }), 200

        except Exception as e:
            logger.error(f"Error executing system action: {e}")
            return jsonify({"error": str(e)}), 500


@app.route('/api/admin/esp32/health', methods=['GET'])
def api_admin_esp32_health():
    """
    GET /api/admin/esp32/health
    Get ESP32 health data from local store
    """
    # Verify API key
    valid, error_response, status_code = verify_api_key()
    if not valid:
        return error_response, status_code

    try:
        esp32_data = data_store.get_esp32()
        return jsonify({
            "success": True,
            "data": {
                "received": esp32_data.get("received"),
                "esp32_temp_c": esp32_data.get("health", {}).get("esp32_temp_c"),
                "free_heap_bytes": esp32_data.get("health", {}).get("free_heap_bytes"),
                "wifi_rssi_dbm": esp32_data.get("health", {}).get("wifi_rssi_dbm"),
                "uptime_seconds": esp32_data.get("health", {}).get("uptime_seconds")
            }
        }), 200
    except Exception as e:
        logger.error(f"Error getting ESP32 health: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/esp32/command', methods=['POST'])
def api_admin_esp32_command():
    """
    POST /api/admin/esp32/command
    Send command to ESP32 via serial (if connected)
    Body: {"command": "reboot|wifi_reconnect|sleep|wake", "params": {...}}
    """
    # Verify API key
    valid, error_response, status_code = verify_api_key()
    if not valid:
        return error_response, status_code

    try:
        data = request.get_json()
        command = data.get('command')

        if not command:
            return jsonify({"error": "command is required", "code": "INVALID_PARAMS"}), 400

        valid_commands = ['reboot', 'wifi_reconnect', 'sleep', 'wake', 'status']
        if command not in valid_commands:
            return jsonify({"error": f"Invalid command. Must be one of: {valid_commands}", "code": "INVALID_COMMAND"}), 400

        # Build command message
        if command == 'sleep':
            duration = data.get('params', {}).get('duration_ms', 60000)
            cmd_message = f"CMD:SLEEP:{duration}\n"
        else:
            cmd_message = f"CMD:{command.upper()}\n"

        logger.info(f"Sending command to ESP32: {command}")

        # Try to send via serial (if serial connection is available)
        # For now, just log the command - actual serial sending depends on local_api.py being connected to ESP32
        try:
            # This would require pyserial to be installed and ESP32 connected via USB/Serial
            import serial
            ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=1)
            ser.write(cmd_message.encode())
            response = ser.readline().decode().strip()
            ser.close()
            result = {"status": "sent", "response": response}
        except Exception as serial_err:
            # Serial not available - command will be sent via Azure IoT Hub instead
            logger.warning(f"Serial not available, command should be sent via IoT Hub: {serial_err}")
            result = {"status": "queued", "method": "iot_hub", "command": command, "message": "Serial not connected. Use Azure IoT Hub C2D for ESP32 control."}

        return jsonify({
            "success": True,
            "data": result
        }), 200

    except Exception as e:
        logger.error(f"Error sending ESP32 command: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================
# MAIN
# ============================================================

def main():
    """Main entry point"""
    port = int(os.environ.get('API_PORT', 5001))
    host = os.environ.get('API_HOST', '0.0.0.0')

    logger.info(f"=" * 60)
    logger.info("RPi Local API Server - Digital Twin Edge Gateway")
    logger.info(f"=" * 60)
    logger.info(f"Host: {host}")
    logger.info(f"Port: {port}")
    logger.info(f"Python: {sys.version.split()[0]}")
    logger.info(f"psutil: {'Installed' if HAS_PSUTIL else 'Not installed'}")
    logger.info(f"=" * 60)

    # Start health monitor thread
    health_thread = Thread(target=health_monitor_thread, daemon=True)
    health_thread.start()
    logger.info("Health monitor thread started")

    # Start Flask server
    logger.info(f"Starting server on http://{host}:{port}")
    logger.info("Endpoints:")
    logger.info("  POST /api/collect    - ESP32 kirim data")
    logger.info("  GET  /api/latest     - Dashboard polling")
    logger.info("  GET  /api/esp32      - ESP32 data only")
    logger.info("  GET  /api/camera     - Camera/people count")
    logger.info("  GET  /api/health     - RPi health")
    logger.info("  GET  /api/status     - Server status")
    logger.info("  GET  /api/admin/services     - All service status (API key required)")
    logger.info("  POST /api/admin/service-control - Start/stop/restart service (API key required)")
    logger.info("  GET  /api/admin/system        - System info (API key required)")
    logger.info("  POST /api/admin/system        - Reboot/shutdown RPi (API key required)")
    logger.info("  GET  /api/admin/esp32/health  - ESP32 health (API key required)")
    logger.info("  POST /api/admin/esp32/command - Send command to ESP32 (API key required)")
    logger.info(f"  Admin API Key: {'SET' if ADMIN_API_KEY != 'digital-twin-admin-key' else 'DEFAULT'}")
    logger.info(f"=" * 60)

    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == '__main__':
    main()
