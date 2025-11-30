# Azure Digital Twins Integration untuk Energy Monitor

Panduan lengkap untuk mengintegrasikan ESP32 Energy Monitor dengan Azure Digital Twins menggunakan Azure for Students.

## 📋 Prerequisites

- **Azure for Students Account** (sudah aktif)
- **HiveMQ Cloud Account** (sudah setup)
- **Azure CLI** terinstall di laptop
- **Node.js** 18+ untuk Azure Functions
- **Python** 3.8+ untuk setup scripts

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESP32 Energy Monitor                         │
│  DHT11 + ZMPT101B + SCT013-000                                 │
│  (Suhu, Kelembaban, Tegangan, Arus, Daya)                     │
└────────────────────┬────────────────────────────────────────────┘
                     │ WiFi + MQTT (TLS)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HiveMQ Cloud (MQTT Broker)                   │
│  Topic: sensor/dht11/data                                       │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP Webhook
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Azure Function (Serverless)                  │
│  - Receive webhook dari HiveMQ                                  │
│  - Transform data                                               │
│  - Forward ke IoT Hub                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │ Azure IoT Hub Protocol
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Azure IoT Hub                                │
│  - Device management                                            │
│  - Message routing                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │ Event Grid / Direct
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                Azure Digital Twins (ADT)                        │
│  - Digital twin model (DTDL)                                    │
│  - Real-time property updates                                   │
│  - Relationship graph                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        ↓                          ↓
┌──────────────────┐    ┌──────────────────────┐
│ Time Series      │    │ Azure Storage         │
│ Insights (TSI)   │    │ (Historical Data)     │
└──────────────────┘    └──────────────────────┘
```

## 🚀 Setup Instructions

### Step 1: Install Azure CLI

```bash
# macOS
brew install azure-cli

# Verify installation
az --version

# Login to Azure
az login
```

### Step 2: Setup Azure Resources

```bash
cd azure-setup/scripts

# Make script executable
chmod +x deploy_azure.sh

# Run deployment script
./deploy_azure.sh
```

Script ini akan membuat:
- ✅ Resource Group
- ✅ Azure IoT Hub (Free tier F1)
- ✅ Device registration untuk ESP32
- ✅ Storage Account
- ✅ Azure Function App (Consumption plan)
- ✅ Azure Digital Twins instance
- ✅ DTDL model upload
- ✅ Digital twin instance

**IMPORTANT:** Simpan connection strings yang ditampilkan!

### Step 3: Deploy Azure Function

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Navigate to function directory
cd ../azure-function

# Install dependencies
npm install

# Deploy to Azure
func azure functionapp publish <FUNCTION_APP_NAME>
```

Ganti `<FUNCTION_APP_NAME>` dengan nama dari output Step 2.

### Step 4: Get Azure Function URL dan Key

```bash
# Get function URL
az functionapp function show \
  --name <FUNCTION_APP_NAME> \
  --resource-group rg-digitaltwin-energymonitor \
  --function-name MqttToIoTHub \
  --query invokeUrlTemplate -o tsv

# Get function key
az functionapp function keys list \
  --name <FUNCTION_APP_NAME> \
  --resource-group rg-digitaltwin-energymonitor \
  --function-name MqttToIoTHub \
  --query default -o tsv
```

**Simpan URL dan Key ini!**

### Step 5: Setup HiveMQ Webhook

**Manual Setup di HiveMQ Console:**

1. Login ke https://console.hivemq.cloud
2. Pilih cluster Anda: `02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud`
3. Navigate ke **"Integrations"** atau **"Extensions"**
4. Klik **"Add Integration"** → **"HTTP Webhook"**
5. Konfigurasi:
   - **Name**: `AzureFunctionWebhook`
   - **URL**: `<AZURE_FUNCTION_URL>?code=<FUNCTION_KEY>`
   - **Method**: `POST`
   - **Headers**:
     ```
     Content-Type: application/json
     ```
   - **Topic Filter**: `sensor/dht11/data`
   - **QoS**: 1
6. **Save** dan **Enable** webhook

### Step 6: Test Integration

**Test 1: Manual test Azure Function**

```bash
curl -X POST "<AZURE_FUNCTION_URL>?code=<FUNCTION_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "suhu": 27.5,
    "kelembaban": 85.0,
    "tegangan": 220.0,
    "arus": 1.5,
    "daya": 330.0,
    "status_tegangan": "terhubung",
    "status_arus": "terhubung"
  }'
```

**Test 2: Verify data in Azure Digital Twins**

```bash
# Get twin
az dt twin show \
  --dt-name <ADT_INSTANCE_NAME> \
  --twin-id ESP32_ENERGY_MONITOR_001

# Query telemetry
az dt twin telemetry show \
  --dt-name <ADT_INSTANCE_NAME> \
  --twin-id ESP32_ENERGY_MONITOR_001
```

**Test 3: ESP32 mengirim data real**

ESP32 Anda sudah running, jadi data otomatis akan mengalir:
- ESP32 → HiveMQ ✅ (sudah jalan)
- HiveMQ → Azure Function (webhook baru)
- Azure Function → IoT Hub
- IoT Hub → Azure Digital Twins

## 📊 Monitoring & Visualization

### Option 1: Azure Portal

1. Login ke https://portal.azure.com
2. Navigate ke **Azure Digital Twins** instance
3. Klik **"Query"** blade
4. Run query:
   ```sql
   SELECT * FROM digitaltwins WHERE $dtId = 'ESP32_ENERGY_MONITOR_001'
   ```

### Option 2: Azure Digital Twins Explorer

1. Buka https://explorer.digitaltwins.azure.net
2. Connect ke instance Anda
3. Visualisasi real-time twin updates

### Option 3: Time Series Insights (Advanced)

Untuk historical data analytics:

```bash
# Create TSI environment (requires Standard tier)
az tsi environment standard create \
  --name tsi-energymonitor \
  --resource-group rg-digitaltwin-energymonitor \
  --location southeastasia \
  --sku name=S1 capacity=1
```

## 🔧 Troubleshooting

### Issue 1: Webhook tidak terkirim

**Check HiveMQ webhook logs:**
1. HiveMQ Console → Integrations → View Logs
2. Verify status code dari Azure Function

**Check Azure Function logs:**
```bash
az functionapp log tail \
  --name <FUNCTION_APP_NAME> \
  --resource-group rg-digitaltwin-energymonitor
```

### Issue 2: Data tidak muncul di Digital Twin

**Verify IoT Hub messages:**
```bash
# Monitor IoT Hub events
az iot hub monitor-events \
  --hub-name <IOT_HUB_NAME> \
  --device-id ESP32_ENERGY_MONITOR_001
```

**Check Digital Twin logs:**
```bash
az monitor log-analytics query \
  --workspace <WORKSPACE_ID> \
  --analytics-query "ADTDigitalTwinsOperation | where TimeGenerated > ago(1h)"
```

### Issue 3: Function timeout

Increase timeout di `host.json`:
```json
{
  "functionTimeout": "00:05:00"
}
```

## 💰 Cost Estimation (Azure for Students)

Dengan Azure for Students ($100 kredit):

| Service | Tier | Cost/Month | Notes |
|---------|------|------------|-------|
| IoT Hub | F1 (Free) | $0 | 8,000 msg/day limit |
| Function App | Consumption | ~$0-5 | 1M free executions |
| Digital Twins | Free tier | $0 | Limited instances |
| Storage | Standard LRS | ~$1 | 5GB typical |
| **TOTAL** | | **~$1-6/month** | Very affordable! |

## 📝 DTDL Model Details

Model ID: `dtmi:digitaltwin:energymonitor:EnergyMonitorSensor;1`

**Telemetry (Time-series data):**
- `suhu` (double) - Suhu dalam °C
- `kelembaban` (double) - Kelembaban dalam %
- `tegangan` (double) - Tegangan AC dalam Volt
- `arus` (double) - Arus AC dalam Ampere
- `daya` (double) - Daya listrik dalam Watt
- `timestamp` (dateTime) - Waktu pengukuran

**Properties (State):**
- `deviceId` (string) - Device identifier
- `status_tegangan` (string) - "terhubung" / "tidak_terhubung"
- `status_arus` (string) - "terhubung" / "tidak_terhubung"
- `location` (string) - Lokasi fisik sensor

## 🔐 Security Best Practices

1. **Function Keys**: Gunakan function-level keys, bukan master key
2. **IoT Hub**: Enable device authentication
3. **Digital Twins**: Configure RBAC dengan least privilege
4. **Secrets**: Store connection strings di Azure Key Vault
5. **Network**: Enable private endpoints untuk production

## 📚 Resources

- [Azure Digital Twins Documentation](https://docs.microsoft.com/azure/digital-twins/)
- [DTDL Specification](https://github.com/Azure/opendigitaltwins-dtdl)
- [Azure IoT Hub Docs](https://docs.microsoft.com/azure/iot-hub/)
- [Azure Functions Best Practices](https://docs.microsoft.com/azure/azure-functions/functions-best-practices)

## 🆘 Support

Jika ada masalah:
1. Check troubleshooting section di atas
2. Review Azure Function logs
3. Verify HiveMQ webhook status
4. Check Azure service health: https://status.azure.com

---

**Created for:** Digital Twin Energy Monitor Project  
**Platform:** Azure for Students  
**Last Updated:** November 2025
