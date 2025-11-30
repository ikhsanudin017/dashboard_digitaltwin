# Dashboard API Integration Guide

## 📡 API Endpoints

Base URL: `https://func-energymonitor-c9001a7e.azurewebsites.net/api`

### 1. Get Latest Telemetry
```
GET /telemetry/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-11-19T07:30:39.0943854Z",
    "suhu": 31.3,
    "kelembaban": 70,
    "tegangan": 0,
    "arus": 0,
    "daya": 0
  }
}
```

### 2. Get Historical Data
```
GET /telemetry/history?hours=24&limit=100
```

**Query Parameters:**
- `hours` (optional, default: 24) - Time range in hours
- `limit` (optional, default: 100) - Maximum number of records

**Response:**
```json
{
  "success": true,
  "count": 5,
  "hours": 1,
  "data": [
    {
      "timestamp": "2025-11-19T06:52:30.7842904Z",
      "suhu": 31.3,
      "kelembaban": 72,
      "tegangan": 0,
      "arus": 0,
      "daya": 0
    }
    // ... more records
  ]
}
```

### 3. Get Statistics
```
GET /telemetry/stats?hours=24
```

**Query Parameters:**
- `hours` (optional, default: 24) - Time range for statistics

**Response:**
```json
{
  "success": true,
  "hours": 24,
  "count": 346,
  "averages": {
    "suhu": 31.29,
    "kelembaban": 70.63,
    "tegangan": 0,
    "arus": 0,
    "daya": 0
  },
  "ranges": {
    "suhu": { "min": 30.8, "max": 31.3 },
    "daya": { "min": 0, "max": 0 }
  }
}
```

## 🔧 Integration Examples

### JavaScript/Fetch
```javascript
// Get latest data
async function getLatestData() {
  const response = await fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/latest');
  const data = await response.json();
  return data.data;
}

// Get 24 hour history
async function getHistory24h() {
  const response = await fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/history?hours=24&limit=288'); // Every 5 minutes for 24h
  const data = await response.json();
  return data.data;
}

// Get statistics
async function getStats() {
  const response = await fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/stats?hours=168'); // 7 days
  const data = await response.json();
  return data;
}
```

### Vue.js Integration
```vue
<template>
  <div>
    <h2>Temperature: {{ latestData.suhu }}°C</h2>
    <h2>Humidity: {{ latestData.kelembaban }}%</h2>
    <chart :data="historyData" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      latestData: {},
      historyData: []
    };
  },
  mounted() {
    this.fetchData();
    // Update every 5 seconds
    setInterval(this.fetchData, 5000);
  },
  methods: {
    async fetchData() {
      try {
        // Get latest
        const latest = await fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/latest');
        this.latestData = (await latest.json()).data;

        // Get history for charts
        const history = await fetch('https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/history?hours=24');
        this.historyData = (await history.json()).data;
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  }
};
</script>
```

## 📊 Dashboard Recommendations

### For Temperature Chart (24 Hours)
```javascript
const response = await fetch('/api/telemetry/history?hours=24&limit=288');
// 288 points = 24 hours * 60 minutes / 5 minute intervals
```

### For Power Consumption (7 Days)
```javascript
const response = await fetch('/api/telemetry/history?hours=168&limit=500');
// 168 hours = 7 days
// You may want to aggregate this data client-side for better visualization
```

### For Real-time Display
```javascript
const response = await fetch('/api/telemetry/latest');
// Call this every 5 seconds to match ESP32 publish rate
```

## 🚀 CORS Configuration

The API has CORS enabled for all origins (`*`), so you can call it directly from your Vercel dashboard without any issues.

## 📝 Data Schema

All telemetry records contain:
- `timestamp` (ISO 8601 string)
- `suhu` (temperature in °C)
- `kelembaban` (humidity in %)
- `tegangan` (voltage in V)
- `arus` (current in A)
- `daya` (power in W)

## 🔗 Next Steps for Dashboard Integration

1. Update your dashboard's API base URL to: `https://func-energymonitor-c9001a7e.azurewebsites.net/api`
2. Replace any MQTT direct connections with REST API calls
3. Use `/telemetry/history` for historical charts
4. Use `/telemetry/latest` for real-time displays
5. Use `/telemetry/stats` for aggregated statistics

## ✅ Testing

Test the API with curl:
```bash
# Latest data
curl "https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/latest"

# History
curl "https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/history?hours=1&limit=10"

# Statistics
curl "https://func-energymonitor-c9001a7e.azurewebsites.net/api/telemetry/stats?hours=24"
```

Or run the test script:
```bash
node bridge/test-api.js
```
 