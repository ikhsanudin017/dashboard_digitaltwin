<template>
  <div class="cesium-viewer">
    <!-- Map Container -->
    <div ref="cesiumContainer" class="cesium-container"></div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">Memuat 3D View...</p>
        <p class="loading-sub">{{ loadingStatus }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="loadError" class="error-overlay">
      <div class="error-content">
        <p class="error-message">{{ loadError }}</p>
        <button class="retry-btn" @click="initViewer">Coba Lagi</button>
      </div>
    </div>

    <!-- Info Card -->
    <div v-if="isReady" class="info-card">
      <div class="card-header">
        <span class="card-icon">🏠</span>
        <span class="card-title">Digital Twin Home</span>
      </div>
      <div class="card-coords">
        <span>{{ formatCoord(housePosition.lat) }}, {{ formatCoord(housePosition.lon) }}</span>
      </div>
      <div class="card-actions">
        <button class="card-btn" @click="flyToHome">🎯 Lokasi</button>
        <button class="card-btn" @click="toggle3D">📐 {{ is3DMode ? '2D' : '3D' }}</button>
      </div>
    </div>

    <!-- Instructions -->
    <div v-if="isReady" class="instructions">
      <span>🖱️ Drag untuk rotate • Scroll untuk zoom • Klik kanan untuk tilt</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as Cesium from 'cesium'
import { CESIUM_ION_TOKEN, GOOGLE_MAPS_API_KEY } from '@/lib/appConfig'

// Fallback to empty string if not configured via env
const CESIUM_TOKEN = CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZTljMmFmOC1lMjVmLTRiOTktOGZhMy00OTVkMDQzZDA3YjgiLCJpZCI6NDIzOTQ1LCJpYXQiOjE3NzcyNjg3Nzh9.GGZCNgx3n-vIlj-hphyjGIA4uIeR9e3-aXKkMq8Sp5I'
const GOOGLE_API_KEY = GOOGLE_MAPS_API_KEY || 'AIzaSyBlQk4kTmrf-yWcM1wrLwSGlyxRvVqPP3M'

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['toggle-indoor'])

const housePosition = {
  lat: -7.722649267245097,
  lon: 110.51904046867396
}

const cesiumContainer = ref(null)
const isLoading = ref(true)
const isReady = ref(false)
const loadError = ref('')
const loadingStatus = ref('')
const is3DMode = ref(true)

let viewer = null

const formatCoord = (value) => value?.toFixed(6) || '--'

const initViewer = async () => {
  isLoading.value = true
  loadError.value = ''
  loadingStatus.value = 'Memuat engine...'

  await new Promise(r => setTimeout(r, 300))
  await nextTick()

  if (!cesiumContainer.value) {
    loadError.value = 'Container tidak ditemukan'
    isLoading.value = false
    return
  }

  try {
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN

    loadingStatus.value = 'Membuat 3D globe...'

    // Create viewer with clean config
    viewer = new Cesium.Viewer(cesiumContainer.value, {
      animation: false,
      timeline: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      navigationHelpButton: false,
      infoBox: false,
      selectionIndicator: false,
      creditContainer: document.createElement('div'),
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      requestRenderMode: false,
      maximumRenderTimeChange: Infinity
    })

    console.log('✅ Viewer created')

    // Configure scene for 3D interaction
    viewer.scene.globe.enableLighting = false
    viewer.scene.fog.enabled = false
    viewer.scene.skyAtmosphere.show = true

    // Enable picking and picking parameters
    viewer.scene.requestRenderMode = false
    viewer.scene.minimumMaximumZoom = 0

    // Make sure terrain exaggeration is normal (1x)
    if (viewer.scene.terrainExaggeration !== undefined) {
      viewer.scene.terrainExaggeration = 1.0
    }

    loadingStatus.value = 'Memuat 3D Photorealistic...'

    // ONLY load Google Photorealistic 3D Tiles
    try {
      loadingStatus.value = 'Memuat Google 3D...'
      const googleTileset = await Cesium.createGooglePhotorealistic3DTileset({
        accessKey: GOOGLE_API_KEY
      })
      viewer.scene.primitives.add(googleTileset)
      console.log('✅ Google Photorealistic 3D Tiles loaded')
    } catch (googleErr) {
      console.error('❌ Google 3D failed:', googleErr.message)
      loadError.value = 'Gagal memuat 3D Tiles. Cek API key atau koneksi internet.'
      isLoading.value = false
      return
    }

    // Add house marker
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(housePosition.lon, housePosition.lat),
      point: {
        pixelSize: 16,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: '🏠 Digital Twin Home',
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.RED,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 20),
        showBackground: true,
        backgroundColor: new Cesium.Color(0.9, 0.2, 0.2, 0.9),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })

    // Fly to home location
    loadingStatus.value = 'Navigasi ke lokasi...'
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        housePosition.lon,
        housePosition.lat,
        300
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 2
    })

    isLoading.value = false
    isReady.value = true
    console.log('✅ 3D Digital Twin siap!')

  } catch (error) {
    console.error('❌ Error:', error)
    loadError.value = error.message || 'Gagal memuat 3D'
    isLoading.value = false
  }
}

const flyToHome = () => {
  if (!viewer) return
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      housePosition.lon,
      housePosition.lat,
      300
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    },
    duration: 1.5
  })
}

const toggle3D = () => {
  if (!viewer) return

  is3DMode.value = !is3DMode.value

  const pitch = is3DMode.value ? -45 : -90

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      housePosition.lon,
      housePosition.lat,
      300
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(pitch),
      roll: 0
    },
    duration: 1
  })
}

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})

onMounted(() => {
  initViewer()
})
</script>

<style scoped>
.cesium-viewer {
  position: relative;
  width: 100%;
  height: 600px;
  min-height: 500px;
  overflow: hidden;
  border-radius: 12px;
  background: #1a1a2e;
}

.cesium-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.cesium-container:active {
  cursor: grabbing;
}

/* Hide all Cesium default UI */
:deep(.cesium-viewer-toolbar) { display: none !important; }
:deep(.cesium-viewer-bottom) { display: none !important; }
:deep(.cesium-creditLogoContainer) { display: none !important; }
:deep(.cesium-credit-textContainer) { display: none !important; }
:deep(.cesium-widget) { background: transparent !important; }
:deep(.cesium-widget-cesiumWidget) { background: transparent !important; }
:deep(.cesium-viewer) { background: transparent !important; }
:deep(.cesium-canvas) { width: 100% !important; height: 100% !important; }

/* Loading */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.95);
  z-index: 100;
}

.loading-spinner {
  text-align: center;
  color: white;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #ef4444;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  font-weight: 600;
}

.loading-sub {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 8px;
}

/* Error */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.95);
  z-index: 100;
}

.error-content {
  text-align: center;
  color: white;
}

.error-message {
  color: #fca5a5;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 12px 24px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Info Card */
.info-card {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  z-index: 50;
  min-width: 200px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  font-size: 24px;
}

.card-title {
  font-weight: 700;
  color: #fca5a5;
  font-size: 16px;
}

.card-coords {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-family: monospace;
  font-size: 12px;
  color: #f8fafc;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-btn {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.card-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
}

/* Instructions */
.instructions {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  padding: 10px 20px;
  border-radius: 20px;
  color: #94a3b8;
  font-size: 12px;
  z-index: 50;
}
</style>