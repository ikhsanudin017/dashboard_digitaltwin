# 🏢 TwinSpace - Digital Twin Dashboard for Energy Monitoring

[![Azure DevOps Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Vue.js](https://img.shields.io/badge/Vue.js-3.4-4FC08D?logo=vue.js)]()
[![Azure](https://img.shields.io/badge/Azure-IoT%20Hub-0078D4?logo=microsoft-azure)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

Sistem Digital Twin untuk monitoring energi dan kondisi ruangan secara real-time dengan visualisasi 3D, analisis ML, dan rekomendasi otomatis.

![Dashboard Preview](docs/images/dashboard-preview.png)

## 🌟 Fitur Utama

- **🎯 Visualisasi 3D Digital Twin** - Model ruangan interaktif dengan indikator sensor
- **📊 Real-time Monitoring** - Data suhu, kelembaban, dan listrik real-time via MQTT
- **👥 People Detection** - Deteksi jumlah orang menggunakan YOLO + Webcam
- **🤖 ML-based Recommendations** - Rekomendasi suhu AC optimal berbasis Machine Learning
- **📈 Historical Analytics** - Grafik dan analisis data historis
- **☁️ Azure Integration** - IoT Hub, Storage, dan Functions untuk backend cloud
- **🌙 Dark/Light Mode** - Tema yang dapat disesuaikan

## 🏗️ Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        TWINSPACE ARCHITECTURE                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                         HARDWARE LAYER                               │   │
│   │                                                                      │   │
│   │   ┌─────────────┐                    ┌──────────────────┐            │   │
│   │   │   ESP32     │                    │  Raspberry Pi    │            │   │
│   │   │  ┌───────┐  │                    │  ┌────────────┐  │            │   │
│   │   │  │ DHT11 │  │ Suhu & Kelembaban  │  │  Webcam +  │  │ People     │   │
│   │   │  │ZMPT101│  │ Tegangan & Arus    │  │   YOLO     │  │ Detection  │   │
│   │   │  │SCT013 │  │ Daya               │  └────────────┘  │            │   │
│   │   │  └───────┘  │                    └──────────────────┘            │   │
│   │   └──────┬──────┘                              │                     │   │
│   └──────────┼─────────────────────────────────────┼─────────────────────┘   │
│              │                                     │                         │
│              ▼                                     ▼                         │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                          CLOUD LAYER                                 │   │
│   │                                                                      │   │
│   │   ┌────────────────┐          ┌────────────────┐                     │   │
│   │   │ Azure IoT Hub  │◄─MQTT────│  HiveMQ Cloud  │◄──MQTT──────────────│   │
│   │   │                │          │  MQTT Broker   │                     │   │
│   │   └───────┬────────┘          └────────┬───────┘                     │   │
│   │           │ Event Hub                  │                             │   │
│   │           ▼                            │                             │   │
│   │   ┌────────────────────────────────────┴─────────────────────────┐   │   │
│   │   │                    Azure Functions                           │   │   │
│   │   │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐     │   │   │
│   │   │  │IoTHubTo     │  │GetTelemetry │  │GetACRecommendation│     │   │   │
│   │   │  │Storage      │  │Data         │  │(ML-based)         │     │   │   │
│   │   │  └─────────────┘  └─────────────┘  └───────────────────┘     │   │   │
│   │   └──────────────────────────┬───────────────────────────────────┘   │   │
│   │                              │                                       │   │
│   │                              ▼                                       │   │
│   │   ┌──────────────────────────────────────────────────────────────┐   │   │
│   │   │              Azure Storage Table (SensorTelemetry)           │   │   │
│   │   └──────────────────────────┬───────────────────────────────────┘   │   │
│   └──────────────────────────────┼───────────────────────────────────────┘   │
│                                  │                                           │
│                                  ▼                                           │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                      APPLICATION LAYER                               │   │
│   │                                                                      │   │ 
│   │   ┌────────────────────────────────────────────────────────────┐     │   │
│   │   │                   Vue.js Dashboard                         │     │   │
│   │   │                                                            │     │   │
│   │   │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │     │   │
│   │   │   │ 3D Twin │  │ Charts  │  │ Alerts  │  │AC Recommend │   │     │   │
│   │   │   │ Babylon │  │Chart.js │  │ System  │  │   ML-based  │   │     │   │
│   │   │   └─────────┘  └─────────┘  └─────────┘  └─────────────┘   │     │   │
│   │   │                                                            │     │   │
│   │   └────────────────────────────────────────────────────────────┘     │   │
│   │                                                                      │   │
│   │   ┌────────────────────────────────────────────────────────────┐     │   │
│   │   │                   ML Training System                       │     │   │
│   │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │     │   │
│   │   │   │Auto-Training│  │Energy Model │  │AC Recommendation│    │     │   │
│   │   │   │  (Cron)     │  │RandomForest │  │GradientBoosting │    │     │   │
│   │   │   └─────────────┘  └─────────────┘  └─────────────────┘    │     │   │
│   │   └────────────────────────────────────────────────────────────┘     │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Struktur Project

```
dashboard_digitaltwin/
│
├── 📄 README.md                 # Dokumentasi utama (file ini)
├── 📄 azure-pipelines.yml       # CI/CD configuration
├── 📄 package.json              # Root dependencies
├── 📄 vercel.json               # Vercel deployment config
│
├── 📁 .github/                  # GitHub configurations
│   └── README.md                # CI/CD documentation
│
├── 📁 docs/                     # 📚 Dokumentasi planning, report, referensi
│   ├── README.md                # Indeks dokumentasi
│   ├── planning/
│   │   ├── TRELLO_IMPORT_90_HARI.csv
│   │   └── TRELLO_IMPORT_README.md
│   ├── reports/
│   │   └── REPORT_PENGEMBANGAN_CODE_HEALTH_SECURITY.md
│   └── reference/
│       └── Proposal Ignition 2025.docx.pdf
│
├── 📁 local_data/               # 🧪 Data runtime lokal (tidak untuk production)
│   └── azurite/
│       ├── .gitkeep
│       ├── __azurite_db_queue__.json
│       ├── __azurite_db_queue_extent__.json
│       └── __queuestorage__/
│
├── 📁 ml_models/                # 🤖 Machine Learning Models
│   ├── README.md                # ML documentation
│   ├── train_model.py           # Energy forecast training
│   ├── train_ac_recommendation.py # AC recommendation training
│   ├── auto_train.py            # Auto-training system
│   ├── prediction_api.py        # ML API server
│   └── models/                  # Trained models (.pkl)
│
├── 📁 scripts/                  # 🛠️ Utility Scripts
│   ├── README.md                # Scripts documentation
│   ├── generate_sample_data.js  # Generate test data
│   ├── check_storage_data.js    # Check Azure Storage
│   └── export_sensor_data.js    # Export data to CSV
│
├── 📁 sensor iot/               # 📡 IoT Hardware & Azure
│   ├── README.md                # IoT documentation
│   ├── platformio.ini           # ESP32 configuration
│   ├── src/main.cpp             # ESP32 firmware
│   │
│   ├── raspberry-pi/            # Raspberry Pi people counter
│   │   ├── README.md
│   │   └── people_counter_yolo.py
│   │
│   └── azure-setup/             # Azure Functions
│       ├── README.md
│       └── azure-function/
│           ├── IoTHubToStorage/
│           ├── GetTelemetryData/
│           └── GetACRecommendation/
│
└── 📁 view_virtual/             # 🖥️ Vue.js Dashboard
    ├── README.md                # Frontend documentation
    ├── package.json
   ├── config/
   │   └── vercel.vite.json     # Referensi config Vercel untuk Vite
    ├── src/
    │   ├── App.vue
    │   ├── components/          # Vue components
    │   └── composables/         # Vue composables
    └── public/models/           # 3D model files
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ & npm
- **Python** 3.8+ & pip
- **PlatformIO** (untuk ESP32)
- **Azure Account** (untuk cloud services)

### 1. Clone Repository

```bash
git clone https://github.com/your-username/dashboard_digitaltwin.git
cd dashboard_digitaltwin
```

### 2. Setup Dashboard Frontend

```bash
cd view_virtual
npm install
cp env.example.txt .env
# Edit .env dengan kredensial Anda
npm run dev
```

Dashboard tersedia di http://localhost:3000

### 3. Setup ML Models (Optional)

```bash
cd ml_models
pip install -r requirements.txt
python train_model.py
python train_ac_recommendation.py
```

### 4. Setup ESP32 (Jika punya hardware)

```bash
cd "sensor iot"
# Edit src/main.cpp dengan WiFi & Azure credentials
platformio run --target upload
```

### 5. Setup Azure Functions

```bash
cd "sensor iot/azure-setup/azure-function"
npm install
func start  # Local testing
```

## 📖 Dokumentasi per Modul

| Folder | Deskripsi | README |
|--------|-----------|--------|
| `/ml_models` | Machine Learning models untuk prediksi | [README](ml_models/README.md) |
| `/scripts` | Utility scripts untuk data management | [README](scripts/README.md) |
| `/sensor iot` | ESP32 firmware & Raspberry Pi | [README](sensor%20iot/README.md) |
| `/view_virtual` | Vue.js Dashboard frontend | [README](view_virtual/README.md) |
| `/local_data` | Data runtime lokal (Azurite, cache, output sementara) | [README](local_data/README.md) |
| `/docs/planning` | Roadmap dan Trello import file | [README](docs/planning/TRELLO_IMPORT_README.md) |
| `/docs/reports` | Laporan audit pengembangan | [Report](docs/reports/REPORT_PENGEMBANGAN_CODE_HEALTH_SECURITY.md) |
| `/.github` | CI/CD Pipeline configuration | [README](.github/README.md) |

## ⚙️ Konfigurasi

### Environment Variables

#### Dashboard (.env di view_virtual/)
```env
VITE_MQTT_BROKER_URL=wss://xxxxx.hivemq.cloud:8884/mqtt
VITE_MQTT_USERNAME=digitaltwin
VITE_MQTT_PASSWORD=your_password
VITE_API_BASE_URL=https://your-function.azurewebsites.net/api
VITE_DEMO_MODE=false
```

#### Azure Functions (local.settings.json)
```json
{
  "Values": {
    "STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;...",
    "IOT_HUB_CONNECTION_STRING": "HostName=...;SharedAccessKeyName=...;SharedAccessKey=..."
  }
}
```

#### ESP32 (src/main.cpp)
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* iotHubName = "your-iothub-name";
const char* deviceId = "ESP32_ENERGY_MONITOR_001";
const char* deviceKey = "YOUR_DEVICE_PRIMARY_KEY";
```

## 🔧 Hardware Setup

### Bill of Materials

| Component | Quantity | Purpose |
|-----------|----------|---------|
| ESP32 DevKit | 1 | Main microcontroller |
| DHT11 | 1 | Temperature & humidity sensor |
| ZMPT101B | 1 | AC voltage sensor |
| SCT013-000 | 1 | AC current sensor (100A) |
| Raspberry Pi 3/4/5 | 1 | People detection |
| USB Webcam | 1 | Camera for YOLO |
| Resistors, wires | - | Connections |

### Wiring Diagram

```
ESP32 Connections:
┌──────────────────┐
│      ESP32       │
│                  │
│  GPIO 4  ◄── DHT11 Data
│  GPIO 35 ◄── ZMPT101B Vout
│  GPIO 32 ◄── SCT013 (via 1kΩ burden)
│  3.3V    ──► DHT11 VCC
│  GND     ──► Common Ground
└──────────────────┘
```

## ☁️ Azure Services

### Required Azure Resources

1. **Azure IoT Hub** (F1 Free tier)
   - Device: `ESP32_ENERGY_MONITOR_001`
   
2. **Azure Storage Account**
   - Table: `SensorTelemetry`
   
3. **Azure Function App** (Consumption plan)
   - Functions: IoTHubToStorage, GetTelemetryData, GetACRecommendation

### Deployment

```bash
# Deploy Azure Functions
cd "sensor iot/azure-setup/azure-function"
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

## 📊 Data Flow

### Sensor Data (ESP32)

```
ESP32 → WiFi → Azure IoT Hub → Event Hub Trigger → Azure Function → Storage Table → API → Dashboard
```

### People Count (Raspberry Pi)

```
Webcam → YOLO Detection → MQTT Publish → HiveMQ Cloud → Dashboard (direct) + Storage
```

### ML Prediction

```
Dashboard Request → Azure Function (GetACRecommendation) → ML Logic → Response
```

## 🧪 Testing

### Frontend Tests

```bash
cd view_virtual
npm test              # Run tests
npm run test:coverage # With coverage
```

### Azure Functions (Local)

```bash
cd "sensor iot/azure-setup/azure-function"
func start

# Test endpoints
curl http://localhost:7071/api/GetTelemetryData/latest
```

### ML Model Testing

```bash
cd ml_models
python predict.py
python predict_ac_recommendation.py
```

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd view_virtual
vercel --prod
```

### Azure Functions

```bash
func azure functionapp publish FUNCTION_APP_NAME
```

### CI/CD (GitHub Actions / Azure Pipelines)

CI/CD otomatis akan:
1. Build frontend
2. Run tests
3. Security audit
4. Deploy ke Vercel & Azure

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Changelog

### v1.0.0 (2026-01-18)
- Initial release
- ESP32 sensor integration
- Raspberry Pi people counter
- Azure Functions backend
- Vue.js dashboard with 3D visualization
- ML-based AC recommendations

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/)
- [Babylon.js](https://www.babylonjs.com/)
- [Azure IoT Hub](https://azure.microsoft.com/services/iot-hub/)
- [YOLO](https://pjreddie.com/darknet/yolo/)
- [HiveMQ](https://www.hivemq.com/)

---

⭐ Jika project ini membantu, berikan star di repository!

📧 Ada pertanyaan? Buat issue atau hubungi via email.
