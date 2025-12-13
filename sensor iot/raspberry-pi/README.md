# 🎥 Raspberry Pi USB Webcam Streaming

Sistem streaming USB webcam sederhana untuk Dashboard Digital Twin.

## 📋 Requirements

### Hardware:
- Raspberry Pi 3/4/5
- USB Webcam (V4L2 compatible)
- Memory minimal 2GB RAM

### Software:
- Raspberry Pi OS (Bullseye or later)
- Python 3.7+
- Flask
- OpenCV

## 🚀 Quick Setup

### 1. Connect to Raspberry Pi via SSH

```bash
ssh digitaltwin@digitaltwin
# Password: raihanalfarizi
```

### 2. Copy Files to Raspberry Pi

Dari Mac Anda:

```bash
# Copy file utama
scp "sensor iot/raspberry-pi/webcam_stream.py" digitaltwin@digitaltwin:~/

# Copy requirements
scp "sensor iot/raspberry-pi/requirements.txt" digitaltwin@digitaltwin:~/
```

### 3. Install Dependencies

Di Raspberry Pi:

```bash
# Install Python packages
pip3 install -r requirements.txt
```

This will:
- Update system packages
- Install Python dependencies (opencv-python, paho-mqtt)
### 4. Test Webcam

```bash
# Cek device video tersedia
ls /dev/video*

# Test dengan v4l2
v4l2-ctl --list-devices
```

## 🚀 Running

### Jalankan Webcam Stream:

```bash
python3 webcam_stream.py
```

Server akan berjalan di `http://[RASPBERRY_PI_IP]:5000`

### Test di Browser:

```
# Halaman preview
http://[RASPBERRY_PI_IP]:5000/

# Video stream endpoint  
http://[RASPBERRY_PI_IP]:5000/video_feed

# Status check
http://[RASPBERRY_PI_IP]:5000/status
```

### Background Run:

```bash
# Run in background
nohup python3 webcam_stream.py > webcam.log 2>&1 &

# Check logs
tail -f webcam.log
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
  "devStreaming Flow

```
USB Webcam (Raspberry Pi)
    ↓
OpenCV Capture
    ↓
Flask HTTP Server
    ↓
MJPEG StrWebcam:

```bash
# Install fswebcam untuk test
sudo apt install fswebcam

# Capture test image
fswebcam test.jpg

# List available cameras
ls -l /dev/video*
```

### Test dengan Python:

```python
import cv2

# Test buka webcam
cap = cv2.VideoCapture(0)
ret, frame = cap.read()

if ret:
    cv2.imwrite('test.jpg', frame)
    print("✅ Webcam working!")
else:
    print("❌ Webcam not working")

cap.release()
```

### Test Stream dari Browser:
Konfigurasi

Edit `webcam_stream.py` untuk customize:

```python
WEBCAM_PORT = 0       # Port USB webcam (0, 1, 2...)
STREAM_PORT = 5000    # Port Flask server
STREAM_FPS = 15       # Frame per second
FRAME_WIDTH = 640     # Lebar frame video
FRAME_HEIGHT = 480    # Tinggi frame video
# Publishing frequency
PUBLISH_INTERVAL = 5  # seconds

# Camera resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
```

## 🐛 Troubleshooting

### Webcam tidak terdeteksi:

```bash
# Cek permission
sudo usermod -a -G video $USER

# Cek USB webcam
lsusb | grep -i camera

# Test capture
fswebcam test.jpg
```

### Error: "Cannot open camera"

```bash
# Cek proses yang menggunakan webcam
sudo fuser /dev/video0

# Kill proses jika ada
sudo fuser -k /dev/video0
```

### Low FPS / Lag:

- Turunkan resolusi: `FRAME_WIDTH = 320`, `FRAME_HEIGHT = 240`
- Turunkan FPS: `STREAM_FPS = 10`
- Pastikan bandwidth jaringan cukup
- Cek CPU usage: `htop`

### Flask server tidak bisa diakses:

```bash
# Cek firewall
sudo ufw status

# Allow port 5000
sudo ufw allow 5000

# Cek service berjalan
ps aux | grep webcam_stream
```

## 🔗 Integrasi dengan Dashboard

Update file `view_virtual/src/components/CameraStream.vue`:

```vue
<template>
  <div class="camera-container">
    <h3>📹 Live Camera Feed</h3>
    <img 
      :src="streamUrl" 
      alt="Webcam Stream"
      @error="onStreamError"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Ganti dengan IP Raspberry Pi Anda
const streamUrl = ref('http://192.168.1.100:5000/video_feed')

const onStreamError = () => {
  console.error('Stream error - cek Raspberry Pi')
}
</script>
```

## 📝 Next Steps

1. ✅ Setup Raspberry Pi dengan webcam
2. ✅ Test streaming di browser
3. 🔲 Integrasikan ke Dashboard Vue.js
4. 🔲 (Optional) Tambahkan people counting nanti
5. 🔲 (Optional) Tambahkan motion detection

**Lihat:** `WEBCAM_SETUP.md` untuk panduan detail integrasi.
