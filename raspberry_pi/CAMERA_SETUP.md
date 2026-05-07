# Camera Stream Setup Guide

## Problem
Dashboard menunjukkan "Camera Stream Unavailable" karena tidak ada streaming server yang berjalan.

## Solution
Gunakan `camera_stream_server.py` untuk membuat HTTP MJPEG streaming server di Raspberry Pi.

---

## Setup di Raspberry Pi

### 1. Install Dependencies

```bash
cd ~/dashboard_digitaltwin/raspberry_pi

# Install Python packages
pip3 install -r requirements.txt

# (Optional) Install YOLO untuk people detection
pip3 install ultralytics
```

### 2. Enable Camera (Jika pakai Pi Camera)

```bash
# Buka konfigurasi
sudo raspi-config

# Pilih: Interface Options -> Camera -> Enable
# Atau via command line
sudo raspi-config enable_camera
sudo reboot
```

### 3. Jalankan Server

```bash
# Mode standar (tanpa YOLO)
python3 camera_stream_server.py

# Atau dengan YOLO people detection
# Edit CAMERA_STREAM_URL di /view_virtual/.env:
# VITE_CAMERA_STREAM_URL=http://192.168.1.100:5000
```

### 4. Auto-start dengan systemd (Opsional)

```bash
# Buat service file
sudo nano /etc/systemd/system/camera-stream.service
```

Isi dengan:

```ini
[Unit]
Description=Raspberry Pi Camera Stream Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/dashboard_digitaltwin/raspberry_pi
ExecStart=/usr/bin/python3 /home/pi/dashboard_digitaltwin/raspberry_pi/camera_stream_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable camera-stream
sudo systemctl start camera-stream

# Cek status
sudo systemctl status camera-stream
```

---

## Konfigurasi Dashboard

Edit file `.env` di `view_virtual/`:

```bash
# Cari IP Raspberry Pi Anda
hostname -I

# Edit .env
nano view_virtual/.env
```

Tambahkan:

```env
VITE_CAMERA_STREAM_URL=http://192.168.1.100:5000
```

**Ganti `192.168.1.100`** dengan IP Raspberry Pi Anda yang sebenarnya.

---

## Verifikasi

### Cek Stream di Browser Raspberry Pi
```bash
# Di Raspberry Pi, buka browser
chromium http://localhost:5000
```

### Cek Stream dari Komputer
```bash
# Buka di browser komputer
http://192.168.1.100:5000
```

### Cek Endpoint JSON
```bash
curl http://192.168.1.100:5000/count
# Output: {"count": 2, "timestamp": "2026-05-01T..."}
```

---

## Troubleshooting

### Kamera tidak terdeteksi
```bash
# Cek kamera
vcgencmd get_camera

# Output seharusnya: supported=1 detected=1
# Jika detected=0, cek koneksi kabel/CSI
```

### Permission Error
```bash
# Tambahkan user ke video group
sudo usermod -a -G video $USER
# Logout dan login kembali
```

### Flask import error
```bash
pip3 install flask werkzeug --break-system-packages
```

### YOLO tidak jalan
```bash
# Model YOLO besar, pastikan space cukup
df -h
# Minimal 1GB free space untuk model
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web preview page |
| `/video_feed` | GET | MJPEG stream (untuk `<img src>`) |
| `/count` | GET | JSON: `{"count": N}` |
| `/status` | GET | Health check |
