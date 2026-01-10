<template>
  <div class="ac-recommendation" :class="{ 'dark': isDarkMode }">
    <div class="section-header" @click="isExpanded = !isExpanded">
      <h2>❄️ AC Temperature Recommendation</h2>
      <button class="toggle-btn">
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>

    <div v-if="isExpanded" class="section-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Menganalisis data sensor...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>❌ {{ error }}</p>
        <button @click="fetchRecommendation" class="retry-btn">Coba Lagi</button>
      </div>

      <!-- Recommendation Display -->
      <div v-else-if="recommendation" class="recommendation-container">
        <!-- Main Recommendation Card -->
        <div class="main-card">
          <div class="recommendation-value">
            <span class="emoji">{{ recommendation.emoji }}</span>
            <div class="temp-display">
              <span class="temp-number">{{ recommendation.recommendedTemp }}</span>
              <span class="temp-unit">°C</span>
            </div>
          </div>

          <div class="recommendation-info">
            <p class="comfort-level">{{ recommendation.comfortLevel }}</p>
            <p class="reason">{{ recommendation.reason }}</p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="action-buttons">
            <button 
              class="action-btn decrease" 
              @click="adjustTemp(-1)"
              title="Decrease 1°C"
            >
              ❄️ Lebih Dingin
            </button>
            <button 
              class="action-btn apply" 
              @click="applyRecommendation"
              title="Apply recommended temperature"
            >
              ✓ Terapkan
            </button>
            <button 
              class="action-btn increase" 
              @click="adjustTemp(1)"
              title="Increase 1°C"
            >
              🔥 Lebih Hangat
            </button>
          </div>
        </div>

        <!-- Energy Saving Info -->
        <div class="energy-saving-card">
          <h3>⚡ Penghematan Energi</h3>
          <div class="saving-content">
            <div class="saving-item">
              <span class="label">Perkiraan Hemat:</span>
              <span class="value">{{ recommendation.energySavingPercent }}%</span>
            </div>
            <div class="saving-bar">
              <div 
                class="saving-fill" 
                :style="{ width: recommendation.energySavingPercent + '%' }"
              ></div>
            </div>
            <p class="saving-info">
              Mengatur AC ke {{ recommendation.recommendedTemp }}°C dapat menghemat hingga 
              {{ recommendation.energySavingPercent }}% energi dibanding setting standar 24°C
            </p>
          </div>
        </div>

        <!-- Sensor Data & Factors -->
        <div class="factors-card">
          <h3>📊 Data Sensor & Faktor</h3>
          <div class="factors-grid">
            <div class="factor-item">
              <span class="factor-icon">🌡️</span>
              <span class="factor-label">Suhu Ruangan</span>
              <span class="factor-value">{{ recommendation.factors.ambient_temp }}°C</span>
            </div>
            <div class="factor-item">
              <span class="factor-icon">💧</span>
              <span class="factor-label">Kelembaban</span>
              <span class="factor-value">{{ recommendation.factors.humidity }}%</span>
            </div>
            <div class="factor-item">
              <span class="factor-icon">👥</span>
              <span class="factor-label">Jumlah Orang</span>
              <span class="factor-value">{{ recommendation.factors.people_count }}</span>
            </div>
            <div class="factor-item">
              <span class="factor-icon">⚡</span>
              <span class="factor-label">Power</span>
              <span class="factor-value">{{ recommendation.factors.power_consumption }} kW</span>
            </div>
            <div class="factor-item">
              <span class="factor-icon">🕐</span>
              <span class="factor-label">Jam</span>
              <span class="factor-value">{{ String(recommendation.factors.current_hour).padStart(2, '0') }}:00</span>
            </div>
            <div class="factor-item">
              <span class="factor-icon">🎯</span>
              <span class="factor-label">Akurasi Model</span>
              <span class="factor-value">{{ Math.round(recommendation.confidence * 100) }}%</span>
            </div>
          </div>
        </div>

        <!-- Refresh Info -->
        <div class="refresh-info">
          <p>Terakhir diupdate: {{ lastUpdateTime }}</p>
          <button @click="fetchRecommendation" class="refresh-btn">🔄 Refresh Sekarang</button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <p>Tidak ada data rekomendasi</p>
        <button @click="fetchRecommendation" class="fetch-btn">Ambil Rekomendasi</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useAPI } from '../composables/useAPI';

export default {
  name: 'ACRecommendation',
  setup() {
    const { fetchData } = useAPI();

    return {
      fetchData
    };
  },
  data() {
    return {
      recommendation: null,
      isLoading: false,
      isExpanded: true,
      error: null,
      lastUpdateTime: null,
      isDarkMode: false,
      refreshInterval: null
    };
  },
  computed: {
    adjustedTemp() {
      return this.recommendation?.recommendedTemp || 24;
    }
  },
  mounted() {
    this.fetchRecommendation();
    // Auto refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.fetchRecommendation();
    }, 5 * 60 * 1000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async fetchRecommendation() {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await this.fetchData(
          '/api/ac-recommendation/latest-with-recommendation',
          {
            method: 'POST',
            body: JSON.stringify({})
          }
        );

        if (response.success) {
          this.recommendation = response.data.recommendation;
          this.updateLastUpdateTime();
        } else {
          this.error = response.error || 'Failed to fetch recommendation';
        }
      } catch (err) {
        this.error = `Error: ${err.message || 'Failed to fetch data'}`;
        console.error('AC Recommendation error:', err);
      } finally {
        this.isLoading = false;
      }
    },
    adjustTemp(delta) {
      const currentTemp = this.recommendation.recommendedTemp;
      const newTemp = Math.max(20, Math.min(28, currentTemp + delta));
      
      this.$emit('temp-adjusted', {
        original: currentTemp,
        adjusted: newTemp
      });
    },
    applyRecommendation() {
      this.$emit('apply-recommendation', {
        temperature: this.recommendation.recommendedTemp,
        comfortLevel: this.recommendation.comfortLevel
      });
      
      // Show confirmation
      alert(`AC temperature set to ${this.recommendation.recommendedTemp}°C (${this.recommendation.comfortLevel})`);
    },
    updateLastUpdateTime() {
      const now = new Date();
      this.lastUpdateTime = now.toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }
};
</script>

<style scoped>
.ac-recommendation {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.ac-recommendation.dark {
  background: #1e1e1e;
  color: #fff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0 0 15px 0;
  border-bottom: 2px solid #f0f0f0;
}

.ac-recommendation.dark .section-header {
  border-bottom-color: #333;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  color: inherit;
}

.section-content {
  padding-top: 20px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 1em;
  color: #666;
}

/* Error State */
.error-state {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.ac-recommendation.dark .error-state {
  background: #3c2a2a;
  border-color: #663333;
}

.retry-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 15px;
  font-size: 0.95em;
}

.retry-btn:hover {
  background: #ff5252;
}

/* Recommendation Container */
.recommendation-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Main Recommendation Card */
.main-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
}

.ac-recommendation.dark .main-card {
  background: linear-gradient(135deg, #1a365d 0%, #2d1b69 100%);
}

.recommendation-value {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.emoji {
  font-size: 4em;
}

.temp-display {
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.temp-number {
  font-size: 3em;
  font-weight: bold;
}

.temp-unit {
  font-size: 1.5em;
  margin-top: 10px;
}

.recommendation-info {
  margin-bottom: 25px;
}

.comfort-level {
  font-size: 1.3em;
  font-weight: 600;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.reason {
  font-size: 0.95em;
  margin: 0;
  opacity: 0.9;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.action-btn {
  padding: 10px 16px;
  border: 2px solid white;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 600;
  transition: all 0.3s ease;
  flex: 1;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.action-btn.apply {
  background: white;
  color: #667eea;
  font-weight: 700;
}

.action-btn.apply:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
}

/* Energy Saving Card */
.energy-saving-card {
  background: #f9f9f9;
  border-left: 4px solid #4caf50;
  border-radius: 8px;
  padding: 20px;
}

.ac-recommendation.dark .energy-saving-card {
  background: #2a2a2a;
  border-left-color: #66bb6a;
}

.energy-saving-card h3 {
  margin: 0 0 15px 0;
  font-size: 1.1em;
}

.saving-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.saving-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.saving-item .label {
  font-weight: 500;
}

.saving-item .value {
  font-size: 1.3em;
  font-weight: 700;
  color: #4caf50;
}

.saving-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.ac-recommendation.dark .saving-bar {
  background: #404040;
}

.saving-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #45a049);
  transition: width 0.3s ease;
}

.saving-info {
  font-size: 0.9em;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.ac-recommendation.dark .saving-info {
  color: #aaa;
}

/* Factors Card */
.factors-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
}

.ac-recommendation.dark .factors-card {
  background: #2a2a2a;
}

.factors-card h3 {
  margin: 0 0 15px 0;
  font-size: 1.1em;
}

.factors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.factor-item {
  background: white;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #e0e0e0;
}

.ac-recommendation.dark .factor-item {
  background: #1a1a1a;
  border-color: #404040;
}

.factor-icon {
  font-size: 1.8em;
}

.factor-label {
  font-size: 0.85em;
  color: #666;
  font-weight: 500;
}

.ac-recommendation.dark .factor-label {
  color: #aaa;
}

.factor-value {
  font-size: 1.3em;
  font-weight: 700;
  color: #667eea;
}

/* Refresh Info */
.refresh-info {
  text-align: center;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ac-recommendation.dark .refresh-info {
  border-top-color: #404040;
}

.refresh-info p {
  margin: 0;
  font-size: 0.9em;
  color: #666;
}

.ac-recommendation.dark .refresh-info p {
  color: #aaa;
}

.refresh-btn {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #1976d2;
  transform: rotate(180deg);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.ac-recommendation.dark .empty-state {
  color: #aaa;
}

.fetch-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 15px;
  font-size: 0.95em;
}

.fetch-btn:hover {
  background: #5568d3;
}

/* Responsive */
@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }

  .factors-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .recommendation-value {
    flex-direction: column;
  }

  .refresh-info {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
