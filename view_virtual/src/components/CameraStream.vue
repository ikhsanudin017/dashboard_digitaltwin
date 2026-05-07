<template>
  <div class="camera-section" :class="{ 'dark': isDarkMode }">
    <!-- Hero Banner -->
    <div class="hero-banner">
      <div class="hero-kicker">VISION SYSTEM</div>
      <h2>Camera Stream</h2>
      <p>Live monitoring dari Raspberry Pi dengan YOLO edge untuk people counting</p>
      <div class="hero-meta">
        <span class="meta-badge">Status: {{ isStreamActive ? 'LIVE' : 'OFFLINE' }}</span>
        <span class="meta-badge data-count">{{ peopleCount }} Orang Terdeteksi</span>
      </div>
    </div>

    <!-- Stream Container with Canvas Overlay -->
    <div class="stream-container">
      <!-- Loading Indicator -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Connecting to camera...</p>
      </div>

      <!-- Video + Canvas Overlay -->
      <div v-show="!streamError && !isLoading" class="video-wrapper">
        <img
          ref="videoImg"
          :src="videoFeedUrl"
          alt="Camera Stream"
          class="stream-image"
          crossorigin="anonymous"
          @load="handleLoad"
          @error="handleError"
        />
      </div>

      <!-- Error State -->
      <div v-if="streamError && !isLoading" class="stream-placeholder">
        <div class="placeholder-content">
          <p class="main-message">Camera Stream Unavailable</p>
          <p class="sub-message">{{ errorMessage }}</p>
          <button @click="refreshStream" class="camera-refresh-trigger">Coba Lagi</button>
        </div>
      </div>

      <!-- Stream Info Overlay -->
      <div v-if="!streamError && !isLoading" class="stream-overlay">
        <span>LIVE</span>
      </div>
    </div>

    <!-- Camera Info -->
    <div class="camera-info-section">
      <h3 class="section-title">Informasi Kamera</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">IP Address</span>
          <span class="info-value">{{ localCameraUrl }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Model</span>
          <span class="info-value">Raspberry Pi 4 + Webcam</span>
        </div>
        <div class="info-item">
          <span class="info-label">AI Model</span>
          <span class="info-value">Edge YOLOv8n</span>
        </div>
        <div class="info-item">
          <span class="info-label">Frame Rate</span>
          <span class="info-value">{{ isStreamActive ? '5 FPS' : 'N/A' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { CAMERA_STREAM_URL } from '../lib/appConfig'

const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['peopleCountUpdate'])

const localCameraUrl = ref(CAMERA_STREAM_URL || '')
const isLoading = ref(true)
const streamError = ref(false)
const errorMessage = ref('')
const isStreamActive = ref(false)
const peopleCount = ref(0)
const detections = ref([])

// Refs for DOM elements
const videoImg = ref(null)
const streamKey = ref(0)
let streamTimer = null
let pollTimer = null

const videoFeedUrl = computed(() => {
  return `${localCameraUrl.value}/frame?t=${streamKey.value}`
})

// Start refresh timer for image polling
const startStreamRefresh = () => {
  if (!streamTimer) {
    streamTimer = setInterval(() => {
      streamKey.value = Date.now()
    }, 500) // ~2 FPS (reduce network load)
  }
}

const stopStreamRefresh = () => {
  if (streamTimer) {
    clearInterval(streamTimer)
    streamTimer = null
  }
}

// Fetch detection data from Raspberry Pi
const fetchDetections = async () => {
  try {
    const response = await fetch(`${localCameraUrl.value}/count`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) return

    const data = await response.json()
    peopleCount.value = data.count || 0
    detections.value = data.detections || []
    emit('peopleCountUpdate', peopleCount.value)

  } catch (error) {
    // Silent fail
  }
}

const startPolling = () => {
  fetchDetections()
  if (!pollTimer) {
    pollTimer = setInterval(fetchDetections, 1000) // 1 second polling
  }
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const handleLoad = () => {
  isLoading.value = false
  streamError.value = false
  isStreamActive.value = true
  startPolling()
  startStreamRefresh()
}

const handleError = () => {
  isLoading.value = false
  streamError.value = true
  isStreamActive.value = false
  if (!localCameraUrl.value) {
    errorMessage.value = 'Camera URL belum dikonfigurasi'
  } else {
    errorMessage.value = 'Kamera tidak dapat diakses'
  }
  stopPolling()
  stopStreamRefresh()
}

onMounted(() => {
  // Initial load
  setTimeout(() => {
    streamKey.value = Date.now()
  }, 500)
})

onUnmounted(() => {
  stopPolling()
  stopStreamRefresh()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap');

.camera-section {
  --accent: #8b5cf6;
  --accent-dark: #7c3aed;
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-2: #475569;
  --text-3: #94a3b8;
  --success: #22c55e;
  --danger: #ef4444;

  font-family: 'IBM Plex Sans', sans-serif;
  padding: 24px;
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-banner { margin-bottom: 24px; }

.hero-kicker {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.hero-banner h2 {
  font-family: 'Sora', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px 0;
}

.hero-banner p {
  font-size: 0.95rem;
  color: var(--text-2);
  margin: 0 0 16px 0;
}

.hero-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-badge {
  display: inline-block;
  padding: 8px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--text-2);
}

.meta-badge.data-count {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
  color: var(--accent);
}

.section-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 16px 0;
}

.stream-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.stream-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  will-change: contents;
}

.stream-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 12px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stream-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px dashed var(--border);
}

.placeholder-content {
  text-align: center;
  padding: 20px;
}

.placeholder-content .main-message {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.placeholder-content .sub-message {
  font-size: 0.9rem;
  color: var(--text-2);
  margin: 0 0 20px 0;
}

.camera-refresh-trigger {
  padding: 12px 24px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.camera-refresh-trigger:hover {
  background: var(--accent-dark);
  transform: translateY(-2px);
}

.camera-info-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;
}

.info-label {
  font-size: 0.78rem;
  color: var(--text-3);
  font-weight: 500;
}

.info-value {
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 600;
}

.dark {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-2: #334155;
  --border: rgba(255, 255, 255, 0.1);
  --text: #f1f5f9;
  --text-2: #cbd5e1;
  --text-3: #94a3b8;
}

@media (max-width: 900px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .camera-section {
    padding: 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .hero-meta {
    flex-direction: column;
  }
}
</style>
