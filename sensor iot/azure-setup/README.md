# Azure Setup

## Overview

Konfigurasi Azure IoT Hub dan Azure Functions untuk menerima dan menyimpan data sensor.

## Arsitektur

```
ESP32
    |
    v
Azure IoT Hub (iothub-energymonitor)
    |
    v
Azure Function (IoTHubToStorage)
    |
    v
Azure Storage Table (SensorTelemetry)
    |
    v
Azure Function (GetTelemetryData)
    |
    v
Frontend Dashboard
```

## Komponen Azure

### IoT Hub

- Nama: iothub-energymonitor
- Location: Southeast Asia
- SKU: F1 (Free tier)
- Device ID: ESP32_DHT11_Sensor

### Storage Account

- Nama: stenergy
- Table: SensorTelemetry

### Function App

Functions:
- IoTHubToStorage: Event Hub trigger untuk simpan data
- GetTelemetryData: HTTP trigger untuk API
- GetACRecommendation: HTTP trigger untuk rekomendasi AC

## Struktur Folder

```
azure-setup/
├── azure-function/
│   ├── IoTHubToStorage/
│   ├── GetTelemetryData/
│   ├── GetACRecommendation/
│   ├── host.json
│   ├── local.settings.json
│   └── package.json
├── models/
│   └── EnergyMonitorSensor.json
└── scripts/
    ├── deploy_azure.sh
    └── setup_iot_hub.sh
```

## Deployment

### Prerequisites

- Azure CLI terinstall
- Azure Functions Core Tools terinstall
- Sudah login ke Azure (az login)

### Deploy Azure Functions

```bash
cd azure-function
npm install
func azure functionapp publish [FUNCTION_APP_NAME]
```

### Konfigurasi IoT Hub Connection

Set application settings di Function App:

```bash
az functionapp config appsettings set \
  --name [FUNCTION_APP_NAME] \
  --resource-group [RESOURCE_GROUP] \
  --settings "IOT_HUB_CONNECTION_STRING=[connection_string]"
```

## Testing

### Test Lokal

1. Copy local.settings.json.example ke local.settings.json
2. Isi connection string yang diperlukan
3. Jalankan:

```bash
cd azure-function
npm install
func start
```

4. Test endpoint:

```bash
# GetTelemetryData
curl "http://localhost:7071/api/GetTelemetryData?hours=24"

# GetACRecommendation
curl "http://localhost:7071/api/GetACRecommendation?deviceId=ESP32_DHT11_Sensor"
```

### Test di Azure

Setelah deploy:

```bash
# GetTelemetryData
curl "https://[FUNCTION_APP].azurewebsites.net/api/GetTelemetryData?hours=24"

# GetACRecommendation  
curl "https://[FUNCTION_APP].azurewebsites.net/api/GetACRecommendation?deviceId=ESP32_DHT11_Sensor"
```

### Verifikasi Data Masuk

1. Buka Azure Portal
2. Navigate ke Storage Account
3. Buka Storage Browser > Tables > SensorTelemetry
4. Verifikasi data sensor tersimpan

### Test IoT Hub Connection

```bash
# Monitor messages di IoT Hub
az iot hub monitor-events --hub-name [IOT_HUB_NAME] --device-id ESP32_DHT11_Sensor
```

## Troubleshooting

### Function Tidak Trigger

Cek IoT Hub connection string di application settings. Pastikan format benar:
```
Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=...;EntityPath=...
```

### Data Tidak Tersimpan

Cek Storage connection string. Verifikasi table SensorTelemetry sudah dibuat.

### API Return Empty

Pastikan parameter query benar (hours, deviceId). Cek apakah ada data di storage table.
