<template>
  <div class="map-viewer">
    <!-- Map Container -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">Memuat Peta Digital Twin 3D...</p>
        <p class="loading-subtext">Memuat terrain dan bangunan 3D...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="loadError" class="error-overlay">
      <div class="error-content">
        <p class="error-message">{{ loadError }}</p>
        <button class="retry-btn" @click="initMap">Coba Lagi</button>
      </div>
    </div>

    <!-- Info Panel -->
    <div v-if="isReady" class="info-panel" :class="{ collapsed: infoPanelCollapsed }">
      <button class="toggle-btn" @click="infoPanelCollapsed = !infoPanelCollapsed">
        <svg v-if="infoPanelCollapsed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div v-if="!infoPanelCollapsed" class="panel-content">
        <div class="panel-header">
          <div class="location-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3" fill="white"></circle>
            </svg>
            <span>Rumah Digital Twin</span>
          </div>
          <div class="view-mode-badge">
            <span class="badge-3d">🗺️ 3D Map</span>
          </div>
        </div>

        <div class="coordinates">
          <div class="coord-row">
            <span class="coord-label">Latitude</span>
            <span class="coord-value">{{ formatCoord(housePosition.lat) }}</span>
          </div>
          <div class="coord-row">
            <span class="coord-label">Longitude</span>
            <span class="coord-value">{{ formatCoord(housePosition.lon) }}</span>
          </div>
          <div class="coord-row">
            <span class="coord-label">Altitude</span>
            <span class="coord-value">{{ currentAltitude }} m</span>
          </div>
        </div>

        <div class="sensor-summary">
          <h4>Sensor Summary</h4>
          <div class="sensor-grid">
            <div class="sensor-card temp">
              <span class="sensor-icon">🌡️</span>
              <span class="sensor-value">{{ sensorData.temperature?.toFixed(1) || '--' }}°C</span>
              <span class="sensor-label">Suhu</span>
            </div>
            <div class="sensor-card humidity">
              <span class="sensor-icon">💧</span>
              <span class="sensor-value">{{ sensorData.humidity?.toFixed(1) || '--' }}%</span>
              <span class="sensor-label">Kelembaban</span>
            </div>
            <div class="sensor-card power">
              <span class="sensor-icon">⚡</span>
              <span class="sensor-value">{{ sensorData.power?.toFixed(0) || '--' }}W</span>
              <span class="sensor-label">Daya</span>
            </div>
            <div class="sensor-card voltage">
              <span class="sensor-icon">🔌</span>
              <span class="sensor-value">{{ sensorData.voltage?.toFixed(1) || '--' }}V</span>
              <span class="sensor-label">Tegangan</span>
            </div>
          </div>
        </div>

        <div class="quick-actions">
          <button class="action-btn" @click="flyToHome">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Ke Lokasi</span>
          </button>
          <button class="action-btn" @click="togglePitch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>{{ is3DView ? '2D' : '3D' }}</span>
          </button>
          <button class="action-btn" @click="toggleIndoorView">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Indoor 3D</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="isReady" class="legend">
      <div class="legend-item">
        <span class="legend-marker house"></span>
        <span>Rumah Digital Twin</span>
      </div>
      <div class="legend-item">
        <span class="legend-marker terrain"></span>
        <span>3D Terrain</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// MapTiler API Key
const MAPTILER_KEY = 'CzQAG6I86hmN1UDEaSY0'

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({ temperature: 0, humidity: 0, voltage: 0, current: 0, power: 0 })
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-indoor', 'location-selected'])

const housePosition = {
  lat: -7.722649267245097,
  lon: 110.51897609565907
}

const mapContainer = ref(null)
const isLoading = ref(true)
const isReady = ref(false)
const is3DView = ref(true)
const infoPanelCollapsed = ref(false)
const loadError = ref('')
const currentAltitude = ref(0)

let map = null
let marker = null

const initMap = () => {
  if (!mapContainer.value) {
    loadError.value = 'Container tidak ditemukan'
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    console.log('🚀 Initializing MapLibre 3D Map with terrain...')

    // Create map with basic style (terrain added after load)
    map = new maplibregl.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [housePosition.lon, housePosition.lat],
      zoom: 17,
      pitch: 45,
      bearing: -17.6,
      antialias: true
    })

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

    // Wait for map to load
    map.on('load', async () => {
      console.log('✅ Map loaded, adding 3D terrain and buildings...')

      try {
        // Add terrain source after map loads
        map.addSource('terrain-source', {
          type: 'raster-dem',
          tiles: [
            `https://api.maptiler.com/tiles/terrain-v2/tiles/{z}/{x}/{y}?key=${MAPTILER_KEY}`
          ],
          tileSize: 512,
          maxzoom: 14,
          encoding: 'terrarium'
        })

        // Set terrain with exaggeration
        map.setTerrain({ source: 'terrain-source', exaggeration: 1.5 })

        console.log('✅ 3D Terrain added')
      } catch (err) {
        console.warn('⚠️ Terrain error (non-critical):', err.message)
      }

      // Add 3D buildings from MapTiler
      add3DBuildingsSource()

      // Add house marker
      addHouseMarker()

      isLoading.value = false
      isReady.value = true
      console.log('✅ MapLibre 3D Map siap!')
    })

    // Handle errors
    map.on('error', (e) => {
      console.error('❌ Map error:', e)
      if (e.error) {
        loadError.value = `Error: ${e.error.message}`
      }
    })

    // Track camera position
    map.on('move', () => {
      updateAltitude()
    })

  } catch (error) {
    console.error('❌ Error:', error)
    loadError.value = `Gagal: ${error.message}`
    isLoading.value = false
  }
}

const add3DBuildingsSource = () => {
  if (!map) return

  // Add MapTiler 3D buildings layer
  map.addSource('maplibre-buildings', {
    type: 'vector',
    url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`
  })

  map.addLayer({
    id: '3d-buildings',
    source: 'maplibre-buildings',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        ['get', 'height'],
        0, '#cccccc',
        50, '#999999',
        100, '#666666'
      ],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.7
    }
  })

  console.log('✅ 3D Buildings added')
}

const addHouseMarker = () => {
  if (!map) return

  // Create custom marker element
  const el = document.createElement('div')
  el.className = 'house-marker'
  el.innerHTML = `
    <div style="
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
      animation: pulse 2s infinite;
      cursor: pointer;
    ">
      <span style="font-size: 24px;">🏠</span>
    </div>
  `

  // Add pulse animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5); }
      50% { transform: scale(1.1); box-shadow: 0 4px 24px rgba(239, 68, 68, 0.8); }
      100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5); }
    }
  `
  el.appendChild(style)

  // Create popup
  const popup = new maplibregl.Popup({
    offset: 25,
    closeButton: false,
    closeOnClick: false
  }).setHTML(`
    <div style="padding: 12px; font-family: sans-serif; min-width: 180px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">🏠 Digital Twin Rumah</h3>
      <p style="margin: 4px 0; font-size: 12px;"><strong>Suhu:</strong> ${props.sensorData?.temperature?.toFixed(1) || '--'}°C</p>
      <p style="margin: 4px 0; font-size: 12px;"><strong>Latitude:</strong> ${formatCoord(housePosition.lat)}</p>
      <p style="margin: 4px 0; font-size: 12px;"><strong>Longitude:</strong> ${formatCoord(housePosition.lon)}</p>
    </div>
  `)

  // Add marker to map
  marker = new maplibregl.Marker(el)
    .setLngLat([housePosition.lon, housePosition.lat])
    .setPopup(popup)
    .addTo(map)

  // Open popup by default
  marker.togglePopup()

  console.log('✅ House marker added')
}

const flyToHome = () => {
  if (!map) return

  map.flyTo({
    center: [housePosition.lon, housePosition.lat],
    zoom: 18,
    pitch: 45,
    bearing: -17.6,
    duration: 2000
  })

  emit('location-selected', housePosition)
}

const togglePitch = () => {
  if (!map) return

  if (is3DView.value) {
    // Switch to 2D
    map.easeTo({ pitch: 0, duration: 1000 })
    is3DView.value = false
  } else {
    // Switch to 3D
    map.easeTo({ pitch: 45, duration: 1000 })
    is3DView.value = true
  }
}

const toggleIndoorView = () => {
  emit('toggle-indoor')
}

const updateAltitude = () => {
  if (!map) return
  const zoom = map.getZoom()
  currentAltitude.value = Math.round(zoom * 100)
}

const formatCoord = (value) => value?.toFixed(6) || '--'

watch(() => props.sensorData, (data) => {
  if (data && marker) {
    const temp = data.temperature?.toFixed(1) || '--'
    marker.getPopup().setHTML(`
      <div style="padding: 12px; font-family: sans-serif; min-width: 180px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">🏠 Digital Twin Rumah</h3>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Suhu:</strong> ${temp}°C</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Latitude:</strong> ${formatCoord(housePosition.lat)}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Longitude:</strong> ${formatCoord(housePosition.lon)}</p>
      </div>
    `)
  }
}, { deep: true })

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

onMounted(() => {
  setTimeout(initMap, 200)
})
</script>

<style scoped>
.map-viewer {
  position: relative;
  width: 100%;
  height: 500px;
  min-height: 400px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a3a5c 0%, #0a1628 100%);
}

.map-container {
  width: 100%;
  height: 100%;
}

:deep(.maplibregl-ctrl-group) {
  background: rgba(15, 23, 42, 0.95);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.maplibregl-ctrl-group button) {
  background: transparent;
  border: none;
  color: white;
}

:deep(.maplibregl-ctrl-group button:hover) {
  background: rgba(255, 255, 255, 0.1);
}

:deep(.maplibregl-ctrl-scale) {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
  padding: 4px 8px;
}

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
  border-right: 4px solid #3b82f6;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 18px;
  font-weight: 600;
}

.loading-subtext {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 8px;
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 22, 40, 0.9);
  z-index: 100;
}

.error-content {
  text-align: center;
  color: white;
  padding: 20px;
}

.error-message {
  color: #fca5a5;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.info-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 280px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 50;
  overflow: hidden;
}

.info-panel.collapsed {
  width: 48px;
}

.toggle-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 20px;
}

.location-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 8px;
  color: #fca5a5;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.view-mode-badge {
  margin-top: 8px;
}

.badge-3d {
  display: inline-block;
  padding: 4px 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.coordinates {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.coord-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.coord-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.coord-label {
  color: #94a3b8;
  font-size: 12px;
}

.coord-value {
  color: #f8fafc;
  font-size: 13px;
  font-family: monospace;
}

.sensor-summary h4 {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 12px;
  opacity: 0.7;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.sensor-card {
  padding: 12px;
  border-radius: 10px;
  text-align: center;
}

.sensor-card.temp { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); }
.sensor-card.humidity { background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); }
.sensor-card.power { background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.3); }
.sensor-card.voltage { background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); }

.sensor-icon { display: block; font-size: 20px; margin-bottom: 4px; }
.sensor-value { display: block; color: #f8fafc; font-size: 16px; font-weight: 700; }
.sensor-label { display: block; color: #94a3b8; font-size: 10px; text-transform: uppercase; }

.quick-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #f8fafc;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  font-size: 10px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
  transform: translateY(-2px);
}

.legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 50;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f8fafc;
  font-size: 12px;
}

.legend-marker.house {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid white;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.legend-marker.terrain {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border-radius: 4px;
  border: 2px solid white;
}

@media (max-width: 640px) {
  .info-panel {
    width: calc(100% - 40px);
  }

  .map-viewer {
    height: 400px;
  }
}
</style>