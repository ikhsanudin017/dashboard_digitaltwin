# 🎥 Raspberry Pi People Counter Integration

Sistem deteksi dan hitung jumlah orang menggunakan Raspberry Pi dengan kamera.

## 📋 Requirements

### Hardware:
- Raspberry Pi 3/4/5
- Raspberry Pi Camera Module atau USB Webcam
- Memory minimal 2GB RAM (recommended 4GB)

### Software:
- Raspberry Pi OS (Bullseye or later)
- Python 3.7+
- OpenCV
- YOLO v3 model

## 🔧 Installation

### 1. Connect to Raspberry Pi via SSH

```bash
ssh digitaltwin@digitaltwin
# Password: raihanalfarizi
```

### 2. Copy Files to Raspberry Pi

From your Mac, copy the Python script:

```bash
# Copy people_counter.py
scp raspberry-pi/people_counter.py digitaltwin@digitaltwin:~/

# Copy setup script
scp raspberry-pi/setup_raspberry.sh digitaltwin@digitaltwin:~/
```

### 3. Run Setup on Raspberry Pi

```bash
ssh digitaltwin@digitaltwin

# Make setup script executable
chmod +x setup_raspberry.sh

# Run setup (this will take 10-15 minutes)
bash setup_raspberry.sh
```

This will:
- Update system packages
- Install Python dependencies (opencv-python, paho-mqtt)
- Download YOLO model files (~200MB)

### 4. Configure MQTT Credentials

Edit `people_counter.py` and update:

```python
MQTT_USERNAME = "your-hivemq-username"  # Same as ESP32
MQTT_PASSWORD = "your-hivemq-password"  # Same as ESP32
```

### 5. Enable Camera

If using Raspberry Pi Camera Module:

```bash
sudo raspi-config
# Go to: Interface Options → Camera → Enable
# Reboot: sudo reboot
```

If using USB webcam, it should work automatically.

## 🚀 Running

### Test Run (with display):

```bash
python3 people_counter.py
```

Press `q` to quit.

### Background Run (headless):

```bash
# Run in background
nohup python3 people_counter.py > people_counter.log 2>&1 &

# Check if running
ps aux | grep people_counter

# View logs
tail -f people_counter.log

# Stop
pkill -f people_counter.py
```

### Auto-start on Boot:

Create systemd service:

```bash
sudo nano /etc/systemd/system/people-counter.service
```

Add:

```ini
[Unit]
Description=People Counter for Digital Twin
After=network.target

[Service]
Type=simple
User=digitaltwin
WorkingDirectory=/home/digitaltwin
ExecStart=/usr/bin/python3 /home/digitaltwin/people_counter.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable people-counter
sudo systemctl start people-counter
sudo systemctl status people-counter
```

## 📊 Data Flow

```
Raspberry Pi Camera
    ↓
YOLO Object Detection (detect people)
    ↓
Count People
    ↓
MQTT Publish (every 5 seconds)
    ↓
HiveMQ Cloud
    ↓
Bridge Script (bridge.js)
    ├─→ Azure Storage Table
    ├─→ Azure Function
    └─→ Digital Twins
         ↓
    Dashboard
```

## 📡 MQTT Topic

```
Topic: sensor/camera/people

Payload:
{
  "deviceId": "RASPBERRY_PI_CAMERA_001",
  "jumlahOrang": 3,
  "timestamp": "2025-11-19T08:30:15.123Z",
  "location": "Ruang Server"
}
```

## 🔍 Testing

### Test MQTT Connection:

```bash
# Install mosquitto client
sudo apt-get install -y mosquitto-clients

# Subscribe to topic
mosquitto_sub -h 02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud \
  -p 8883 \
  -t "sensor/camera/people" \
  -u "your-username" \
  -P "your-password" \
  --capath /etc/ssl/certs/
```

### Test Camera:

```python
import cv2

cap = cv2.VideoCapture(0)
ret, frame = cap.read()

if ret:
    cv2.imwrite('test.jpg', frame)
    print("✅ Camera working!")
else:
    print("❌ Camera not working")

cap.release()
```

## ⚙️ Configuration

Edit `people_counter.py` to customize:

```python
# Detection sensitivity
CONFIDENCE_THRESHOLD = 0.5  # Lower = more sensitive
NMS_THRESHOLD = 0.4

# Publishing frequency
PUBLISH_INTERVAL = 5  # seconds

# Camera resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
```

## 🐛 Troubleshooting

### Camera not detected:

```bash
# Check camera
vcgencmd get_camera  # For Pi Camera
ls /dev/video*       # For USB webcam

# If using Pi Camera, enable in raspi-config
sudo raspi-config
```

### Low FPS / Slow detection:

- Use lower camera resolution (320x240)
- Use YOLOv3-tiny instead of YOLOv3 (faster but less accurate)
- Reduce detection frequency

### MQTT connection fails:

- Check credentials
- Verify HiveMQ broker address
- Test with mosquitto_sub first

### Out of memory:

- Increase swap size
- Use YOLOv3-tiny
- Reduce camera resolution

## 📈 Performance

**YOLOv3 on Raspberry Pi 4 (4GB):**
- Resolution: 640x480
- FPS: ~2-3 fps
- CPU Usage: 80-90%

**YOLOv3-tiny (faster alternative):**
- FPS: ~5-8 fps
- Less accurate but real-time

## 🔄 Alternative: YOLOv3-tiny (Faster)

For better performance, use YOLOv3-tiny:

```bash
cd ~/yolo

# Download tiny model
wget https://pjreddie.com/media/files/yolov3-tiny.weights
wget https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3-tiny.cfg
```

Update in `people_counter.py`:

```python
YOLO_CONFIG = "/home/digitaltwin/yolo/yolov3-tiny.cfg"
YOLO_WEIGHTS = "/home/digitaltwin/yolo/yolov3-tiny.weights"
```

## 📝 Next Steps

After Raspberry Pi is running:

1. **Update Bridge Script** - Add handling for camera data
2. **Update Digital Twin Model** - Add PeopleCounterSensor
3. **Update Dashboard** - Show people count in real-time

See: `INTEGRATION.md` for bridge and Digital Twins integration steps.
