<template>
  <div class="map-viewer">
    <!-- Map Container -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">Memuat Peta Digital Twin...</p>
      </div>
    </div>

    <!-- Info Panel -->
    <div class="info-panel" :class="{ collapsed: infoPanelCollapsed }">
      <button class="toggle-btn" @click="infoPanelCollapsed = !infoPanelCollapsed">
        <svg v-if="infoPanelCollapsed" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div v-if="!infoPanelCollapsed" class="panel-content">
        <!-- Header -->
        <div class="panel-header">
          <div class="location-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3" fill="white"></circle>
            </svg>
            <span>Rumah Digital Twin</span>
          </div>
        </div>

        <!-- Coordinates -->
        <div class="coordinates">
          <div class="coord-row">
            <span class="coord-label">Latitude</span>
            <span class="coord-value">{{ formatCoord(housePosition.lat) }}</span>
          </div>
          <div class="coord-row">
            <span class="coord-label">Longitude</span>
            <span class="coord-value">{{ formatCoord(housePosition.lon) }}</span>
          </div>
        </div>

        <!-- Sensor Summary -->
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

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="action-btn" @click="flyToHome" title="Terbang ke Lokasi">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Ke Lokasi</span>
          </button>
          <button class="action-btn" @click="toggleIndoorView" title="Lihat Indoor 3D">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Indoor 3D</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-marker house"></span>
        <span>Rumah Digital Twin</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({
      temperature: 0,
      humidity: 0,
      voltage: 0,
      current: 0,
      power: 0
    })
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-indoor', 'location-selected'])

const housePosition = {
  lat: -7.7229652607057515,
  lon: 110.5187030823394
}

const mapContainer = ref(null)
const isLoading = ref(true)
const infoPanelCollapsed = ref(false)

let map = null
let marker = null

// Fix Leaflet default marker icons
const getHouseIcon = () => {
  return L.divIcon({
    className: 'custom-house-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: #ef4444;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">
        🏠
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  })
}

// Initialize map
const initMap = () => {
  if (!mapContainer.value) {
    console.error('Map container not found')
    return
  }

  try {
    console.log('🚀 Initializing Leaflet map...')

    // Create map centered on house location
    map = L.map(mapContainer.value, {
      center: [housePosition.lat, housePosition.lon],
      zoom: 17,
      zoomControl: true
    })

    // Add tile layer (OpenStreetMap)
    updateTileLayer()

    // Add house marker
    addHomeMarker()

    // Loading done
    isLoading.value = false
    console.log('✅ Leaflet map initialized successfully')

  } catch (error) {
    console.error('❌ Error initializing map:', error)
    isLoading.value = false
  }
}

// Update tile layer based on dark mode
const updateTileLayer = () => {
  if (!map) return

  // Remove existing layers
  map.eachLayer(layer => {
    if (layer instanceof L.TileLayer) {
      map.removeLayer(layer)
    }
  })

  let tileUrl
  let attribution

  if (props.isDarkMode) {
    // Dark map style using CartoDB Dark Matter
    tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  } else {
    // Light map style using OpenStreetMap
    tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }

  L.tileLayer(tileUrl, {
    attribution,
    maxZoom: 19
  }).addTo(map)
}

// Add house marker
const addHomeMarker = () => {
  if (!map) return

  // Remove existing marker
  if (marker) {
    map.removeLayer(marker)
  }

  // Create marker with popup
  const popupContent = `
    <div style="padding: 8px; font-family: sans-serif; min-width: 180px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">🏠 Digital Twin Rumah</h3>
      <p style="margin: 4px 0; font-size: 12px;"><strong>Latitude:</strong> ${formatCoord(housePosition.lat)}</p>
      <p style="margin: 4px 0; font-size: 12px;"><strong>Longitude:</strong> ${formatCoord(housePosition.lon)}</p>
      <p style="margin: 4px 0; font-size: 12px;"><strong>Lokasi:</strong> Yogyakarta, Indonesia</p>
    </div>
  `

  marker = L.marker([housePosition.lat, housePosition.lon], {
    icon: getHouseIcon()
  })
    .addTo(map)
    .bindPopup(popupContent, {
      maxWidth: 250,
      className: 'custom-popup'
    })
    .openPopup()

  console.log('✅ House marker added at:', housePosition)
}

// Fly to home location
const flyToHome = () => {
  if (!map) return

  map.flyTo([housePosition.lat, housePosition.lon], 18, {
    duration: 1.5
  })

  emit('location-selected', housePosition)
  console.log('✈️ Flying to home location...')
}

// Toggle indoor 3D view
const toggleIndoorView = () => {
  emit('toggle-indoor')
}

// Format coordinates
const formatCoord = (value) => {
  if (value === undefined || value === null) return '--'
  return value.toFixed(6)
}

// Watch for dark mode changes
watch(() => props.isDarkMode, () => {
  updateTileLayer()
})

// Watch for sensor data changes
watch(() => props.sensorData, (newData) => {
  if (newData && marker) {
    // Update popup with current temperature
    const temp = newData.temperature?.toFixed(1) || '--'
    marker.setPopupContent(`
      <div style="padding: 8px; font-family: sans-serif; min-width: 180px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">🏠 Digital Twin Rumah</h3>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Suhu:</strong> ${temp}°C</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Latitude:</strong> ${formatCoord(housePosition.lat)}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Longitude:</strong> ${formatCoord(housePosition.lon)}</p>
      </div>
    `)
  }
}, { deep: true })

// Cleanup on unmount
onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

onMounted(() => {
  // Small delay to ensure container is rendered
  setTimeout(() => {
    initMap()
  }, 100)
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
  background: #e8f4f8;
}

.map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Custom marker styles */
:deep(.custom-house-marker) {
  background: transparent;
  border: none;
}

:deep(.custom-popup .leaflet-popup-content-wrapper) {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

:deep(.custom-popup .leaflet-popup-content) {
  margin: 12px;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 21, 0.95);
  backdrop-filter: blur(8px);
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
  border-right: 4px solid #f97316;
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
  color: #f8fafc;
}

/* Info Panel */
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
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
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
  transition: background 0.2s;
  z-index: 10;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 20px;
}

.panel-header {
  margin-bottom: 16px;
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
  align-items: center;
  padding: 6px 0;
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
  font-weight: 500;
}

/* Sensor Summary */
.sensor-summary {
  margin-bottom: 16px;
}

.sensor-summary h4 {
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  opacity: 0.7;
}

.sensor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.sensor-card {
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  transition: transform 0.2s;
}

.sensor-card:hover {
  transform: translateY(-2px);
}

.sensor-card.temp {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.sensor-card.humidity {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.sensor-card.power {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.1));
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.sensor-card.voltage {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.sensor-icon {
  display: block;
  font-size: 20px;
  margin-bottom: 4px;
}

.sensor-value {
  display: block;
  color: #f8fafc;
  font-size: 16px;
  font-weight: 700;
}

.sensor-label {
  display: block;
  color: #94a3b8;
  font-size: 10px;
  text-transform: uppercase;
  margin-top: 2px;
}

/* Quick Actions */
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
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
  transform: translateY(-2px);
}

.action-btn span {
  font-size: 10px;
  font-weight: 500;
}

/* Legend */
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

.legend-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}

.legend-marker.house {
  background: #ef4444;
  border: 2px solid white;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

/* Responsive */
@media (max-width: 640px) {
  .info-panel {
    width: calc(100% - 40px);
    left: 20px;
    right: 20px;
  }

  .info-panel.collapsed {
    width: 48px;
  }

  .map-viewer {
    height: 400px;
  }

  .legend {
    bottom: 10px;
    left: 10px;
    padding: 8px 12px;
  }
}
</style>
