# Raspberry Pi - People Counter Setup

## Files

```
raspberry_pi/
├── collector_simple.py    # Script utama (simple, recommended)
├── collector.py          # Script lengkap (dengan ESP32 serial)
├── collector_fswebcam.py  # Alternative: fswebcam-based capture
├── camera_stream_server.py # HTTP MJPEG streaming server (NEW!)
├── CAMERA_SETUP.md       # Panduan setup camera streaming
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Install di Raspberry Pi

```bash
# 1. Update Raspberry Pi
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
pip3 install opencv-python pyserial requests

# 3. Download script
# Copy collector_simple.py ke Raspberry

# 4. Run
python3 collector_simple.py
```

## Test Manual (di Raspberry)

```bash
# Test camera
python3 -c "
import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
print('Camera OK' if ret else 'Camera Gagal')
cap.release()
"
```

## Run on Boot (Optional)

```bash
# Buat systemd service
sudo nano /etc/systemd/system/collector.service

# Isi:
[Unit]
Description=Digital Twin Collector
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 /home/pi/collector_simple.py
Restart=on-failure

[Install]
WantedBy=multi-user.target

# Enable
sudo systemctl enable collector
sudo systemctl start collector
```

## Monitoring

```bash
# Check status
sudo systemctl status collector

# View logs
journalctl -u collector -f
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not found | Ganti CAMERA_INDEX = 1 |
| Serial port error | Cek `ls /dev/ttyUSB*` |
| API timeout | Cek koneksi internet |

## Dependencies

```txt
opencv-python>=4.8.0
pyserial>=3.5
requests>=2.31.0
```
