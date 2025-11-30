<!-- ============================================ -->
<!-- 🎯 Vue.js Component Example                -->
<!-- ============================================ -->
<!-- File: src/components/DashboardMain.vue -->

<template>
  <div class="dashboard">
    <div class="header">
      <h1>Digital Twin Dashboard</h1>
      <div :class="['status', isConnected ? 'connected' : 'disconnected']">
        {{ isConnected ? '🟢 API Terhubung' : '🔴 API Terputus' }}
      </div>
      <div class="last-update">{{ lastUpdateTime }}</div>
    </div>

    <!-- Real-time Data Cards -->
    <div class="data-cards">
      <div class="card">
        <h3>🌡️ Suhu</h3>
        <div class="value">{{ latestData.suhu || '--' }}°C</div>
      </div>
      <div class="card">
        <h3>💧 Kelembaban</h3>
        <div class="value">{{ latestData.kelembaban || '--' }}%</div>
      </div>
      <div class="card">
        <h3>⚡ Tegangan</h3>
        <div class="value">{{ latestData.tegangan || '--' }}V</div>
      </div>
      <div class="card">
        <h3>💡 Daya</h3>
        <div class="value">{{ latestData.daya || '--' }}W</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <div class="chart-container">
        <h2>🌡️ Suhu (24 Jam)</h2>
        <canvas ref="tempChart"></canvas>
      </div>
      
      <div class="chart-container">
        <h2>⚡ Konsumsi Listrik (7 Hari)</h2>
        <canvas ref="powerChart"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import apiService from '../services/apiService';
import Chart from 'chart.js/auto';

export default {
  name: 'DashboardMain',
  setup() {
    const latestData = ref({});
    const historyData = ref([]);
    const isConnected = ref(false);
    const lastUpdateTime = ref('--:--:--');
    
    let updateInterval = null;
    let tempChart = null;
    let powerChart = null;

    // Fetch latest data
    const fetchLatestData = async () => {
      try {
        const data = await apiService.getLatest();
        latestData.value = data;
        isConnected.value = true;
        
        // Update timestamp
        const time = new Date(data.timestamp);
        lastUpdateTime.value = time.toLocaleTimeString('id-ID');
      } catch (error) {
        console.error('Failed to fetch latest:', error);
        isConnected.value = false;
      }
    };

    // Fetch 24-hour temperature history
    const fetch24HourData = async () => {
      try {
        const data = await apiService.getHistory(24, 288); // 288 = 24h with 5min intervals
        historyData.value = data;
        updateTempChart(data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };

    // Fetch 7-day power consumption
    const fetch7DayPower = async () => {
      try {
        const data = await apiService.getHistory(168, 500); // 168h = 7 days
        updatePowerChart(data);
      } catch (error) {
        console.error('Failed to fetch power data:', error);
      }
    };

    // Update temperature chart
    const updateTempChart = (data) => {
      if (!tempChart) return;

      const labels = data.map(d => {
        const time = new Date(d.timestamp);
        return time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }).reverse();

      const temps = data.map(d => d.suhu).reverse();

      tempChart.data.labels = labels;
      tempChart.data.datasets[0].data = temps;
      tempChart.update();
    };

    // Update power chart
    const updatePowerChart = (data) => {
      if (!powerChart) return;

      // Group by day and sum power
      const dailyPower = {};
      data.forEach(d => {
        const day = d.timestamp.split('T')[0];
        dailyPower[day] = (dailyPower[day] || 0) + d.daya;
      });

      const labels = Object.keys(dailyPower).sort();
      const powers = labels.map(day => dailyPower[day] / 1000); // Convert to kWh

      powerChart.data.labels = labels.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      });
      powerChart.data.datasets[0].data = powers;
      powerChart.update();
    };

    // Initialize charts
    const initCharts = () => {
      // Temperature chart
      const tempCtx = document.querySelector('canvas[ref="tempChart"]');
      if (tempCtx) {
        tempChart = new Chart(tempCtx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [{
              label: 'Suhu (°C)',
              data: [],
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true }
            }
          }
        });
      }

      // Power chart
      const powerCtx = document.querySelector('canvas[ref="powerChart"]');
      if (powerCtx) {
        powerChart = new Chart(powerCtx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [{
              label: 'Konsumsi Listrik (kWh)',
              data: [],
              backgroundColor: 'rgba(54, 162, 235, 0.8)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true }
            }
          }
        });
      }
    };

    onMounted(() => {
      // Initial fetch
      fetchLatestData();
      fetch24HourData();
      fetch7DayPower();

      // Initialize charts after a short delay
      setTimeout(initCharts, 100);

      // Update latest data every 5 seconds
      updateInterval = setInterval(() => {
        fetchLatestData();
      }, 5000);

      // Update charts every 30 seconds
      setInterval(() => {
        fetch24HourData();
        fetch7DayPower();
      }, 30000);
    });

    onUnmounted(() => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      if (tempChart) tempChart.destroy();
      if (powerChart) powerChart.destroy();
    });

    return {
      latestData,
      isConnected,
      lastUpdateTime
    };
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.status {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
}

.status.connected {
  background-color: #4caf50;
  color: white;
}

.status.disconnected {
  background-color: #f44336;
  color: white;
}

.data-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.card h3 {
  margin: 0 0 10px 0;
  color: #666;
}

.card .value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
}

.chart-container {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-container h2 {
  margin-top: 0;
  color: #333;
}
</style>
