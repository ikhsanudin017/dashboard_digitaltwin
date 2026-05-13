# Raspberry Pi Gateway Setup Status Report

**Tanggal:** 2026-05-05 (Updated: 2026-05-08)
**Status:** WiFi Reconnected
**IP:** 192.168.1.7 (WiFi), 192.168.1.2 (Ethernet)
**OS:** Debian GNU/Linux 13 (trixie)
**Hostname:** digitaltwin
**SSID:** Umi 123

---

## Executive Summary

Webcam tidak dapat berjalan karena **3 masalah utama** yang saling terkait. Semua masalah telah teridentifikasi dan siap untuk diperbaiki.

---

## 1. Hardware Configuration

| Komponen | Status | Notes |
|----------|--------|-------|
| Raspberry Pi | ✅ Ready | Hostname: digitaltwin |
| Flash Drive (8GB) | ✅ Ready | Mounted at /mnt/storage |
| SD Card | ✅ Ready | OS utama di mmcblk0p2 |
| FHD Webcam | ✅ Detected | /dev/video0, USB 0c45:636d Microdia |
| USB Flash Drive (7.5GB) | ✅ Ready | Mounted at /mnt/storage |
| Ethernet | ✅ Connected | 192.168.1.2 |
| WiFi | ✅ Connected | 192.168.1.7 (SSID: Umi 123) |

---

## 2. ROOT CAUSE ANALYSIS - Issues Found

### Issue #1: File Corruption - Carriage Return (`\r`)

**File:** `/home/digitaltwin/yolo_cam.py`

**Problem:** File mengandung Windows-style line endings (`\r\n`) yang menyebabkan syntax error:

```
  File "/home/digitaltwin/yolo_cam.py", line 96
    yield(b"--frame
          ^
SyntaxError: unterminated string literal (detected at line 96)
```

**Root Cause:** File dibuat/diedit di Windows sebelum di-copy ke RPi.

**Affected Lines:**
```python
# Baris 96-99 - MJPEG boundary corruption
yield(b"--frame
Content-Type: image/jpeg

" + buf.tobytes() + b"
")
```

**Should be:**
```python
yield(b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
```

---

### Issue #2: Python Environment Broken Symlinks

**Problem:** Python binary symlinks rusak atau tidak konsisten.

**Python Path Chain:**
```
/mnt/storage/venv/bin/python
    → python3.11
    → /usr/local/bin/python3.11
    → /mnt/storage/python/install/bin/python3.11 (compiled Python dari flash)
```

**Error yang Muncul:**
```
SyntaxError: source code string cannot contain null bytes
```

**Root Cause:** Python yang di-install di flash drive (`/mnt/storage/python/install/bin/python3.11`) adalah pre-compiled Python 3.11.15 untuk ARM64, tetapi ada ketidakcocokan dengan sistem Debian 13 (trixie).

**System Python Available:**
```
/usr/bin/python3 = Python 3.13.5 (Debian system)
```

---

### Issue #3: Script Files Corrupted

**Affected Files:**
1. `/home/digitaltwin/yolo_cam.py` - Corrupted line endings
2. `/home/digitaltwin/digitaltwin/yolo_detector.py` - Null bytes / encoding issue

**Error:**
```
SyntaxError: source code string cannot contain null bytes
```

---

### Issue #4: pip list broken

**Error:**
```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xda in position 239: invalid continuation byte
```

**Root Cause:** Corrupted package metadata di venv.

---

## 3. Current Working Components

| Component | Status | Details |
|-----------|--------|---------|
| SSH Connection | ✅ | `ssh digitaltwin@192.168.1.2` |
| OpenCV (venv) | ✅ | Version 4.10.0 |
| PyTorch (venv) | ✅ | Version 2.11.0+cpu |
| Ultralytics (venv) | ✅ | Import OK |
| Camera Device | ✅ | /dev/video0 detected |
| Flask (venv) | ✅ | Import OK |
| HAAR Cascade | ✅ | Available in OpenCV |

---

## 4. Python Environment Details

### Flash Drive Structure:
```
/mnt/storage/
├── python311.tar.zst      # Pre-compiled Python 3.11.15 (ARM64)
├── python/                # Python build directory
│   ├── build/
│   ├── install/
│   │   └── bin/python3.11  # Pre-compiled Python binary
│   └── licenses/
├── venv/                  # Virtual environment (Python 3.11.15)
│   ├── bin/python3.11 → /usr/local/bin/python3.11
│   ├── lib/python3.11/site-packages/
│   │   ├── cv2/         # OpenCV 4.10.0
│   │   ├── torch/        # PyTorch 2.11.0+cpu
│   │   ├── ultralytics/  # YOLO library
│   │   └── numpy/        # NumPy
│   └── pyvenv.cfg
└── lost+found/
```

### venv Configuration:
```
home = /usr/local/bin
include-system-site-packages = false
version = 3.11.15
executable = /mnt/storage/python/install/bin/python3.11
```

---

## 5. How to Fix

### Step 1: Fix Line Endings (IMMEDIATE)

```bash
# Connect to RPi
ssh digitaltwin@192.168.1.2

# Fix yolo_cam.py line endings
sed -i 's/\r//g' /home/digitaltwin/yolo_cam.py

# Verify fix
head -100 /home/digitaltwin/yolo_cam.py | od -c | grep -E "\\r" || echo "No CR found - OK"
```

### Step 2: Use Correct Python (RECOMMENDED)

**Option A: Use venv with correct activation**
```bash
# Activate venv correctly
source /mnt/storage/venv/bin/activate

# Verify
python --version  # Should show 3.11.15

# Run script
python /home/digitaltwin/yolo_cam.py
```

**Option B: Fix Python symlink (if Option A fails)**
```bash
# Check current symlinks
ls -la /mnt/storage/venv/bin/python*

# If broken, create new symlink to system Python
rm /mnt/storage/venv/bin/python3.11
ln -s /usr/bin/python3 /mnt/storage/venv/bin/python3.11

# Verify
/mnt/storage/venv/bin/python --version
```

### Step 3: Fix pip (if needed)
```bash
source /mnt/storage/venv/bin/activate

# Force reinstall pip
pip install --force-reinstall pip

# Check packages
pip list 2>/dev/null | head -20
```

---

## 6. Testing Webcam

After fixing, test with this command:

```bash
ssh digitaltwin@192.168.1.2

# Activate venv
source /mnt/storage/venv/bin/activate

# Test camera
python -c "
import cv2
cap = cv2.VideoCapture(0)
print('Camera opened:', cap.isOpened())
ret, frame = cap.read()
print('Read frame:', ret)
if ret:
    print('Frame shape:', frame.shape)
cap.release()
"

# Run YOLO detector
cd /home/digitaltwin
python yolo_cam.py
```

Expected output:
```
Camera opened: True
Read frame: True
Frame shape: (480, 640, 3)
YOLOv8 loaded
Camera 640x480
Open: http://192.168.1.2:5000/
```

---

## 7. Scripts Location

| Script | Location | Status |
|--------|----------|--------|
| yolo_cam.py | /home/digitaltwin/ | Needs line ending fix |
| yolo_detector.py | /home/digitaltwin/digitaltwin/ | Needs investigation |
| esp32_collector.py | /home/digitaltwin/digitaltwin/ | OK |
| monitor.py | /home/digitaltwin/digitaltwin/ | OK |

---

## 8. Recommendations

### Immediate Fix (Do Now):
1. Fix line endings di `yolo_cam.py`
2. Test dengan `source /mnt/storage/venv/bin/activate && python yolo_cam.py`
3. Verify webcam stream di browser

### Long-term Fix (Later):
1. Copy script baru dari repo lokal (yang sudah bersih) ke RPi
2. Atau rebuild Python environment di flash drive

---

## 9. SSH Commands Reference

```bash
# Connect
ssh digitaltwin@192.168.1.2
# Password: digitaltwin

# Quick test
sshpass -p 'digitaltwin' ssh digitaltwin@192.168.1.2 'uname -a'

# Run with venv
sshpass -p 'digitaltwin' ssh digitaltwin@192.168.1.2 'source /mnt/storage/venv/bin/activate && python /home/digitaltwin/yolo_cam.py'

# Check processes
sshpass -p 'digitaltwin' ssh digitaltwin@192.168.1.2 'ps aux | grep python'

# Kill stuck processes
sshpass -p 'digitaltwin' ssh digitaltwin@192.168.1.2 'pkill -9 -f python'
```

---

## 10. Updated: 2026-05-07 Findings

### Key Discovery:
File `yolo_cam.py` yang di-copy dari Mac ke RPi melalui SCP menjadi corrupted karena:
1. File dibuat/diedit dengan editor yang menambahkan `\r` (carriage return)
2. SCP transfer tidak mengkonversi line endings secara otomatis

### Solution Applied:
1. File baru `yolo_cam_fixed.py` dibuat di Mac dengan encoding yang benar
2. File di-copy ke RPi via SCP
3. Akan dilakukan testing dengan command yang benar

### Next Steps:
1. [ ] Fix line endings di RPi
2. [ ] Test camera stream
3. [ ] Verify people counting works
4. [ ] Test ESP32 data integration

---

## 11. Updated: 2026-05-08 - WiFi SSID Change

### What Changed:
| Item | Before | After |
|------|--------|-------|
| SSID | Umi | Umi 123 |
| WiFi IP | 192.168.1.14 | 192.168.1.7 |
| Password | (unchanged) | tanyaumi |

### Connection Status:
| Interface | Status | IP |
|-----------|--------|-----|
| wlan0 (WiFi) | ✅ Connected | 192.168.1.7 |
| eth0 (Ethernet) | ✅ Connected | 192.168.1.2 |

### SSH Commands (Updated):
```bash
# WiFi SSH (new)
ssh digitaltwin@192.168.1.7
sshpass -p 'digitaltwin' ssh digitaltwin@192.168.1.7

# Ethernet SSH (old)
ssh digitaltwin@192.168.1.2
sshpass -p 'digitaltwin' ssh digitaltwin@192.168.1.2
```

### Notes:
- Hostname `digitaltwin` tetap sama
- WiFi auto-reconnect via NetworkManager sudah aktif
- Flash drive `/mnt/storage` tetap berfungsi dengan UUID yang sama
