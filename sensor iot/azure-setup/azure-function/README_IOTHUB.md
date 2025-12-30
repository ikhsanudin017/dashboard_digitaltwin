# Azure Functions Setup - IoT Hub Integration

## 📋 Overview

Projek ini sudah diubah dari arsitektur MQTT Broker (HiveMQ) ke **Azure IoT Hub** langsung.

## 🏗️ Arsitektur Baru

```
ESP32 (DHT11 + ZMPT101B + SCT013) 
    ↓ (MQTT over TLS)
Azure IoT Hub
    ↓ (Event Hub Trigger)
Azure Function (IoTHubToStorage)
    ↓
Azure Storage Table (SensorTelemetry)
    ↓
Frontend Dashboard (Vue.js)
```

## ✅ Yang Sudah Dikonfigurasi

1. **ESP32 Code** - [`sensor iot/src/main.cpp`](../../../src/main.cpp)
   - Library: PubSubClient, Base64, mbedtls
   - Authentication: SAS Token
   - Target: `iothub-energymonitor-ef753d74.azure-devices.net`
   - Device ID: `ESP32_DHT11_Sensor`

2. **IoT Hub** - `iothub-energymonitor-ef753d74`
   - Location: Southeast Asia
   - SKU: F1 (Free tier)
   - Device: ESP32_DHT11_Sensor

3. **Azure Function** - `IoTHubToStorage`
   - Trigger: Event Hub (IoT Hub built-in endpoint)
   - Output: Azure Storage Table

## 🚀 Deployment Steps

### 1. Get IoT Hub Connection String

```bash
# Get Event Hub-compatible connection string
az iot hub connection-string show \
  --hub-name iothub-energymonitor-ef753d74 \
  --policy-name service \
  --query connectionString -o tsv
```

### 2. Configure Function App

Tambahkan Application Settings di Azure Function App:

```bash
# Set IoT Hub connection string
az functionapp config appsettings set \
  --name <YOUR_FUNCTION_APP_NAME> \
  --resource-group <YOUR_RESOURCE_GROUP> \
  --settings "IOT_HUB_CONNECTION_STRING=<connection_string>"

# Set Storage connection string (jika belum ada)
az functionapp config appsettings set \
  --name <YOUR_FUNCTION_APP_NAME> \
  --resource-group <YOUR_RESOURCE_GROUP> \
  --settings "STORAGE_CONNECTION_STRING=<storage_connection_string>"
```

### 3. Deploy Function

```bash
cd "sensor iot/azure-setup/azure-function"
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

### 4. Upload ESP32 Code

```bash
cd "sensor iot"
platformio run --target upload
platformio device monitor
```

## 📦 Functions

### IoTHubToStorage (NEW)
- **Trigger**: Event Hub (IoT Hub messages)
- **Input**: Device telemetry dari IoT Hub
- **Output**: Azure Storage Table `SensorTelemetry`
- **Purpose**: Menyimpan data sensor real-time dari ESP32

### MqttToIoTHub (DEPRECATED)
- ❌ Tidak diperlukan lagi karena ESP32 langsung ke IoT Hub
- File bisa dihapus atau dibiarkan untuk backward compatibility

### GetTelemetryData (UNCHANGED)
- **Trigger**: HTTP GET
- **Input**: Query parameters (hours, deviceId)
- **Output**: JSON array of telemetry data
- **Purpose**: API endpoint untuk dashboard

## 🔑 Required Environment Variables

```bash
# Azure Function App Settings
IOT_HUB_CONNECTION_STRING=Endpoint=sb://...;SharedAccessKeyName=service;SharedAccessKey=...
STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
```

## 🗑️ Files yang Bisa Dihapus

Setelah migrasi selesai dan berjalan dengan baik:

- ✅ `sensor iot/mqtt_bridge.py` - Bridge script tidak diperlukan
- ✅ `sensor iot/azure-setup/scripts/setup_hivemq_webhook.py` - HiveMQ tidak digunakan lagi
- ⚠️ `MqttToIoTHub/` - Simpan untuk sementara sebagai backup

## 🧪 Testing

### Test ESP32 Connection

```bash
# Monitor IoT Hub messages
az iot hub monitor-events \
  --hub-name iothub-energymonitor-ef753d74 \
  --device-id ESP32_DHT11_Sensor
```

### Test Function

Function akan otomatis triggered saat message masuk ke IoT Hub. Check logs:

```bash
func azure functionapp logstream <YOUR_FUNCTION_APP_NAME>
```

### Test API Endpoint

```bash
# Get telemetry data (last 24 hours)
curl "https://<YOUR_FUNCTION_APP>.azurewebsites.net/api/GetTelemetryData?hours=24"
```

## 📊 Advantages vs MQTT Broker

| Aspek | MQTT Broker (HiveMQ) | Azure IoT Hub |
|-------|---------------------|---------------|
| Architecture | ESP32 → HiveMQ → Bridge → IoT Hub → Function | ESP32 → IoT Hub → Function |
| Layers | 4 layers | 2 layers |
| Cost | Broker fee + Azure | Azure only |
| Security | TLS + User/Pass | TLS + SAS Token |
| Device Mgmt | Manual | Built-in Azure |
| Scalability | Limited | Azure scale |
| Monitoring | External + Azure | Azure only |

## 🔧 Troubleshooting

### ESP32 tidak connect
- Check WiFi credentials
- Check IoT Hub name, device ID, device key
- Monitor serial output untuk error messages

### Function tidak triggered
- Check Event Hub connection string
- Check Function App logs
- Verify IoT Hub receiving messages

### Data tidak tersimpan
- Check Storage connection string
- Check Table name: `SensorTelemetry`
- Verify table permissions

## 📚 References

- [Azure IoT Hub MQTT Support](https://learn.microsoft.com/en-us/azure/iot/iot-mqtt-connect-to-iot-hub)
- [Azure Functions Event Hub Trigger](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-hubs-trigger)
- [ESP32 Azure IoT](https://github.com/Azure/azure-iot-arduino)
