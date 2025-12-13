# 🎥 USB Webcam Streaming untuk Dashboard

Sistem streaming USB webcam sederhana menggunakan Flask untuk ditampilkan di Dashboard Digital Twin.

## 📋 Requirements

### Hardware:
- Raspberry Pi 3/4/5
- USB Webcam (compatible dengan V4L2)
- Koneksi internet/jaringan lokal

### Software:
- Raspberry Pi OS (Bullseye or later)
- Python 3.7+
- Flask
- OpenCV

## 🚀 Quick Start

### 1. Koneksi ke Raspberry Pi

```bash
ssh digitaltwin@digitaltwin
# Password: raihanalfarizi
```

### 2. Copy File ke Raspberry Pi

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
# Update sistem
sudo apt update

# Install Python dependencies
pip3 install -r requirements.txt

# Atau install manual:
pip3 install flask opencv-python numpy
```

### 4. Cek Webcam Terhubung

```bash
# Cek device video yang tersedia
ls /dev/video*

# Test webcam dengan v4l2
v4l2-ctl --list-devices
```

### 5. Jalankan Webcam Stream

```bash
python3 webcam_stream.py
```

Server akan berjalan di port 5000.

## 📡 Endpoints

### Video Stream
```
http://[RASPBERRY_PI_IP]:5000/video_feed
```
Format: MJPEG stream untuk ditampilkan langsung di `<img>` tag

### Status Check
```
http://[RASPBERRY_PI_IP]:5000/status
```
Response: JSON dengan status webcam

### Preview Page
```
http://[RASPBERRY_PI_IP]:5000/
```
Halaman HTML dengan preview streaming

## 🔧 Integrasi dengan Dashboard

### Cara 1: Image Tag (Recommended)
```html
<img src="http://[RASPBERRY_PI_IP]:5000/video_feed" 
     alt="Webcam Stream"
     style="width: 100%; max-width: 640px;" />
```

### Cara 2: Vue Component (CameraStream.vue)
```vue
<template>
  <div class="camera-stream">
    <img :src="streamUrl" alt="Live Camera Feed" />
  </div>
</template>

<script setup>
const streamUrl = 'http://[RASPBERRY_PI_IP]:5000/video_feed'
</script>
```

### Cara 3: Fetch API untuk Status
```javascript
fetch('http://[RASPBERRY_PI_IP]:5000/status')
  .then(response => response.json())
  .then(data => {
    console.log('Camera status:', data.status)
  })
```

## ⚙️ Konfigurasi

Edit file `webcam_stream.py` untuk mengubah:

```python
WEBCAM_PORT = 0       # Port USB webcam (0, 1, 2, dst)
STREAM_PORT = 5000    # Port Flask server
STREAM_FPS = 15       # Frame per second
FRAME_WIDTH = 640     # Lebar frame
FRAME_HEIGHT = 480    # Tinggi frame
```

## 🐛 Troubleshooting

### Webcam tidak terdeteksi
```bash
# Cek permission
sudo usermod -a -G video $USER

# Cek webcam
lsusb | grep -i camera

# Test dengan fswebcam
sudo apt install fswebcam
fswebcam test.jpg
```

### Error: "Cannot open camera"
```bash
# Pastikan tidak ada proses lain yang menggunakan webcam
sudo fuser /dev/video0

# Kill proses jika ada
sudo fuser -k /dev/video0
```

### Low FPS / Lag
- Turunkan resolusi: `FRAME_WIDTH = 320`, `FRAME_HEIGHT = 240`
- Turunkan FPS: `STREAM_FPS = 10`
- Pastikan bandwidth jaringan cukup

## 🚀 Jalankan sebagai Service (Optional)

Buat systemd service untuk auto-start:

```bash
sudo nano /etc/systemd/system/webcam-stream.service
```

Isi dengan:
```ini
[Unit]
Description=USB Webcam Stream Service
After=network.target

[Service]
Type=simple
User=digitaltwin
WorkingDirectory=/home/digitaltwin
ExecStart=/usr/bin/python3 /home/digitaltwin/webcam_stream.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable dan start:
```bash
sudo systemctl enable webcam-stream.service
sudo systemctl start webcam-stream.service
sudo systemctl status webcam-stream.service
```

## 📊 Monitoring

Cek log:
```bash
# Log real-time
journalctl -u webcam-stream.service -f

# Log terakhir
journalctl -u webcam-stream.service -n 50
```

## 🔐 Security Notes

⚠️ **Penting:**
- Server berjalan di `0.0.0.0` (semua interface) untuk akses dari dashboard
- Untuk production, tambahkan autentikasi
- Gunakan HTTPS jika di internet publik
- Batasi akses dengan firewall jika diperlukan

## 📝 Next Steps

Setelah webcam streaming berjalan:
1. ✅ Test streaming di browser: `http://[RASPBERRY_PI_IP]:5000/`
2. ✅ Integrasikan ke dashboard Vue.js (file `view_virtual/src/components/CameraStream.vue`)
3. ⏭️ Tambahkan people counting (optional - nanti)
4. ⏭️ Tambahkan motion detection (optional - nanti)

## 💡 Tips

- Gunakan webcam dengan resolusi native 640x480 atau 1280x720
- Untuk multiple webcam, jalankan di port berbeda (5000, 5001, dst)
- Test bandwidth dengan: `speedtest-cli`
- Monitor CPU usage: `htop`
