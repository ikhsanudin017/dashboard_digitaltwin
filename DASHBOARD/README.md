# dashboard_digitaltwin

# 🏢 Digital Twin Dashboard

Dashboard interaktif untuk visualisasi Digital Twin menggunakan Vue.js dan Three.js.

## ✨ Fitur

- **Visualisasi 3D Digital Twin** - Model 3D ruangan dengan sensor dan indikator real-time
- **Data Real-time via MQTT** - Koneksi langsung ke MQTT Broker untuk data sensor
- **Grafik Data Historis** - Visualisasi data suhu, listrik, dan jumlah orang
- **Status Sensor** - Monitoring status semua sensor secara real-time
- **Responsive Design** - Tampilan optimal di desktop dan mobile

## 🚀 Instalasi

1. Install dependencies:
```bash
npm install
```

2. Copy file environment:
```bash
cp .env.example .env
```

3. Edit file `.env` dan isi konfigurasi MQTT dan API:
```
VITE_MQTT_BROKER_URL=wss://your-broker.hivemq.cloud:8884/mqtt
VITE_MQTT_USERNAME=your-username
VITE_MQTT_PASSWORD=your-password
VITE_API_BASE_URL=http://localhost:3000/api
```

4. Jalankan development server:
```bash
npm run dev
```

5. Build untuk production:
```bash
npm run build
```

## 📦 Teknologi

- **Vue.js 3** - Framework frontend
- **Three.js** - Library 3D visualization
- **Chart.js** - Library untuk grafik
- **MQTT.js** - Client MQTT untuk real-time data
- **Axios** - HTTP client untuk REST API
- **Vite** - Build tool

## 🏗️ Arsitektur

Dashboard terhubung ke:
- **MQTT Broker** - Untuk data real-time (suhu, listrik, jumlah orang)
- **REST API** - Untuk data historis (24 jam suhu, 7 hari listrik)

## 📡 Topik MQTT

- `gedung/lantai1/suhu` - Data suhu dan kelembaban
- `gedung/lantai1/listrik` - Data tegangan, arus, dan daya
- `gedung/lantai1/orang` - Data jumlah orang

## 🔌 REST API Endpoints

- `GET /api/data/suhu/24jam` - Data suhu 24 jam terakhir
- `GET /api/data/listrik/7hari` - Data listrik 7 hari terakhir
- `GET /api/data/orang/realtime` - Data jumlah orang real-time

## 📁 Struktur Proyek

```
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

## 🎯 Penggunaan

1. Pastikan MQTT Broker sudah dikonfigurasi dan berjalan
2. Pastikan REST API backend sudah tersedia
3. Buka dashboard di browser
4. Dashboard akan otomatis terhubung ke MQTT dan menampilkan data real-time
5. Gunakan kontrol di visualisasi 3D untuk mengubah sudut pandang

## 📝 Catatan

- Dashboard menggunakan dummy data jika API belum tersedia
- Pastikan kredensial MQTT sudah benar untuk koneksi real-time
- Visualisasi 3D memerlukan browser yang mendukung WebGL


