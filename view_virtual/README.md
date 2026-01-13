# Digital Twin Dashboard

## Overview

Dashboard interaktif untuk visualisasi Digital Twin menggunakan Vue.js dan Three.js/Babylon.js.

## Tech Stack

- Vue.js 3: Framework frontend
- Three.js/Babylon.js: 3D visualization
- Chart.js: Grafik data
- MQTT.js: Real-time data via MQTT
- Axios: HTTP client
- Vite: Build tool
- Vitest: Unit testing

## Instalasi

```bash
npm install
```

## Development

```bash
npm run dev
```

Server berjalan di http://localhost:3000

## Build Production

```bash
npm run build
```

Output di folder dist/

## Konfigurasi

### Environment Variables

Copy env.example.txt ke .env:

```bash
cp env.example.txt .env
```

Edit .env:

```
VITE_MQTT_BROKER_URL=wss://[broker].hivemq.cloud:8884/mqtt
VITE_MQTT_USERNAME=[username]
VITE_MQTT_PASSWORD=[password]
VITE_API_BASE_URL=https://[function-app].azurewebsites.net/api
VITE_DEMO_MODE=false
```

### Demo Mode

Set VITE_DEMO_MODE=true untuk menggunakan dummy data tanpa koneksi ke backend.

## Struktur Folder

```
view_virtual/
├── src/
│   ├── components/
│   │   ├── DigitalTwin3D.vue      # Visualisasi 3D
│   │   ├── SensorStatus.vue       # Status sensor
│   │   ├── TemperatureChart.vue   # Grafik suhu
│   │   ├── ElectricityChart.vue   # Grafik listrik
│   │   ├── PeopleChart.vue        # Grafik jumlah orang
│   │   ├── ACRecommendation.vue   # Rekomendasi AC
│   │   ├── CameraStream.vue       # Video dari Raspberry Pi
│   │   └── DataTable.vue          # Tabel data historis
│   ├── composables/
│   │   ├── useMQTT.js             # MQTT connection
│   │   └── useAPI.js              # API calls
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── public/
│   └── models/                    # 3D model files
├── index.html
├── package.json
├── vite.config.js
└── vitest.config.js
```

## Fitur

- Visualisasi 3D Digital Twin dengan indikator sensor realtime
- Data realtime via MQTT (suhu, kelembaban, listrik)
- Grafik historis (24 jam terakhir)
- Status semua sensor
- Video stream dari Raspberry Pi
- Rekomendasi AC berdasarkan kondisi ruangan
- Responsive design

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests dengan Coverage

```bash
npm run test:coverage
```

### Run Tests Watch Mode

```bash
npm run test:watch
```

### Test Manual di Browser

1. Jalankan development server:
```bash
npm run dev
```

2. Buka http://localhost:3000

3. Verifikasi:
   - 3D model terload
   - Data sensor muncul (atau dummy data jika demo mode)
   - Grafik menampilkan data
   - Video stream tersambung (jika Raspberry Pi aktif)

## Deployment

### Deploy ke Vercel

1. Login ke Vercel:
```bash
vercel login
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables di Vercel dashboard.

### Deploy via Vercel Dashboard

1. Buka vercel.com
2. Import project dari GitHub
3. Set environment variables
4. Deploy

## Troubleshooting

### MQTT Connection Failed

Verifikasi credentials di .env. Pastikan broker URL menggunakan wss:// untuk WebSocket Secure.

### 3D Model Tidak Muncul

Pastikan file model ada di public/models/ atau URL Azure Blob Storage benar.

### Build Failed

Jalankan lint dan fix:
```bash
npm run lint -- --fix
```

### API Error

Verifikasi VITE_API_BASE_URL benar dan Azure Function berjalan.
