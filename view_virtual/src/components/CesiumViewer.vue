<template>
  <div class="cesium-viewer">
    <div ref="cesiumContainer" class="cesium-container"></div>

    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">Memuat Peta...</p>
        <p class="loading-sub">{{ loadingStatus }}</p>
      </div>
    </div>

    <div v-if="loadError" class="error-overlay">
      <div class="error-content">
        <h3>Error</h3>
        <p>{{ loadError }}</p>
        <button @click="initViewer">🔄 Coba Lagi</button>
      </div>
    </div>

    <div v-if="isReady && showInfoCard" class="info-card">
      <div class="card-header">
        <span class="card-icon">🗺️</span>
        <span class="card-title">3D Map</span>
      </div>
      <button class="card-btn" @click="emit('switch-to-3d')">🏠 Indoor</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as Cesium from 'cesium'

const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiOTM2NDJmNC1jZmEzLTQ2OWEtOTU2MS1kZTY0ZTkzNGY3MGMiLCJpZCI6NDI0MzM2LCJpYXQiOjE3Nzc0Nzg5ODF9.8YOYunQZWR7KNEzSajwLN_5KTSXFyP-TGwuJfahkXMI'

const props = defineProps({
  sensorData: { type: Object, default: () => ({}) },
  showInfoCard: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle-indoor', 'switch-to-3d'])

const housePosition = { lat: -7.722649267245097, lon: 110.51904046867396 }

const cesiumContainer = ref(null)
const isLoading = ref(true)
const isReady = ref(false)
const loadError = ref('')
const loadingStatus = ref('')

let viewer = null

const initViewer = async () => {
  isLoading.value = true
  loadError.value = ''
  loadingStatus.value = 'Step 1: Container...'
  console.log('1. Mulai initViewer')

  await nextTick()

  if (!cesiumContainer.value) {
    loadError.value = 'Container tidak ditemukan'
    isLoading.value = false
    return
  }

  loadingStatus.value = 'Step 2: Set Token...'
  console.log('2. Set token')

  try {
    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN
    console.log('3. Token di-set, create Viewer...')

    loadingStatus.value = 'Step 3: Create Viewer...'

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
      creditContainer: document.createElement('div')
    })

    console.log('4. Viewer dibuat!')

    // Remove default Bing imagery
    viewer.imageryLayers.removeAll()

    // Set ellipsoid terrain
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()

    // Set background color
    viewer.scene.backgroundColor = new Cesium.Color(0.04, 0.06, 0.1, 1)

    loadingStatus.value = 'Step 4: Load 3D Tileset...'
    console.log('5. Load 3D Tileset')

    // Load 3D Tileset
    try {
      const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207)
      viewer.scene.primitives.add(tileset)
      console.log('6. Tileset dimuat')
    } catch (e) {
      console.warn('⚠️ Gagal muat tileset:', e.message)
    }

    loadingStatus.value = 'Step 5: Add Marker...'
    console.log('7. Add marker')

    // Add marker
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(housePosition.lon, housePosition.lat),
      point: {
        pixelSize: 20,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3
      },
      label: {
        text: '📍 Digital Twin Home',
        font: '16px Arial',
        fillColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    loadingStatus.value = 'Step 6: Fly to location...'
    console.log('8. Fly to location')

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(housePosition.lon, housePosition.lat, 500),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 1
    })

    loadingStatus.value = 'Selesai!'
    console.log('9. Selesai!')

    isLoading.value = false
    isReady.value = true

  } catch (error) {
    console.error('❌ Error:', error)
    loadError.value = error.message || 'Gagal memuat'
    isLoading.value = false
  }
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
  height: 100%;
  overflow: hidden;
  background: #0a0f1a;
}

.cesium-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

:deep(.cesium-viewer-toolbar) { display: none !important; }
:deep(.cesium-viewer-bottom) { display: none !important; }
:deep(.cesium-creditLogoContainer) { display: none !important; }
:deep(.cesium-credit-textContainer) { display: none !important; }
:deep(.cesium-widget) { background: transparent !important; }
:deep(.cesium-canvas) { width: 100% !important; height: 100% !important; }

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.95);
  z-index: 100;
}

.loading-spinner { text-align: center; color: white; }

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top: 4px solid #00d4ff;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text { font-size: 18px; font-weight: 600; }
.loading-sub { font-size: 14px; color: #94a3b8; margin-top: 8px; }

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.95);
  z-index: 100;
}

.error-content { text-align: center; color: white; max-width: 400px; padding: 20px; }
.error-content h3 { font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 10px; }
.error-content p { color: #fca5a5; margin-bottom: 20px; }
.error-content button {
  padding: 12px 24px;
  background: #00d4ff;
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.info-card {
  position: absolute;
  top: 8px;
  left: 226px;
  right: 226px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 14px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header { display: flex; align-items: center; gap: 8px; }
.card-icon { font-size: 18px; }
.card-title { font-weight: 700; color: #00d4ff; font-size: 13px; }

.card-btn {
  padding: 6px 10px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.5);
  border-radius: 4px;
  color: #22c55e;
  font-size: 11px;
  cursor: pointer;
}
</style>
