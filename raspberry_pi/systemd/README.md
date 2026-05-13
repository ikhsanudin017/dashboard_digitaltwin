# Systemd Services - Digital Twin Edge Gateway

## Services

### 1. local_api.service
HTTP API server untuk collect data dari ESP32 dan menyediakan endpoint untuk dashboard.

- Port: 5001
- Auto-start: Ya
- Dependencies: network.target

### 2. iot_hub_forwarder.service
Forwarder untuk kirim data ke Azure IoT Hub via REST API.

- Auto-start: Ya
- Dependencies: network.target, local_api.service
- Interval: 30 detik

---

## Installation

### 1. Copy service files ke RPi
```bash
scp -r systemd/ digitaltwin@192.168.1.14:/mnt/storage/
```

### 2. Copy script files ke RPi
```bash
scp local_api.py digitaltwin@192.168.1.14:/mnt/storage/
scp iot_hub_forwarder.py digitaltwin@192.168.1.14:/mnt/storage/
```

### 3. SSH ke RPi dan install services
```bash
ssh digitaltwin@192.168.1.14

# Stop running scripts (jika ada)
pkill -f local_api.py
pkill -f iot_hub_forwarder.py

# Copy services to systemd directory
sudo cp /mnt/storage/systemd/*.service /etc/systemd/system/

# Set permissions
sudo chmod 644 /etc/systemd/system/local_api.service
sudo chmod 644 /etc/systemd/system/iot_hub_forwarder.service

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable local_api.service
sudo systemctl enable iot_hub_forwarder.service

# Start services
sudo systemctl start local_api.service
sudo systemctl start iot_hub_forwarder.service

# Check status
sudo systemctl status local_api.service
sudo systemctl status iot_hub_forwarder.service
```

---

## Commands

```bash
# Start service
sudo systemctl start local_api.service
sudo systemctl start iot_hub_forwarder.service

# Stop service
sudo systemctl stop local_api.service
sudo systemctl stop iot_hub_forwarder.service

# Restart service
sudo systemctl restart local_api.service
sudo systemctl restart iot_hub_forwarder.service

# Check status
sudo systemctl status local_api.service
sudo systemctl status iot_hub_forwarder.service

# View logs
journalctl -u local_api.service -f
journalctl -u iot_hub_forwarder.service -f

# Or view log files
cat /mnt/storage/local_api.log
cat /mnt/storage/iot_hub_forwarder.log
```

---

## Log Locations

- `/mnt/storage/local_api.log` - Local API server logs
- `/mnt/storage/iot_hub_forwarder.log` - IoT Hub forwarder logs
- `/mnt/storage/azure_forwarder.log` - Azure forwarder logs (deprecated)

---

## Troubleshooting

### Service tidak start
```bash
# Check logs
sudo journalctl -u local_api.service -n 50

# Check if port 5001 is already in use
sudo lsof -i :5001
```

### Script error
```bash
# Test script manually
cd /mnt/storage
source venv_new/bin/activate
python3 local_api.py
```
