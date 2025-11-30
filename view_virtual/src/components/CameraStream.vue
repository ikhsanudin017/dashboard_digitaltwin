<template>
  <div class="camera-stream">
    <div class="stream-container">
      <img 
        v-if="streamUrl" 
        :src="streamUrl" 
        alt="Camera Stream"
        @error="handleError"
        @load="handleLoad"
        class="stream-image"
      />
      
      <div v-if="!streamUrl" class="stream-placeholder">
        <div class="placeholder-content">
          <span class="icon">📹</span>
          <p>Waiting for camera stream...</p>
          <p class="url-hint">Configure Raspberry Pi IP in settings</p>
        </div>
      </div>
      
      <div v-if="!isLoading && streamUrl" class="stream-overlay">
        <div class="stream-info">
          <span class="status-indicator" :class="{ active: isStreamActive }"></span>
          <span class="status-text">{{ isStreamActive ? 'LIVE' : 'OFFLINE' }}</span>
        </div>
      </div>
      
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Connecting to camera...</p>
      </div>
    </div>
    
    <div class="stream-controls">
      <input 
        v-model="raspberryPiIp" 
        type="text" 
        placeholder="Raspberry Pi IP (e.g., 192.168.1.100)"
        class="ip-input"
        @keyup.enter="updateStream"
      />
      <button @click="updateStream" class="btn-update">
        🔄 Update Stream
      </button>
      <button @click="refreshStream" class="btn-refresh" :disabled="!streamUrl">
        ↻ Refresh
      </button>
      <button @click="openInNewTab" class="btn-test" :disabled="!streamUrl">
        🔗 Test in New Tab
      </button>
    </div>
    <div v-if="streamUrl" class="debug-info">
      <small>Stream URL: {{ streamUrl }}</small>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const raspberryPiIp = ref(localStorage.getItem('raspberryPiIp') || '192.168.1.8')
const streamUrl = ref(null)
const isLoading = ref(false)
const isStreamActive = ref(false)
const streamPort = ref(5000)

const updateStream = () => {
  if (!raspberryPiIp.value) {
    alert('Please enter Raspberry Pi IP address')
    return
  }
  
  localStorage.setItem('raspberryPiIp', raspberryPiIp.value)
  
  // Use MJPEG stream directly in img tag
  streamUrl.value = `http://${raspberryPiIp.value}:${streamPort.value}/video_feed?t=${Date.now()}`
  isLoading.value = true
  isStreamActive.value = false
  
  console.log('🚀 Starting MJPEG stream:', streamUrl.value)
}

const refreshStream = () => {
  if (raspberryPiIp.value) {
    updateStream()
  }
}

const handleLoad = () => {
  isLoading.value = false
  isStreamActive.value = true
  console.log('✅ Stream loaded successfully')
}

const handleError = (event) => {
  isLoading.value = false
  isStreamActive.value = false
  console.error('❌ Stream error')
  
  // Retry after 3 seconds
  setTimeout(() => {
    if (streamUrl.value) {
      console.log('🔄 Retrying...')
      refreshStream()
    }
  }, 3000)
}

const openInNewTab = () => {
  if (raspberryPiIp.value) {
    window.open(`http://${raspberryPiIp.value}:${streamPort.value}/video_feed`, '_blank')
  }
}

onMounted(() => {
  const savedIp = localStorage.getItem('raspberryPiIp')
  if (savedIp) {
    raspberryPiIp.value = savedIp
    updateStream()
  }
})
</script>

<style scoped>
.camera-stream {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stream-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-sm);
}

.stream-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #000;
}

.stream-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 2px dashed var(--border);
}

.placeholder-content {
  text-align: center;
  color: var(--text-secondary);
}

.placeholder-content .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.placeholder-content p {
  margin: 4px 0;
}

.url-hint {
  font-size: 12px;
  opacity: 0.7;
}

.stream-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 12px;
  border-radius: 4px;
  backdrop-filter: blur(8px);
}

.stream-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.status-indicator.active {
  background: #00ff00;
  box-shadow: 0 0 8px #00ff00;
  animation: pulse 2s infinite;
}

.fps-text {
  margin-left: 8px;
  font-size: 11px;
  opacity: 0.8;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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

.stream-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-info {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #aaa;
  word-break: break-all;
}

.ip-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
}

.ip-input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-update,
.btn-refresh {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-update:hover,
.btn-refresh:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.btn-refresh {
  background: var(--success);
}

.btn-refresh:hover {
  background: var(--success-dark);
}

.btn-refresh:disabled {
  background: var(--border);
  cursor: not-allowed;
  transform: none;
}
</style>
