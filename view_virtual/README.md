# 🏢 Digital Twin Dashboard

Dashboard interaktif untuk visualisasi Digital Twin menggunakan Vue.js dan Three.js.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## ✨ Fitur

- **Visualisasi 3D Digital Twin** - Model 3D ruangan dengan sensor dan indikator real-time
- **Data Real-time via MQTT** - Koneksi langsung ke MQTT Broker untuk data sensor
- **Grafik Data Historis** - Visualisasi data suhu, listrik, dan jumlah orang
- **Status Sensor** - Monitoring status semua sensor secara real-time
- **Responsive Design** - Tampilan optimal di desktop dan mobile

## 📦 Teknologi

- **Vue.js 3** - Framework frontend
- **Three.js** - Library 3D visualization
- **Chart.js** - Library untuk grafik
- **MQTT.js** - Client MQTT untuk real-time data
- **Axios** - HTTP client untuk REST API
- **Vite** - Build tool

## 🔧 Konfigurasi

1. Copy file environment:
```bash
cp env.example.txt .env
```

2. Edit file `.env` dan isi konfigurasi MQTT dan API:
```
VITE_MQTT_BROKER_URL=wss://your-broker.hivemq.cloud:8884/mqtt
VITE_MQTT_USERNAME=your-username
VITE_MQTT_PASSWORD=your-password
VITE_API_BASE_URL=http://localhost:3000/api
```

## 📁 Struktur Proyek

```
dashboard_digitaltwin/
├── src/
│   ├── components/          # Komponen Vue
│   │   ├── DigitalTwin3D.vue
│   │   ├── SensorStatus.vue
│   │   ├── TemperatureChart.vue
│   │   ├── ElectricityChart.vue
│   │   ├── PeopleChart.vue
│   │   └── DataTable.vue
│   ├── composables/         # Composables Vue
│   │   ├── useMQTT.js
│   │   └── useAPI.js
│   ├── App.vue              # Komponen utama
│   ├── main.js              # Entry point
│   └── style.css            # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## 🚀 Deploy

Lihat [DEPLOY.md](./DEPLOY.md) untuk panduan lengkap deployment ke Vercel.

## 📝 Catatan

- Dashboard menggunakan dummy data jika API belum tersedia
- Pastikan kredensial MQTT sudah benar untuk koneksi real-time
- Visualisasi 3D memerlukan browser yang mendukung WebGL
