# Sensor IoT

## Overview

Modul sensor IoT untuk Digital Twin Dashboard. Terdiri dari ESP32 untuk sensor suhu/kelembaban/listrik dan Raspberry Pi untuk people detection.

## Struktur Folder

```
sensor iot/
├── src/                    # Source code ESP32
│   └── main.cpp
├── azure-setup/            # Azure Functions dan konfigurasi
│   ├── azure-function/     # Azure Functions code
│   └── scripts/            # Script deployment
├── raspberry-pi/           # People detection dengan kamera
│   └── people_counter_yolo.py
├── include/                # Header files ESP32
├── lib/                    # Library ESP32
└── platformio.ini          # Konfigurasi PlatformIO
```

## Arsitektur

```
ESP32 (DHT11 + ZMPT101B + SCT013)
    |
    v
Azure IoT Hub
    |
    v
Azure Function (IoTHubToStorage)
    |
    v
Azure Storage Table
    |
    v
Frontend Dashboard


Raspberry Pi (Webcam + YOLO)
    |
    v
MQTT Broker (HiveMQ)
    |
    v
Frontend Dashboard
```

## Komponen

### ESP32

Sensor yang terhubung:
- DHT11: Suhu dan kelembaban
- ZMPT101B: Tegangan listrik
- SCT013: Arus listrik

Data dikirim ke Azure IoT Hub setiap 5 detik.

### Raspberry Pi

People detection menggunakan YOLO v3-tiny untuk menghitung jumlah orang dalam ruangan. Data dikirim ke MQTT broker.

### Azure Functions

- IoTHubToStorage: Menerima data dari IoT Hub dan simpan ke Storage Table
- GetTelemetryData: API endpoint untuk frontend
- GetACRecommendation: Rekomendasi AC berdasarkan data sensor

## Testing

### Test ESP32

1. Buka project dengan PlatformIO di VS Code
2. Connect ESP32 ke komputer via USB
3. Upload dan monitor:

```bash
cd "sensor iot"
platformio run --target upload
platformio device monitor
```

Output yang diharapkan:
```
WiFi connected
IP address: 192.168.x.x
IoT Hub connected
Sending telemetry: {"suhu":27.5,"kelembaban":65.0,"tegangan":220.5,"arus":1.2}
```

### Test Raspberry Pi

1. SSH ke Raspberry Pi:

```bash
ssh [username]@[raspberry_pi_ip]
```

2. Jalankan people counter:

```bash
cd ~
python3 people_counter_yolo.py
```

3. Buka browser dan akses:

```
http://[raspberry_pi_ip]:5000/
```

Output yang diharapkan:
- Video stream dengan bounding box di setiap orang terdeteksi
- Counter jumlah orang realtime

### Test Azure Functions Lokal

1. Install Azure Functions Core Tools
2. Jalankan:

```bash
cd "sensor iot/azure-setup/azure-function"
npm install
func start
```

3. Test endpoint:

```bash
curl http://localhost:7071/api/GetTelemetryData?hours=24
```

### Test Azure Functions di Cloud

Setelah deploy, test dengan:

```bash
curl https://[function_app_name].azurewebsites.net/api/GetTelemetryData?hours=24
```

## Deployment

### Deploy Azure Functions

```bash
cd "sensor iot/azure-setup/azure-function"
func azure functionapp publish [FUNCTION_APP_NAME]
```

### Upload ESP32

```bash
cd "sensor iot"
platformio run --target upload
```

### Setup Raspberry Pi

Copy file ke Raspberry Pi:

```bash
scp "sensor iot/raspberry-pi/people_counter_yolo.py" [user]@[raspi_ip]:~/
scp "sensor iot/raspberry-pi/requirements.txt" [user]@[raspi_ip]:~/
```

Di Raspberry Pi:

```bash
pip3 install -r requirements.txt
python3 people_counter_yolo.py
```
