# 📁 Digital Twin Energy Monitor - Project Structure

Project ini telah dibersihkan dan hanya berisi file-file yang diperlukan.

## 📂 Struktur Project

```
digital-twin/
├── 🔧 ESP32 Firmware
│   ├── platformio.ini          # PlatformIO configuration
│   ├── src/
│   │   └── main.cpp            # ESP32 code (DHT11, ZMPT101B, SCT013)
│   ├── include/                # Header files
│   └── lib/                    # Libraries
│
├── 🌉 Bridge Script (MQTT → Azure)
│   ├── bridge/
│   │   ├── bridge.js           # Main bridge script
│   │   ├── query-data.js       # Query historical data
│   │   ├── query-latest.js     # Query latest data
│   │   ├── test-api.js         # Test API endpoints
│   │   └── package.json        # Dependencies
│
├── ☁️ Azure Infrastructure
│   ├── azure-setup/
│   │   ├── README.md           # Setup documentation
│   │   ├── queries.md          # ADT query examples
│   │   │
│   │   ├── models/             # DTDL Models
│   │   │   ├── Building.json
│   │   │   ├── Room.json
│   │   │   ├── EnergyMonitorSensor.json
│   │   │   ├── MqttBroker.json
│   │   │   ├── DataGateway.json
│   │   │   ├── IoTHub.json
│   │   │   └── DigitalTwinsService.json
│   │   │
│   │   ├── azure-function/     # Azure Functions
│   │   │   ├── MqttToIoTHub/   # Webhook receiver
│   │   │   ├── GetTelemetryData/ # API endpoint
│   │   │   ├── host.json
│   │   │   └── package.json
│   │   │
│   │   └── scripts/            # Deployment scripts
│   │       ├── quick_setup.sh
│   │       ├── deploy_azure.sh
│   │       └── create_digital_twin.sh
│
├── 📱 Dashboard Integration
│   └── dashboard-integration/
│       ├── apiService.js       # API service for dashboard
│       ├── DashboardComponent.vue # Vue component example
│       └── INTEGRATION_STEPS.md # Integration guide
│
└── 📚 Documentation
    └── DASHBOARD_API.md        # API documentation

```

## 🗑️ File yang Sudah Dihapus

File/folder berikut sudah dihapus karena tidak diperlukan lagi:

### ❌ Backup Files (tidak perlu)
- `backup/` - Backup code lama (main_azure_direct.cpp, main_hivemq_backup.cpp)
- `cleanup_samples.sh` - Script temporary

### ❌ Old Documentation (outdated)
- `azure-setup/SETUP_DIRECT_CONNECTION.md` - Direct connection approach (tidak jadi dipakai)
- `azure-setup/DEPLOY_MANUAL.md` - Manual deployment (sudah ada quick_setup.sh)
- `azure-setup/NEXT_STEPS.md` - Outdated next steps
- `azure-setup/WEBHOOK_SETUP.txt` - Old webhook notes

### ❌ Unused Functions & Scripts
- `azure-setup/function-simple.js` - Simple function (not used)
- `azure-setup/azure-function/GetLatestTelemetry/` - Old API structure
- `azure-setup/azure-function/GetTelemetryHistory/` - Old API structure
- `azure-setup/scripts/deploy-function.sh` - Temporary deployment scripts
- `azure-setup/scripts/deploy-now.sh` - Temporary deployment scripts
- `azure-setup/scripts/deploy-api.sh` - Temporary deployment scripts

### ❌ Test & Temporary Files
- `bridge/test-storage.js` - Temporary test file
- `*.zip` files - Old deployment packages

## ✅ File yang Dipertahankan (Penting!)

### 🔴 Critical Files (JANGAN DIHAPUS!)
```
src/main.cpp                    # ESP32 firmware
bridge/bridge.js                # Bridge script (harus running!)
azure-setup/models/*.json       # DTDL models (deployed ke Azure)
azure-setup/azure-function/     # Azure Functions (deployed)
```

### 🟡 Important Files (Untuk reference)
```
DASHBOARD_API.md                # API documentation
dashboard-integration/          # Dashboard integration code
azure-setup/README.md           # Setup guide
azure-setup/queries.md          # Query examples
bridge/query-*.js               # Query utilities
```

### 🟢 Configuration Files
```
platformio.ini                  # PlatformIO config
package.json (multiple)         # Node.js dependencies
host.json                       # Azure Function config
```

## 📊 Current System Status

### ✅ Running Components:
1. **ESP32**: Publishing to HiveMQ every 5 seconds
2. **Bridge Script**: Running in background (`/tmp/bridge.log`)
3. **Azure Storage**: Storing all telemetry data
4. **Azure Function**: API endpoints active
5. **Digital Twins**: Properties updating real-time

### 🔗 Active Endpoints:
```
API Base: https://func-energymonitor-c9001a7e.azurewebsites.net/api

GET /telemetry/latest           # Latest sensor data
GET /telemetry/history?hours=24 # Historical data
GET /telemetry/stats?hours=24   # Statistics
```

### 💾 Data Storage:
- **Azure Storage Table**: `SensorTelemetry`
- **Partition Key**: `ESP32_ENERGY_MONITOR_001`
- **Records**: 500+ (dan terus bertambah)

## 🚀 Next Steps

1. **Integrate Dashboard**: 
   - Copy `dashboard-integration/apiService.js` ke project dashboard
   - Follow `dashboard-integration/INTEGRATION_STEPS.md`

2. **Monitor System**:
   ```bash
   # Check bridge status
   tail -f /tmp/bridge.log
   
   # Query latest data
   cd bridge && node query-latest.js
   
   # Test API
   node test-api.js
   ```

3. **Deploy Dashboard**: Push ke Vercel dengan API integration

## 📝 Notes

- Project ini sudah production-ready
- Semua file yang ada sekarang PENTING dan diperlukan
- Backup dilakukan via Git, tidak perlu folder backup manual
- Documentation ada di masing-masing folder README.md

---

**Last Updated**: 19 November 2025
**Project Status**: ✅ Operational & Clean
