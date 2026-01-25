# 🔧 Troubleshooting Kamera Raspberry Pi

## ❌ Problem: "Raspberry Pi Offline" atau "Tidak dapat terhubung ke kamera"

### ✅ Solusi Quick Fix

#### 1. **Cek IP Address Raspberry Pi**

Di Raspberry Pi, jalankan:
```bash
hostname -I
```

Output contoh: `192.168.1.8`

#### 2. **Update File .env**

Edit file `view_virtual/.env` dan pastikan IP sesuai:

```env
VITE_RASPBERRY_PI_IP=192.168.1.8
VITE_RASPBERRY_PI_PORT=5000
```

⚠️ **Ganti `192.168.1.8` dengan IP Raspberry Pi Anda!**

#### 3. **Restart Development Server**

```bash
cd view_virtual
npm run dev
```

---

## 🔍 Troubleshooting Lengkap

### Step 1: Test Kamera di Raspberry Pi

Jalankan script troubleshooting:

```bash
cd sensor\ iot/raspberry-pi/
python3 test_camera_connection.py
```

Script ini akan:
- ✅ Detect webcam USB
- ✅ Check YOLO files
- ✅ Test Flask server
- ✅ Show IP address
- ✅ Run simple test stream

### Step 2: Jalankan Script Kamera

Setelah test berhasil:

```bash
python3 people_counter_yolo.py
```

Anda harus melihat:
```
✅ YOLO v3-tiny loaded
✅ Camera initialized (320x240)
✅ MQTT connected
🌐 Server running on port 5000
📡 Stream: http://192.168.1.X:5000/video_feed
```

### Step 3: Test di Browser

Buka di browser (di komputer yang sama networknya):
```
http://192.168.1.X:5000
```

Jika stream muncul = **Kamera OK!** ✅

---

## ⚠️ Common Issues

### Issue 1: Webcam Tidak Terdeteksi

**Symptom:**
```
❌ No webcam detected!
```

**Solution:**
```bash
# Check USB devices
lsusb

# Check video devices
ls /dev/video*

# Install dependencies
sudo apt-get install fswebcam v4l-utils

# Add user to video group
sudo usermod -a -G video $USER

# Reboot
sudo reboot
```

### Issue 2: IP Address Berubah

**Symptom:** Kamera kerja kemarin, hari ini offline

**Solution:**

1. Cek IP baru di Raspberry Pi:
   ```bash
   hostname -I
   ```

2. Update `.env`:
   ```env
   VITE_RASPBERRY_PI_IP=<IP_BARU>
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

**Permanent Fix:** Set Static IP di Raspberry Pi

Edit `/etc/dhcpcd.conf`:
```
interface wlan0
static ip_address=192.168.1.8/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

### Issue 3: CORS Error

**Symptom:**
```
Access to fetch at 'http://192.168.1.8:5000/count' has been blocked by CORS
```

**Solution:** 

Script sudah diperbaiki! Restart script:
```bash
# Stop (Ctrl+C)
python3 people_counter_yolo.py
```

### Issue 4: Port 5000 Already in Use

**Symptom:**
```
OSError: [Errno 98] Address already in use
```

**Solution:**
```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs sudo kill -9

# Or use different port
# Edit people_counter_yolo.py, line 18:
STREAM_PORT = 5001
```

### Issue 5: YOLO Files Not Found

**Symptom:**
```
❌ yolov3-tiny.weights - NOT FOUND
```

**Solution:**

Files akan auto-download. Jika gagal, download manual:

```bash
# Download YOLO files
wget https://pjreddie.com/media/files/yolov3-tiny.weights
wget https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3-tiny.cfg
wget https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names
```

### Issue 6: Network Tidak Sama

**Symptom:** Dashboard dan Raspberry Pi tidak bisa connect

**Solution:**

Pastikan keduanya di network yang sama:

**Raspberry Pi:**
```bash
hostname -I
# Output: 192.168.1.8
```

**PC/Laptop Dashboard:**
```bash
ipconfig  # Windows
ifconfig  # Linux/Mac
# Cari IP yang 192.168.1.X
```

Jika berbeda (misal: Pi = 192.168.1.X, PC = 192.168.0.X):
- Hubungkan keduanya ke WiFi/Router yang sama
- Atau gunakan ethernet cable ke router yang sama

---

## 🧪 Quick Test Commands

### Test dari Dashboard PC

```bash
# Test ping
ping 192.168.1.8

# Test stream di browser
http://192.168.1.8:5000

# Test API
curl http://192.168.1.8:5000/count
# Expected: {"count": 0, "mqtt": true}
```

### Test di Raspberry Pi

```bash
# Test lokal
curl localhost:5000/count

# Test kamera
python3 test_camera_connection.py --test
```

---

## 📋 Checklist Sebelum Hubungi Support

- [ ] IP Raspberry Pi sudah benar di `.env`
- [ ] Raspberry Pi dan PC di network yang sama
- [ ] Script `people_counter_yolo.py` berjalan tanpa error
- [ ] Test stream di browser berhasil (http://IP:5000)
- [ ] Dev server sudah restart setelah update `.env`
- [ ] Webcam USB terhubung dan terdeteksi
- [ ] Port 5000 tidak dipakai aplikasi lain

---

## 🚀 Start Fresh (Full Reset)

Jika semua cara di atas gagal:

```bash
# Di Raspberry Pi
cd sensor\ iot/raspberry-pi/

# Stop semua process Python
sudo killall python3

# Remove YOLO files (akan re-download)
rm yolov3-tiny.weights yolov3-tiny.cfg coco.names

# Reboot
sudo reboot

# Setelah reboot
python3 test_camera_connection.py

# Jika test OK
python3 people_counter_yolo.py
```

```bash
# Di PC Dashboard
cd view_virtual

# Update .env dengan IP yang benar

# Restart
npm run dev
```

---

## 📞 Still Not Working?

Jika masih bermasalah, kumpulkan info berikut:

**Di Raspberry Pi:**
```bash
# System info
uname -a
python3 --version
hostname -I

# Camera status
ls /dev/video*
v4l2-ctl --list-devices

# Running processes
ps aux | grep python

# Port status
sudo netstat -tulpn | grep 5000
```

**Di PC:**
```bash
# Network
ipconfig  # Windows
ifconfig  # Linux/Mac

# Test connection
ping <RASPBERRY_PI_IP>
curl http://<RASPBERRY_PI_IP>:5000/status
```

Share output di atas untuk diagnosis lebih lanjut! 🔍
