# 📱 Dashboard Integration Guide

## Langkah-langkah Menghubungkan Dashboard ke API Azure

### 1️⃣ Copy API Service ke Project Dashboard Kamu

Copy file `apiService.js` ke folder `src/services/` di project Vercel kamu:

```bash
# Di project dashboard kamu
mkdir -p src/services
# Copy apiService.js ke folder tersebut
```

### 2️⃣ Update Component Dashboard

Ada 2 cara:

#### Cara A: Ganti Component Existing
Replace component dashboard kamu yang sekarang dengan `DashboardComponent.vue`

#### Cara B: Update Component Existing (Recommended)
Tambahkan code berikut ke component dashboard yang sudah ada:

```javascript
// Di bagian <script setup> atau methods
import apiService from '@/services/apiService';

// Data reactive
const latestData = ref({
  suhu: 0,
  kelembaban: 0,
  tegangan: 0,
  arus: 0,
  daya: 0
});

const historyData24h = ref([]);
const historyData7d = ref([]);

// Fetch data functions
async function fetchLatestData() {
  try {
    const data = await apiService.getLatest();
    latestData.value = data;
    console.log('Latest data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function fetchHistoryData() {
  try {
    // 24 hours for temperature chart
    const data24h = await apiService.getHistory(24, 288);
    historyData24h.value = data24h;
    
    // 7 days for power chart
    const data7d = await apiService.getHistory(168, 500);
    historyData7d.value = data7d;
    
    updateCharts(); // Update your chart library
  } catch (error) {
    console.error('Error:', error);
  }
}

// Auto-update every 5 seconds
onMounted(() => {
  fetchLatestData();
  fetchHistoryData();
  
  setInterval(fetchLatestData, 5000); // Update real-time data
  setInterval(fetchHistoryData, 30000); // Update charts every 30s
});
```

### 3️⃣ Update Chart Data Binding

Untuk chart Suhu (24 Jam):
```javascript
// Contoh untuk Chart.js
const updateTempChart = () => {
  const labels = historyData24h.value.map(d => {
    const time = new Date(d.timestamp);
    return time.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }).reverse();
  
  const temps = historyData24h.value.map(d => d.suhu).reverse();
  
  // Update chart dengan data baru
  yourChart.data.labels = labels;
  yourChart.data.datasets[0].data = temps;
  yourChart.update();
};
```

Untuk chart Konsumsi Listrik (7 Hari):
```javascript
const updatePowerChart = () => {
  // Group by day
  const dailyPower = {};
  historyData7d.value.forEach(d => {
    const day = d.timestamp.split('T')[0];
    dailyPower[day] = (dailyPower[day] || 0) + d.daya;
  });
  
  const labels = Object.keys(dailyPower).sort();
  const powers = labels.map(day => dailyPower[day] / 1000); // to kWh
  
  // Update chart
  yourPowerChart.data.labels = labels;
  yourPowerChart.data.datasets[0].data = powers;
  yourPowerChart.update();
};
```

### 4️⃣ Remove MQTT Connection (Opsional)

Kalau dashboard kamu masih punya code MQTT connection, kamu bisa remove atau comment:

```javascript
// REMOVE atau COMMENT ini:
// const mqttClient = mqtt.connect('...');
// mqttClient.on('message', ...);

// GANTI dengan:
// Sudah tidak perlu MQTT, karena data dari API
```

### 5️⃣ Test di Local

```bash
cd your-dashboard-project
npm install  # atau yarn install
npm run dev  # atau yarn dev
```

Buka browser ke `http://localhost:3000` (atau port yang kamu pakai)

### 6️⃣ Deploy ke Vercel

```bash
# Commit changes
git add .
git commit -m "Connect dashboard to Azure API"
git push origin main

# Vercel akan auto-deploy, atau manual:
vercel --prod
```

## 🧪 Testing API Connection

Sebelum deploy, test dulu API-nya work:

```javascript
// Test di browser console
fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/latest')
  .then(r => r.json())
  .then(d => console.log('Latest:', d));

fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/history?hours=24')
  .then(r => r.json())
  .then(d => console.log('History:', d));
```

## 📊 Data Format dari API

```javascript
// Latest data structure
{
  "success": true,
  "data": {
    "timestamp": "2025-11-19T08:00:39.4245115Z",
    "suhu": 31.3,
    "kelembaban": 69,
    "tegangan": 0,
    "arus": 0,
    "daya": 0
  }
}

// History data structure
{
  "success": true,
  "count": 288,
  "hours": 24,
  "data": [
    {
      "timestamp": "2025-11-19T08:00:39Z",
      "suhu": 31.3,
      "kelembaban": 69,
      "tegangan": 0,
      "arus": 0,
      "daya": 0
    },
    // ... more records
  ]
}
```

## ⚠️ Troubleshooting

**Dashboard tidak muncul data:**
1. Check console browser (F12) untuk error
2. Verify API URL benar: `https://func-energymonitor-c9001a7e.azurewebsites.net/api`
3. Test API manual di browser
4. Check CORS - API sudah enable CORS untuk semua origin

**Chart tidak update:**
1. Check interval masih running
2. Verify data format dari API
3. Check chart library initialization

**ESP32 mati tapi dashboard tetap ada data:**
✅ Ini normal! Data historis tetap ada di Azure Storage

## 🎯 Recommended Update Intervals

- **Latest data (real-time)**: 5 detik
- **Chart 24 jam**: 30 detik - 1 menit
- **Chart 7 hari**: 5 menit
- **Statistics**: 10 menit

## 📞 Need Help?

Kalau ada issue, check:
1. Browser console untuk error messages
2. Network tab untuk API responses
3. Verify ESP32 masih kirim data (check Azure Storage)

---

**Next Steps:**
1. Copy `apiService.js` ke project dashboard
2. Update component untuk pakai `apiService`
3. Remove MQTT connection code
4. Test di local
5. Deploy ke Vercel
