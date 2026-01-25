<template>
  <div class="camera-stream">
    <div class="stream-container">
      <img 
        v-if="streamUrl && !hasError" 
        :src="streamUrl" 
        alt="Camera Stream"
        @error="handleError"
        @load="handleLoad"
        class="stream-image"
      />
      
      <!-- Raspberry Pi Offline State -->
      <div v-if="!streamUrl || hasError" class="stream-placeholder">
        <div class="placeholder-content">
          <span class="icon">📹</span>
          <p class="main-message">{{ hasError ? 'Raspberry Pi Offline' : 'Kamera Belum Terhubung' }}</p>
          <p class="sub-message">{{ hasError ? 'Tidak dapat terhubung ke kamera' : 'Masukkan IP Raspberry Pi untuk melihat stream' }}</p>
          <div class="offline-info">
            <p>Pastikan:</p>
            <ul>
              <li>Raspberry Pi sudah menyala</li>
              <li>Script people_counter_yolo.py sudah berjalan</li>
              <li>Raspberry Pi dan komputer dalam jaringan yang sama</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div v-if="isStreamActive && !hasError" class="stream-overlay">
        <div class="stream-info">
          <span class="status-indicator active"></span>
          <span class="status-text">LIVE</span>
        </div>
      </div>
      
      <div v-if="isLoading && !hasError" class="loading-overlay">
        <div class="spinner"></div>
        <p>Menghubungkan ke kamera...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineEmits } from 'vue'

const emit = defineEmits(['peopleCountUpdate'])

const raspberryPiIp = ref(import.meta.env.VITE_RASPBERRY_PI_IP || '192.168.1.8')
const streamUrl = ref(null)
const isLoading = ref(false)
const isStreamActive = ref(false)
const streamPort = ref(import.meta.env.VITE_RASPBERRY_PI_PORT || 5000)
const errorMessage = ref('')
const hasError = ref(false)
let peopleCountInterval = null
let snapshotInterval = null

// Get base URL for API calls
const getBaseUrl = () => {
  const protocol = streamPort.value == 443 ? 'https' : 'http'
  const portSuffix = streamPort.value == 443 || streamPort.value == 80 ? '' : `:${streamPort.value}`
  return `${protocol}://${raspberryPiIp.value}${portSuffix}`
}

// Fetch people count dari Raspberry Pi setiap 2 detik
const fetchPeopleCount = async () => {
  if (!raspberryPiIp.value || hasError.value) return
  
  try {
    const response = await fetch(`${getBaseUrl()}/count`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const data = await response.json()
    console.log('👥 People count from Raspberry Pi:', data.count)
    emit('peopleCountUpdate', data.count)
  } catch (error) {
    console.error('Failed to fetch people count:', error.message)
  }
}

// Fetch snapshot dengan header ngrok-skip-browser-warning
const fetchSnapshot = async () => {
  if (!raspberryPiIp.value) return
  
  try {
    const response = await fetch(`${getBaseUrl()}/snapshot?t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      
      // Revoke old URL to prevent memory leak
      if (streamUrl.value && streamUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(streamUrl.value)
      }
      
      streamUrl.value = imageUrl
      isLoading.value = false
      isStreamActive.value = true
      hasError.value = false
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('Failed to fetch snapshot:', error.message)
    hasError.value = true
    isLoading.value = false
    isStreamActive.value = false
  }
}

const updateStream = () => {
  hasError.value = false
  isLoading.value = true
  isStreamActive.value = false
  
  console.log('Starting snapshot polling from:', getBaseUrl())
  
  // Use snapshot polling instead of MJPEG (to bypass ngrok warning)
  if (snapshotInterval) clearInterval(snapshotInterval)
  snapshotInterval = setInterval(fetchSnapshot, 100) // ~10 FPS
  fetchSnapshot() // Fetch immediately
  
  // Start polling people count
  if (peopleCountInterval) clearInterval(peopleCountInterval)
  peopleCountInterval = setInterval(fetchPeopleCount, 2000)
  fetchPeopleCount() // Fetch immediately
}

const refreshStream = () => {
  if (raspberryPiIp.value) {
    updateStream()
  }
}

const handleLoad = () => {
  isLoading.value = false
  isStreamActive.value = true
  hasError.value = false
  console.log('Stream loaded successfully')
}

const handleError = (event) => {
  isLoading.value = false
  isStreamActive.value = false
  hasError.value = true
  errorMessage.value = 'Cannot load stream. Check if Raspberry Pi server is running.'
  console.error('Stream error:', event)
  console.error('Stream URL:', streamUrl.value)
}

const openInNewTab = () => {
  if (raspberryPiIp.value) {
    window.open(`http://${raspberryPiIp.value}:${streamPort.value}/video_feed`, '_blank')
  }
}

onMounted(() => {
  // Always try to start stream on mount
  console.log('🎥 CameraStream mounted, starting stream...')
  console.log('📍 Raspberry Pi IP:', raspberryPiIp.value)
  updateStream()
})

onUnmounted(() => {
  if (peopleCountInterval) {
    clearInterval(peopleCountInterval)
    peopleCountInterval = null
  }
  if (snapshotInterval) {
    clearInterval(snapshotInterval)
    snapshotInterval = null
  }
  // Cleanup blob URL
  if (streamUrl.value && streamUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(streamUrl.value)
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
  padding: 20px;
}

.placeholder-content .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.placeholder-content .main-message {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0;
  color: var(--text-primary);
}

.placeholder-content .sub-message {
  font-size: 14px;
  margin: 4px 0 16px 0;
  opacity: 0.7;
}

.placeholder-content .offline-info {
  text-align: left;
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
}

.placeholder-content .offline-info p {
  margin: 0 0 8px 0;
  font-weight: 500;
}

.placeholder-content .offline-info ul {
  margin: 0;
  padding-left: 20px;
}

.placeholder-content .offline-info li {
  margin: 4px 0;
  opacity: 0.8;
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

.error-overlay {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 38, 38, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  backdrop-filter: blur(8px);
  font-size: 14px;
  font-weight: 500;
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
