<template>
  <div class="cesium-viewer" :class="{ dark: isDarkMode }">
    <div ref="cesiumContainer" class="cesium-container"></div>

    <div
      v-if="isReady && markerScreenPosition.visible"
      class="home-marker"
      :style="{ left: `${markerScreenPosition.x}px`, top: `${markerScreenPosition.y}px` }"
    >
      <div class="home-marker-label">Digital Twin Home</div>
      <div class="home-marker-dot"></div>
    </div>

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
      <button class="card-btn orbit-btn" @click="orbitAroundBuilding">360 View</button>
      <button class="card-btn" @click="emit('switch-to-3d')">🏠 Indoor</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as Cesium from 'cesium'

const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || ''

const props = defineProps({
  sensorData: { type: Object, default: () => ({}) },
  isDarkMode: { type: Boolean, default: false },
  showInfoCard: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle-indoor', 'switch-to-3d'])

const housePosition = { lat: -7.7229652607057515, lon: 110.5187030823394 }
const houseCartesian = () => Cesium.Cartesian3.fromDegrees(housePosition.lon, housePosition.lat, 0)
const lod3Building = {
  width: 8.2,
  length: 6.2,
  wallHeight: 3.2,
  roofHeight: 1.15,
  headingDegrees: -6
}
const imageryStyles = {
  light: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    credit: 'Tiles © Esri'
  },
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    credit: 'Tiles © Esri'
  }
}

const cesiumContainer = ref(null)
const isLoading = ref(true)
const isReady = ref(false)
const loadError = ref('')
const loadingStatus = ref('')
const markerScreenPosition = ref({ x: 0, y: 0, visible: false })

let viewer = null
let postRenderHandler = null
let lod3RoofPrimitive = null
let orbitFrameId = null

const applyBaseImagery = () => {
  if (!viewer) return

  const style = props.isDarkMode ? imageryStyles.dark : imageryStyles.light
  viewer.imageryLayers.removeAll(true)

  const imageryProvider = new Cesium.UrlTemplateImageryProvider({
    url: style.url,
    credit: style.credit,
    maximumLevel: 19,
    tilingScheme: new Cesium.WebMercatorTilingScheme()
  })

  viewer.imageryLayers.addImageryProvider(imageryProvider)
}

const destroyViewer = () => {
  stopBuildingOrbit()

  if (!viewer || viewer.isDestroyed()) {
    viewer = null
    return
  }

  if (lod3RoofPrimitive) {
    viewer.scene.primitives.remove(lod3RoofPrimitive)
    lod3RoofPrimitive = null
  }

  if (postRenderHandler) {
    viewer.scene.postRender.removeEventListener(postRenderHandler)
    postRenderHandler = null
  }

  viewer.destroy()
  viewer = null
}

const applySceneTheme = () => {
  if (!viewer) return
  viewer.scene.backgroundColor = props.isDarkMode
    ? new Cesium.Color(0.04, 0.06, 0.1, 1)
    : new Cesium.Color(0.94, 0.97, 1, 1)

  if (viewer.scene.globe) {
    viewer.scene.globe.baseColor = props.isDarkMode
      ? Cesium.Color.fromCssColorString('#101827')
      : Cesium.Color.fromCssColorString('#dceee6')
    viewer.scene.globe.showGroundAtmosphere = false
    viewer.scene.globe.enableLighting = false
  }
}

const updateMarkerOverlay = () => {
  if (!viewer) return

  const windowPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
    viewer.scene,
    buildingMarkerCartesian()
  )

  if (!windowPosition) {
    markerScreenPosition.value = { ...markerScreenPosition.value, visible: false }
    return
  }

  const canvas = viewer.scene.canvas
  const visible =
    windowPosition.x >= 0 &&
    windowPosition.y >= 0 &&
    windowPosition.x <= canvas.clientWidth &&
    windowPosition.y <= canvas.clientHeight

  markerScreenPosition.value = {
    x: windowPosition.x,
    y: windowPosition.y,
    visible
  }
}

const bindMarkerOverlay = () => {
  if (!viewer || postRenderHandler) return

  postRenderHandler = () => updateMarkerOverlay()
  viewer.scene.postRender.addEventListener(postRenderHandler)
  updateMarkerOverlay()
}

const buildingHpr = () =>
  new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(lod3Building.headingDegrees), 0, 0)

const buildingOrientation = () =>
  Cesium.Transforms.headingPitchRollQuaternion(houseCartesian(), buildingHpr())

const buildingTransform = () =>
  Cesium.Transforms.headingPitchRollToFixedFrame(houseCartesian(), buildingHpr())

const localBuildingPoint = (x, y, z) =>
  Cesium.Matrix4.multiplyByPoint(
    buildingTransform(),
    new Cesium.Cartesian3(x, y, z),
    new Cesium.Cartesian3()
  )

const buildingMarkerCartesian = () =>
  localBuildingPoint(0, 0, lod3Building.wallHeight + lod3Building.roofHeight + 0.35)

const buildingCameraTarget = () =>
  localBuildingPoint(0, 0, lod3Building.wallHeight * 0.55)

const addBuildingBox = ({ name, offset, dimensions, color, outlineColor = '#1f2937' }) => {
  viewer.entities.add({
    name,
    position: localBuildingPoint(offset[0], offset[1], offset[2]),
    orientation: buildingOrientation(),
    box: {
      dimensions: new Cesium.Cartesian3(dimensions[0], dimensions[1], dimensions[2]),
      material: Cesium.Color.fromCssColorString(color),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(outlineColor)
    }
  })
}

const addBuildingPolyline = (name, localPoints, color = '#111827', width = 2) => {
  viewer.entities.add({
    name,
    polyline: {
      positions: localPoints.map(([x, y, z]) => localBuildingPoint(x, y, z)),
      width,
      material: Cesium.Color.fromCssColorString(color)
    }
  })
}

const addGabledRoof = () => {
  const { width, length, wallHeight, roofHeight } = lod3Building
  const vertices = [
    [-width / 2, -length / 2, wallHeight],
    [width / 2, -length / 2, wallHeight],
    [0, -length / 2, wallHeight + roofHeight],
    [-width / 2, length / 2, wallHeight],
    [width / 2, length / 2, wallHeight],
    [0, length / 2, wallHeight + roofHeight]
  ]

  const positions = []
  vertices.forEach(([x, y, z]) => {
    const point = localBuildingPoint(x, y, z)
    positions.push(point.x, point.y, point.z)
  })

  const geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array(positions)
      })
    },
    indices: new Uint16Array([
      0, 3, 5, 0, 5, 2,
      1, 2, 5, 1, 5, 4,
      0, 2, 1,
      3, 4, 5
    ]),
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
  })

  lod3RoofPrimitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString('#9f3a32')
          )
        }
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        flat: true,
        translucent: false
      }),
      asynchronous: false
    })
  )

  addBuildingPolyline('LOD3 roof ridge', [
    [0, -length / 2, wallHeight + roofHeight + 0.04],
    [0, length / 2, wallHeight + roofHeight + 0.04]
  ], '#f8fafc', 2)

  addBuildingPolyline('LOD3 roof outline', [
    [-width / 2, -length / 2, wallHeight + 0.05],
    [0, -length / 2, wallHeight + roofHeight + 0.05],
    [width / 2, -length / 2, wallHeight + 0.05],
    [width / 2, length / 2, wallHeight + 0.05],
    [0, length / 2, wallHeight + roofHeight + 0.05],
    [-width / 2, length / 2, wallHeight + 0.05],
    [-width / 2, -length / 2, wallHeight + 0.05]
  ], '#111827', 2)
}

const addWindow = (name, x, y, z, side = 'front') => {
  const isSide = side === 'left' || side === 'right'
  addBuildingBox({
    name,
    offset: [x, y, z],
    dimensions: isSide ? [0.14, 1.3, 1.05] : [1.3, 0.14, 1.05],
    color: '#7dd3fc',
    outlineColor: '#0f172a'
  })
  addBuildingBox({
    name: `${name} frame-v`,
    offset: [x, y, z],
    dimensions: isSide ? [0.16, 0.08, 1.16] : [0.08, 0.16, 1.16],
    color: '#f8fafc',
    outlineColor: '#e5e7eb'
  })
  addBuildingBox({
    name: `${name} frame-h`,
    offset: [x, y, z],
    dimensions: isSide ? [0.16, 1.42, 0.08] : [1.42, 0.16, 0.08],
    color: '#f8fafc',
    outlineColor: '#e5e7eb'
  })
}

const addLod3Building = () => {
  if (!viewer) return

  const { width, length, wallHeight, roofHeight } = lod3Building
  const frontY = -length / 2 - 0.08
  const backY = length / 2 + 0.08
  const leftX = -width / 2 - 0.08
  const rightX = width / 2 + 0.08
  const windowX = width * 0.28
  const sideWindowY = length * 0.22
  const windowZ = wallHeight * 0.64
  const doorHeight = Math.min(2.1, wallHeight * 0.72)
  const doorWidth = Math.min(1.15, width * 0.22)

  addBuildingBox({
    name: 'LOD3 building foundation',
    offset: [0, 0, 0.08],
    dimensions: [width + 0.28, length + 0.28, 0.16],
    color: '#334155',
    outlineColor: '#0f172a'
  })

  addBuildingBox({
    name: 'LOD3 building walls',
    offset: [0, 0, wallHeight / 2],
    dimensions: [width, length, wallHeight],
    color: '#e8d7bd',
    outlineColor: '#334155'
  })

  addGabledRoof()

  addBuildingBox({
    name: 'LOD3 front door',
    offset: [0, frontY, doorHeight / 2],
    dimensions: [doorWidth, 0.16, doorHeight],
    color: '#7c4a28',
    outlineColor: '#111827'
  })

  addBuildingBox({
    name: 'LOD3 door handle',
    offset: [doorWidth * 0.32, frontY - 0.02, doorHeight * 0.55],
    dimensions: [0.12, 0.08, 0.12],
    color: '#facc15',
    outlineColor: '#92400e'
  })

  addWindow('LOD3 front window left', -windowX, frontY, windowZ)
  addWindow('LOD3 front window right', windowX, frontY, windowZ)
  addWindow('LOD3 back window left', -windowX, backY, windowZ)
  addWindow('LOD3 back window right', windowX, backY, windowZ)
  addWindow('LOD3 left side window', leftX, sideWindowY, windowZ, 'left')
  addWindow('LOD3 right side window', rightX, -sideWindowY, windowZ, 'right')

  ;[
    [-width / 2 + 0.12, -length / 2 + 0.12],
    [width / 2 - 0.12, -length / 2 + 0.12],
    [-width / 2 + 0.12, length / 2 - 0.12],
    [width / 2 - 0.12, length / 2 - 0.12]
  ].forEach(([x, y], index) => {
    addBuildingBox({
      name: `LOD3 corner column ${index + 1}`,
      offset: [x, y, wallHeight / 2],
      dimensions: [0.28, 0.28, wallHeight],
      color: '#d6c2a7',
      outlineColor: '#475569'
    })
  })

  addBuildingBox({
    name: 'LOD3 roof ridge cap',
    offset: [0, 0, wallHeight + roofHeight + 0.08],
    dimensions: [0.18, length + 0.18, 0.14],
    color: '#f8fafc',
    outlineColor: '#64748b'
  })
}

const stopBuildingOrbit = () => {
  if (orbitFrameId) {
    cancelAnimationFrame(orbitFrameId)
    orbitFrameId = null
  }

  if (viewer && !viewer.isDestroyed()) {
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  }
}

const orbitAroundBuilding = () => {
  if (!viewer) return

  stopBuildingOrbit()

  const startedAt = performance.now()
  const durationMs = 14000
  const startHeading = viewer.camera.heading || Cesium.Math.toRadians(-28)
  const pitch = Cesium.Math.toRadians(-34)
  const range = 58

  const orbitFrame = (time) => {
    if (!viewer || viewer.isDestroyed()) {
      orbitFrameId = null
      return
    }

    const progress = Math.min((time - startedAt) / durationMs, 1)
    const heading = startHeading + progress * Cesium.Math.TWO_PI

    viewer.camera.lookAt(
      buildingCameraTarget(),
      new Cesium.HeadingPitchRange(heading, pitch, range)
    )

    if (progress < 1) {
      orbitFrameId = requestAnimationFrame(orbitFrame)
      return
    }

    orbitFrameId = null
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  }

  orbitFrameId = requestAnimationFrame(orbitFrame)
}

const initViewer = async () => {
  destroyViewer()
  isLoading.value = true
  isReady.value = false
  markerScreenPosition.value = { x: 0, y: 0, visible: false }
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
    if (CESIUM_TOKEN) {
      Cesium.Ion.defaultAccessToken = CESIUM_TOKEN
    }
    console.log('3. Cesium config siap, create Viewer...')

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
      baseLayer: false,
      creditContainer: document.createElement('div')
    })

    console.log('4. Viewer dibuat!')

    // Use a real base map. Without this Cesium can show only a solid blue globe.
    applyBaseImagery()

    // Set ellipsoid terrain
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider()

    // Set background color
    applySceneTheme()
    viewer.scene.globe.depthTestAgainstTerrain = false
    viewer.scene.screenSpaceCameraController.enableRotate = true
    viewer.scene.screenSpaceCameraController.enableTilt = true
    viewer.scene.screenSpaceCameraController.enableLook = true
    viewer.scene.screenSpaceCameraController.enableTranslate = true
    viewer.scene.screenSpaceCameraController.enableZoom = true
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 25
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1200

    loadingStatus.value = 'Step 4: Build LOD 3 building...'
    console.log('5. Build LOD 3 building')
    addLod3Building()

    loadingStatus.value = 'Step 5: Lock location marker...'
    console.log('6. Lock location marker')
    bindMarkerOverlay()

    loadingStatus.value = 'Step 6: Fly to location...'
    console.log('7. Fly to location')

    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(buildingCameraTarget(), 9),
      {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(-28),
          Cesium.Math.toRadians(-36),
          58
        ),
        duration: 1,
        complete: updateMarkerOverlay
      }
    )

    loadingStatus.value = 'Selesai!'
    console.log('8. Selesai!')

    isLoading.value = false
    isReady.value = true

  } catch (error) {
    console.error('❌ Error:', error)
    loadError.value = error.message || 'Gagal memuat'
    isLoading.value = false
  }
}

onUnmounted(() => {
  destroyViewer()
})

onMounted(() => {
  initViewer()
})

watch(() => props.isDarkMode, () => {
  applySceneTheme()
  applyBaseImagery()
})
</script>

<style scoped>
.cesium-viewer {
  --viewer-bg: #eef7fb;
  --viewer-overlay: rgba(248, 250, 252, 0.92);
  --viewer-panel: rgba(255, 255, 255, 0.92);
  --viewer-border: rgba(15, 23, 42, 0.12);
  --viewer-text: #0f172a;
  --viewer-text-soft: #475569;
  --viewer-muted: #64748b;
  --viewer-accent: #0891b2;
  --viewer-error: #dc2626;
  --viewer-button-text: #ffffff;

  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--viewer-bg);
}

.cesium-viewer.dark {
  --viewer-bg: #0a0f1a;
  --viewer-overlay: rgba(10, 22, 40, 0.95);
  --viewer-panel: rgba(15, 23, 42, 0.95);
  --viewer-border: rgba(255, 255, 255, 0.1);
  --viewer-text: #f8fafc;
  --viewer-text-soft: #e2e8f0;
  --viewer-muted: #94a3b8;
  --viewer-accent: #00d4ff;
  --viewer-error: #fca5a5;
  --viewer-button-text: #001018;
}

.cesium-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.home-marker {
  position: absolute;
  z-index: 35;
  pointer-events: none;
}

.home-marker-dot {
  position: absolute;
  left: 0;
  top: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff1010;
  border: 4px solid #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
  transform: translate(-50%, -50%);
}

.home-marker-label {
  position: absolute;
  left: 0;
  top: -32px;
  transform: translateX(-50%);
  color: #ffffff;
  font: 600 16px Arial, sans-serif;
  text-shadow:
    -1px -1px 0 #0f172a,
    1px -1px 0 #0f172a,
    -1px 1px 0 #0f172a,
    1px 1px 0 #0f172a,
    0 2px 4px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
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
  background: var(--viewer-overlay);
  z-index: 100;
}

.loading-spinner { text-align: center; color: var(--viewer-text); }

.spinner {
  border: 4px solid rgba(8, 145, 178, 0.16);
  border-radius: 50%;
  border-top: 4px solid var(--viewer-accent);
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

.dark .spinner {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: var(--viewer-accent);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text { font-size: 18px; font-weight: 600; }
.loading-sub { font-size: 14px; color: var(--viewer-muted); margin-top: 8px; }

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--viewer-overlay);
  z-index: 100;
}

.error-content { text-align: center; color: var(--viewer-text); max-width: 400px; padding: 20px; }
.error-content h3 { font-size: 20px; font-weight: 700; color: var(--viewer-error); margin-bottom: 10px; }
.error-content p { color: var(--viewer-error); margin-bottom: 20px; }
.error-content button {
  padding: 12px 24px;
  background: var(--viewer-accent);
  color: var(--viewer-button-text);
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
  background: var(--viewer-panel);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  border: 1px solid var(--viewer-border);
  padding: 10px 14px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header { display: flex; align-items: center; gap: 8px; }
.card-icon { font-size: 18px; }
.card-title { font-weight: 700; color: var(--viewer-accent); font-size: 13px; }

.card-btn {
  padding: 6px 10px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.5);
  border-radius: 4px;
  color: #22c55e;
  font-size: 11px;
  cursor: pointer;
}

.orbit-btn {
  background: rgba(8, 145, 178, 0.18);
  border-color: rgba(8, 145, 178, 0.45);
  color: var(--viewer-accent);
}
</style>
