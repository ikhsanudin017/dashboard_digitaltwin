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
  showInfoCard: { type: Boolean, default: true },
  buildingLod: { type: Number, default: 3 }
})

const emit = defineEmits(['toggle-indoor', 'switch-to-3d'])

const housePosition = { lat: -7.7229652607057515, lon: 110.5187030823394 }
const houseCartesian = () => Cesium.Cartesian3.fromDegrees(housePosition.lon, housePosition.lat, 0)
const lod3Building = {
  width: 6.4,
  length: 8.4,
  wallHeight: 3.1,
  roofHeight: 1.05,
  headingDegrees: -6
}
const neighborhoodBuildings = [
  { id: 'home-west-white-roof', offset: [-7.5, 0.4], dimensions: [5.8, 8.0, 2.9], roofHeight: 0.42, roofColor: '#eef0ec', modules: 1, metal: true, frontSide: 'north' },
  { id: 'home-west-red-roof', offset: [-14.1, 0.2], dimensions: [6.5, 8.8, 3.0], roofHeight: 0.82, roofColor: '#7c4632', modules: 1, frontSide: 'north' },
  { id: 'home-west-shed', offset: [-22.4, 0.6], dimensions: [8.0, 7.3, 2.7], roofHeight: 0.38, roofColor: '#f3f4f2', modules: 1, metal: true, frontSide: 'north' },
  { id: 'home-west-corner', offset: [-31.5, 1.0], dimensions: [8.6, 8.2, 3.0], roofHeight: 0.78, roofColor: '#9a573a', modules: 2, frontSide: 'north' },
  { id: 'home-west-canopy', offset: [-29.5, -6.0], dimensions: [9.2, 3.8, 2.4], roofHeight: 0.26, roofColor: '#f8fafc', modules: 1, metal: true, frontSide: 'north' },

  { id: 'home-east-red-roof', offset: [7.6, 0.3], dimensions: [6.8, 8.8, 3.0], roofHeight: 0.86, roofColor: '#9f5b3d', modules: 1, frontSide: 'north' },
  { id: 'home-east-long-red', offset: [15.8, 0.6], dimensions: [6.8, 10.5, 3.1], roofHeight: 0.9, roofColor: '#7e4935', modules: 1, frontSide: 'north' },
  { id: 'home-east-white-strip', offset: [23.5, 0.8], dimensions: [6.4, 9.8, 2.8], roofHeight: 0.36, roofColor: '#f8fafc', modules: 1, metal: true, frontSide: 'north' },
  { id: 'home-east-large', offset: [33.5, 1.4], dimensions: [11.5, 9.5, 3.1], roofHeight: 0.86, roofColor: '#8f4d35', modules: 2, frontSide: 'north' },

  { id: 'north-west-vertical-a', offset: [-35.2, 22.5], dimensions: [6.8, 18.5, 3.2], roofHeight: 0.9, roofColor: '#6e4334', modules: 3, frontSide: 'east' },
  { id: 'north-west-vertical-b', offset: [-27.4, 22.0], dimensions: [7.2, 17.8, 3.1], roofHeight: 0.84, roofColor: '#9d5b3c', modules: 3, frontSide: 'east' },
  { id: 'north-west-metal-front', offset: [-24.4, 12.7], dimensions: [8.5, 4.6, 2.6], roofHeight: 0.32, roofColor: '#f8fafc', modules: 1, metal: true, frontSide: 'south' },

  { id: 'north-center-terrace-a', offset: [-9.5, 22.2], dimensions: [16.5, 6.2, 3.0], roofHeight: 0.82, roofColor: '#8a4c34', modules: 3, frontSide: 'south' },
  { id: 'north-center-terrace-b', offset: [9.0, 22.3], dimensions: [18.5, 6.2, 3.1], roofHeight: 0.86, roofColor: '#7b4532', modules: 4, frontSide: 'south' },
  { id: 'north-center-terrace-c', offset: [28.0, 22.1], dimensions: [16.5, 6.0, 3.1], roofHeight: 0.84, roofColor: '#9b5638', modules: 3, frontSide: 'south' },
  { id: 'north-center-white-canopy', offset: [5.0, 15.0], dimensions: [9.8, 4.5, 2.5], roofHeight: 0.32, roofColor: '#f8fafc', modules: 1, metal: true, frontSide: 'south' },

  { id: 'north-small-house-a', offset: [-8.8, 34.0], dimensions: [10.8, 8.8, 3.3], roofHeight: 0.98, roofColor: '#a05a3a', modules: 2, frontSide: 'south' },
  { id: 'north-small-house-b', offset: [5.1, 34.6], dimensions: [10.8, 9.4, 3.3], roofHeight: 1.0, roofColor: '#7f4b36', modules: 2, frontSide: 'south' },
  { id: 'north-east-villa', offset: [31.8, 35.0], dimensions: [12.0, 10.8, 3.4], roofHeight: 1.1, roofColor: '#b66a42', modules: 2, crossRoof: true, frontSide: 'south' },

  { id: 'east-road-house-a', offset: [47.0, 22.0], dimensions: [10.5, 14.0, 3.2], roofHeight: 0.82, roofColor: '#d7d2c8', modules: 2, metal: true, frontSide: 'west' },
  { id: 'east-road-house-b', offset: [49.0, 5.0], dimensions: [11.8, 12.0, 3.2], roofHeight: 0.86, roofColor: '#8c4e36', modules: 2, frontSide: 'west' },
  { id: 'east-road-small-a', offset: [60.0, 19.5], dimensions: [9.0, 7.8, 2.9], roofHeight: 0.76, roofColor: '#6f4030', modules: 1, frontSide: 'west' },
  { id: 'east-road-small-b', offset: [60.8, -1.5], dimensions: [8.8, 8.4, 2.9], roofHeight: 0.76, roofColor: '#b06542', modules: 1, frontSide: 'west' },

  { id: 'far-north-west-row', offset: [-48.5, 42.5], dimensions: [21.0, 6.2, 2.9], roofHeight: 0.72, roofColor: '#765044', modules: 4, frontSide: 'south' },
  { id: 'far-north-center-row', offset: [1.5, 47.0], dimensions: [23.0, 6.0, 2.9], roofHeight: 0.72, roofColor: '#8a4d35', modules: 4, frontSide: 'south' },
  { id: 'far-north-east-metal', offset: [54.0, 42.2], dimensions: [17.0, 9.5, 3.0], roofHeight: 0.38, roofColor: '#f1f5f9', modules: 2, metal: true, frontSide: 'west' },

  { id: 'far-south-east-house-a', offset: [47.0, -27.5], dimensions: [10.8, 9.2, 3.0], roofHeight: 0.78, roofColor: '#9c5738', modules: 2, frontSide: 'west' },
  { id: 'far-south-east-metal', offset: [58.0, -30.5], dimensions: [9.5, 7.0, 2.7], roofHeight: 0.34, roofColor: '#f8fafc', modules: 1, metal: true, frontSide: 'west' }
]
const roadSegments = [
  { id: 'home-front-road', offset: [2.0, 10.2], dimensions: [90, 5.2, 0.06] },
  { id: 'north-service-road', offset: [1.0, 39.5], dimensions: [88, 4.8, 0.06] },
  { id: 'west-lane', offset: [-42.5, 22.5], dimensions: [5.0, 42, 0.06] },
  { id: 'center-lane', offset: [-18.2, 27.0], dimensions: [4.4, 25, 0.06] },
  { id: 'east-lane', offset: [42.5, 17.0], dimensions: [5.0, 49, 0.06] },
  { id: 'far-east-lane', offset: [65.0, 10.0], dimensions: [4.6, 52, 0.06] },
  { id: 'south-east-drive', offset: [54.0, -18.5], dimensions: [4.4, 26, 0.06] }
]
const treeLayout = [
  [-55, 34, 2.6], [-54, 25, 2.2], [-53, 15, 2.4], [-50, 4, 2.5],
  [-43, -9, 2.8], [-38, -17, 3.0], [-32, -25, 3.3], [-26, -33, 3.0],
  [-18, -13, 2.9], [-15, -23, 3.4], [-9, -32, 3.0], [-2, -14, 2.8],
  [3, -24, 3.4], [10, -34, 3.1], [18, -18, 2.9], [25, -28, 2.8],
  [-55, -25, 3.1], [-46, -35, 3.3], [-35, -43, 3.0], [-22, -46, 3.2],
  [-8, -45, 3.0], [7, -43, 3.1], [22, -41, 2.7], [35, -35, 2.5],
  [-33, 41, 2.0], [-16, 43, 2.2], [17, 42, 2.2], [35, 43, 2.5],
  [30, 30, 1.4], [38, 31, 1.5], [53, 33, 2.4], [58, 10, 2.1],
  [55, -9, 2.0], [43, -18, 1.8], [-6, 13.8, 1.0], [19, 13.6, 1.0]
]
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
let buildingEntities = []
let buildingPrimitives = []
let orbitFrameId = null

const currentBuildingLod = () => {
  const lod = Number(props.buildingLod)
  if (!Number.isFinite(lod)) return 3
  return Math.min(4, Math.max(1, Math.round(lod)))
}

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

const clearBuilding = () => {
  if (!viewer || viewer.isDestroyed()) {
    buildingEntities = []
    buildingPrimitives = []
    return
  }

  buildingEntities.forEach(entity => viewer.entities.remove(entity))
  buildingPrimitives.forEach(primitive => viewer.scene.primitives.remove(primitive))
  buildingEntities = []
  buildingPrimitives = []
}

const destroyViewer = () => {
  stopBuildingOrbit()

  if (!viewer || viewer.isDestroyed()) {
    viewer = null
    return
  }

  clearBuilding()

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

const colorWithAlpha = (color, alpha = 1) =>
  Cesium.Color.fromCssColorString(color).withAlpha(alpha)

const addBuildingBox = ({ name, offset, dimensions, color, outlineColor = '#1f2937', alpha = 1 }) => {
  const entity = viewer.entities.add({
    name,
    position: localBuildingPoint(offset[0], offset[1], offset[2]),
    orientation: buildingOrientation(),
    box: {
      dimensions: new Cesium.Cartesian3(dimensions[0], dimensions[1], dimensions[2]),
      material: colorWithAlpha(color, alpha),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(outlineColor)
    }
  })
  buildingEntities.push(entity)
  return entity
}

const addBuildingPolyline = (name, localPoints, color = '#111827', width = 2) => {
  const entity = viewer.entities.add({
    name,
    polyline: {
      positions: localPoints.map(([x, y, z]) => localBuildingPoint(x, y, z)),
      width,
      material: Cesium.Color.fromCssColorString(color)
    }
  })
  buildingEntities.push(entity)
  return entity
}

const addBuildingPrimitive = primitive => {
  const addedPrimitive = viewer.scene.primitives.add(primitive)
  buildingPrimitives.push(addedPrimitive)
  return addedPrimitive
}

const addGabledRoof = ({
  namePrefix = 'LOD3',
  offset = [0, 0],
  width = lod3Building.width,
  length = lod3Building.length,
  wallHeight = lod3Building.wallHeight,
  roofHeight = lod3Building.roofHeight,
  color = '#9f3a32',
  outlineColor = '#111827',
  ridgeColor = '#f8fafc',
  alpha = 1,
  ridgeAxis = width > length * 1.25 ? 'x' : 'y'
} = {}) => {
  const vertices = ridgeAxis === 'x'
    ? [
        [-width / 2, -length / 2, wallHeight],
        [-width / 2, length / 2, wallHeight],
        [-width / 2, 0, wallHeight + roofHeight],
        [width / 2, -length / 2, wallHeight],
        [width / 2, length / 2, wallHeight],
        [width / 2, 0, wallHeight + roofHeight]
      ]
    : [
        [-width / 2, -length / 2, wallHeight],
        [width / 2, -length / 2, wallHeight],
        [0, -length / 2, wallHeight + roofHeight],
        [-width / 2, length / 2, wallHeight],
        [width / 2, length / 2, wallHeight],
        [0, length / 2, wallHeight + roofHeight]
      ]

  const positions = []
  vertices.forEach(([x, y, z]) => {
    const point = localBuildingPoint(offset[0] + x, offset[1] + y, z)
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

  addBuildingPrimitive(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            colorWithAlpha(color, alpha)
          )
        }
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        flat: true,
        translucent: alpha < 1
      }),
      asynchronous: false
    })
  )

  const ridgePoints = ridgeAxis === 'x'
    ? [
        [offset[0] - width / 2, offset[1], wallHeight + roofHeight + 0.04],
        [offset[0] + width / 2, offset[1], wallHeight + roofHeight + 0.04]
      ]
    : [
        [offset[0], offset[1] - length / 2, wallHeight + roofHeight + 0.04],
        [offset[0], offset[1] + length / 2, wallHeight + roofHeight + 0.04]
      ]

  const outlinePoints = ridgeAxis === 'x'
    ? [
        [offset[0] - width / 2, offset[1] - length / 2, wallHeight + 0.05],
        [offset[0] - width / 2, offset[1], wallHeight + roofHeight + 0.05],
        [offset[0] - width / 2, offset[1] + length / 2, wallHeight + 0.05],
        [offset[0] + width / 2, offset[1] + length / 2, wallHeight + 0.05],
        [offset[0] + width / 2, offset[1], wallHeight + roofHeight + 0.05],
        [offset[0] + width / 2, offset[1] - length / 2, wallHeight + 0.05],
        [offset[0] - width / 2, offset[1] - length / 2, wallHeight + 0.05]
      ]
    : [
        [offset[0] - width / 2, offset[1] - length / 2, wallHeight + 0.05],
        [offset[0], offset[1] - length / 2, wallHeight + roofHeight + 0.05],
        [offset[0] + width / 2, offset[1] - length / 2, wallHeight + 0.05],
        [offset[0] + width / 2, offset[1] + length / 2, wallHeight + 0.05],
        [offset[0], offset[1] + length / 2, wallHeight + roofHeight + 0.05],
        [offset[0] - width / 2, offset[1] + length / 2, wallHeight + 0.05],
        [offset[0] - width / 2, offset[1] - length / 2, wallHeight + 0.05]
      ]

  addBuildingPolyline(`${namePrefix} roof ridge`, ridgePoints, ridgeColor, 2)
  addBuildingPolyline(`${namePrefix} roof outline`, outlinePoints, outlineColor, 2)
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

const addSceneEllipsoid = ({ name, offset, radii, color, alpha = 1 }) => {
  const entity = viewer.entities.add({
    name,
    position: localBuildingPoint(offset[0], offset[1], offset[2]),
    ellipsoid: {
      radii: new Cesium.Cartesian3(radii[0], radii[1], radii[2]),
      material: colorWithAlpha(color, alpha)
    }
  })
  buildingEntities.push(entity)
  return entity
}

const addRoadNetwork = (lod) => {
  const roadColor = lod === 1 ? '#8c8c80' : '#4b5563'
  roadSegments.forEach(segment => {
    addBuildingBox({
      name: `road ${segment.id}`,
      offset: [segment.offset[0], segment.offset[1], segment.dimensions[2] / 2],
      dimensions: segment.dimensions,
      color: roadColor,
      outlineColor: '#2f3742',
      alpha: lod === 1 ? 0.48 : 0.72
    })
  })

  if (lod >= 3) {
    roadSegments.forEach(segment => {
      const [width, length] = segment.dimensions
      const [x, y] = segment.offset
      const horizontal = width >= length
      const lineLength = horizontal ? width : length
      const dashCount = Math.max(2, Math.floor(lineLength / 16))

      for (let i = 0; i < dashCount; i += 1) {
        const center = -lineLength / 2 + (lineLength / dashCount) * (i + 0.5)
        const halfDash = Math.min(4.2, lineLength / dashCount * 0.32)
        const points = horizontal
          ? [
              [x + center - halfDash, y, 0.11],
              [x + center + halfDash, y, 0.11]
            ]
          : [
              [x, y + center - halfDash, 0.11],
              [x, y + center + halfDash, 0.11]
            ]

        addBuildingPolyline(`road ${segment.id} center line ${i + 1}`, points, '#f8fafc', 1.2)
      }
    })
  }
}

const addTree = (name, x, y, scale = 1.5, lod = 3) => {
  if (lod <= 1 && scale < 1.8) return

  addBuildingBox({
    name: `${name} trunk`,
    offset: [x, y, 0.55 * scale],
    dimensions: [0.22 * scale, 0.22 * scale, 1.1 * scale],
    color: '#6b4f2a',
    outlineColor: '#4a3520'
  })

  addSceneEllipsoid({
    name: `${name} crown`,
    offset: [x, y, 1.35 * scale],
    radii: [0.9 * scale, 0.82 * scale, 0.72 * scale],
    color: lod <= 1 ? '#7b8f55' : '#3f7d35',
    alpha: 0.94
  })

  if (lod >= 4) {
    addSceneEllipsoid({
      name: `${name} highlight`,
      offset: [x - 0.2 * scale, y + 0.15 * scale, 1.65 * scale],
      radii: [0.44 * scale, 0.34 * scale, 0.24 * scale],
      color: '#6fa24e',
      alpha: 0.82
    })
  }
}

const addNeighborhoodTrees = (lod) => {
  treeLayout.forEach(([x, y, scale], index) => {
    addTree(`tree ${index + 1}`, x, y, scale, lod)
  })
}

const addNeighborRoofTexture = (building, lod) => {
  const [width, length, wallHeight] = building.dimensions
  const [x, y] = building.offset
  const roofHeight = building.roofHeight || 0.9
  const z = wallHeight + roofHeight + 0.12
  const ridgeAxis = building.ridgeAxis || (width > length * 1.25 ? 'x' : 'y')
  const stripSource = ridgeAxis === 'x' ? length : width
  const stripCount = lod >= 4
    ? Math.min(8, Math.max(4, Math.round(stripSource / 2.5)))
    : Math.min(4, Math.max(2, Math.round(stripSource / 5)))

  for (let i = 1; i < stripCount; i += 1) {
    const ribPoints = ridgeAxis === 'x'
      ? (() => {
          const stripY = y - length / 2 + (length / stripCount) * i
          return [
            [x - width / 2, stripY, z],
            [x + width / 2, stripY, z]
          ]
        })()
      : (() => {
          const stripX = x - width / 2 + (width / stripCount) * i
          return [
            [stripX, y - length / 2, z],
            [stripX, y + length / 2, z]
          ]
        })()

    addBuildingPolyline(`${building.id} roof rib ${i}`, ribPoints, lod >= 4 ? '#f1d0b5' : '#d6b293', lod >= 4 ? 1.3 : 1)
  }

  if (lod >= 3 && width > 12) {
    addBuildingBox({
      name: `${building.id} metal roof patch`,
      offset: [x + width * 0.28, y - length * 0.18, z + 0.03],
      dimensions: [Math.min(width * 0.24, 5.2), Math.min(length * 0.58, 7.5), 0.08],
      color: '#f1f5f9',
      outlineColor: '#94a3b8',
      alpha: lod >= 4 ? 0.92 : 0.78
    })
  }

  if (lod >= 4) {
    addBuildingBox({
      name: `${building.id} water tank`,
      offset: [x - width * 0.28, y + length * 0.25, wallHeight + roofHeight + 0.36],
      dimensions: [0.7, 0.7, 0.55],
      color: '#d8dee9',
      outlineColor: '#64748b'
    })
  }
}

const addNeighborFacade = (building, lod) => {
  if (lod < 3) return

  const [width, length, wallHeight] = building.dimensions
  const [x, y] = building.offset
  const modules = Math.max(1, building.modules || Math.round(width / 5))
  const frontSide = building.frontSide || 'south'
  const frontY = frontSide === 'north' ? y + length / 2 + 0.08 : y - length / 2 - 0.08
  const backY = frontSide === 'north' ? y - length / 2 - 0.08 : y + length / 2 + 0.08
  const frontX = frontSide === 'east' ? x + width / 2 + 0.08 : x - width / 2 - 0.08
  const backX = frontSide === 'east' ? x - width / 2 - 0.08 : x + width / 2 + 0.08
  const windowZ = wallHeight * 0.62
  const frontIsHorizontal = frontSide === 'north' || frontSide === 'south'
  const doorOffsetSign = frontSide === 'north' || frontSide === 'east' ? 1 : -1

  for (let i = 0; i < modules; i += 1) {
    if (frontIsHorizontal) {
      const moduleX = x - width / 2 + (width / modules) * (i + 0.5)
      const paneWidth = Math.min(1.05, width / modules * 0.38)

      addBuildingBox({
        name: `${building.id} front window ${i + 1}`,
        offset: [moduleX, frontY, windowZ],
        dimensions: [paneWidth, 0.12, 0.72],
        color: '#93c5fd',
        outlineColor: '#1e40af',
        alpha: 0.88
      })

      if (i % 2 === 0) {
        addBuildingBox({
          name: `${building.id} rear window ${i + 1}`,
          offset: [moduleX, backY, windowZ],
          dimensions: [paneWidth, 0.12, 0.68],
          color: '#bfdbfe',
          outlineColor: '#1e40af',
          alpha: 0.82
        })
      }
    } else {
      const moduleY = y - length / 2 + (length / modules) * (i + 0.5)
      const paneWidth = Math.min(1.05, length / modules * 0.38)

      addBuildingBox({
        name: `${building.id} front window ${i + 1}`,
        offset: [frontX, moduleY, windowZ],
        dimensions: [0.12, paneWidth, 0.72],
        color: '#93c5fd',
        outlineColor: '#1e40af',
        alpha: 0.88
      })

      if (i % 2 === 0) {
        addBuildingBox({
          name: `${building.id} rear window ${i + 1}`,
          offset: [backX, moduleY, windowZ],
          dimensions: [0.12, paneWidth, 0.68],
          color: '#bfdbfe',
          outlineColor: '#1e40af',
          alpha: 0.82
        })
      }
    }
  }

  if (frontIsHorizontal) {
    addBuildingBox({
      name: `${building.id} entry door`,
      offset: [x - width * 0.28, frontY + doorOffsetSign * 0.02, 0.95],
      dimensions: [0.85, 0.14, 1.9],
      color: '#7c4a28',
      outlineColor: '#422006'
    })
  } else {
    addBuildingBox({
      name: `${building.id} entry door`,
      offset: [frontX + doorOffsetSign * 0.02, y - length * 0.28, 0.95],
      dimensions: [0.14, 0.85, 1.9],
      color: '#7c4a28',
      outlineColor: '#422006'
    })
  }

  if (lod >= 4) {
    if (frontIsHorizontal) {
      addBuildingBox({
        name: `${building.id} front awning`,
        offset: [x - width * 0.28, frontY + doorOffsetSign * 0.42, 2.15],
        dimensions: [1.7, 0.78, 0.12],
        color: '#e5e7eb',
        outlineColor: '#64748b'
      })

      addBuildingBox({
        name: `${building.id} garden strip`,
        offset: [x, frontY + doorOffsetSign * 0.78, 0.08],
        dimensions: [Math.min(width - 1, 13), 0.45, 0.16],
        color: '#3f7d35',
        outlineColor: '#2f5d28',
        alpha: 0.88
      })
    } else {
      addBuildingBox({
        name: `${building.id} front awning`,
        offset: [frontX + doorOffsetSign * 0.42, y - length * 0.28, 2.15],
        dimensions: [0.78, 1.7, 0.12],
        color: '#e5e7eb',
        outlineColor: '#64748b'
      })

      addBuildingBox({
        name: `${building.id} garden strip`,
        offset: [frontX + doorOffsetSign * 0.78, y, 0.08],
        dimensions: [0.45, Math.min(length - 1, 13), 0.16],
        color: '#3f7d35',
        outlineColor: '#2f5d28',
        alpha: 0.88
      })
    }
  }
}

const addNeighborBuilding = (building, lod) => {
  const [width, length, wallHeight] = building.dimensions
  const [x, y] = building.offset
  const roofHeight = building.roofHeight || 0.9
  const namePrefix = `${building.id} LOD${lod}`

  addBuildingBox({
    name: `${namePrefix} foundation`,
    offset: [x, y, 0.08],
    dimensions: [width + 0.32, length + 0.32, 0.16],
    color: lod === 1 ? '#ddd8ca' : '#334155',
    outlineColor: '#1f2937',
    alpha: lod === 1 ? 0.44 : 0.74
  })

  if (lod === 1) {
    addBuildingBox({
      name: `${namePrefix} mass`,
      offset: [x, y, (wallHeight + roofHeight * 0.55) / 2],
      dimensions: [width, length, wallHeight + roofHeight * 0.55],
      color: '#f4f1e8',
      outlineColor: '#c8c0ad',
      alpha: 0.92
    })
    return
  }

  addBuildingBox({
    name: `${namePrefix} walls`,
    offset: [x, y, wallHeight / 2],
    dimensions: [width, length, wallHeight],
    color: lod >= 3 ? '#e6d6bf' : '#f1eadf',
    outlineColor: '#6b7280',
    alpha: lod >= 4 ? 0.96 : 0.9
  })

  if (building.metal) {
    addBuildingBox({
      name: `${namePrefix} metal roof`,
      offset: [x, y, wallHeight + roofHeight / 2],
      dimensions: [width + 0.24, length + 0.24, Math.max(0.16, roofHeight)],
      color: building.roofColor,
      outlineColor: lod >= 3 ? '#94a3b8' : '#b8b1a5',
      alpha: lod >= 4 ? 0.98 : 0.9
    })
  } else {
    addGabledRoof({
      namePrefix,
      offset: [x, y],
      width,
      length,
      wallHeight,
      roofHeight,
      color: building.roofColor,
      outlineColor: lod >= 3 ? '#3f2419' : '#7c6f64',
      ridgeColor: lod >= 3 ? '#f8fafc' : '#e7dfd2',
      alpha: lod >= 4 ? 0.98 : 0.9
    })
  }

  if (building.crossRoof && lod >= 2) {
    addBuildingBox({
      name: `${namePrefix} cross roof mass`,
      offset: [x, y, wallHeight + roofHeight * 0.38],
      dimensions: [width * 0.34, length * 1.12, 0.18],
      color: building.roofColor,
      outlineColor: '#3f2419',
      alpha: 0.95
    })
  }

  addNeighborRoofTexture(building, lod)
  addNeighborFacade(building, lod)
}

const addNeighborhoodBuildings = (lod) => {
  neighborhoodBuildings.forEach(building => addNeighborBuilding(building, lod))
}

const addFineNeighborhoodDetails = (lod) => {
  if (lod < 4) return

  ;[
    [-23, -14.5], [12, -14.2], [38, -13.8], [-16, 17.8], [42, 18]
  ].forEach(([x, y], index) => {
    addBuildingBox({
      name: `parked car ${index + 1}`,
      offset: [x, y, 0.45],
      dimensions: [1.55, 0.78, 0.5],
      color: index % 2 === 0 ? '#e5e7eb' : '#1f2937',
      outlineColor: '#111827'
    })
  })

  ;[
    [-41, -34, 14], [13, -38, 18], [43, 10, 19]
  ].forEach(([x, y, width], index) => {
    addBuildingBox({
      name: `neighborhood fence ${index + 1}`,
      offset: [x, y, 0.38],
      dimensions: [width, 0.12, 0.76],
      color: '#9ca3af',
      outlineColor: '#475569',
      alpha: 0.78
    })
  })
}

const addNeighborhoodScene = (lod) => {
  addRoadNetwork(lod)
  addNeighborhoodBuildings(lod)
  addNeighborhoodTrees(lod)
  addFineNeighborhoodDetails(lod)
}

const addLod1Building = () => {
  if (!viewer) return

  const { width, length, wallHeight, roofHeight } = lod3Building
  const massHeight = wallHeight + roofHeight * 0.8

  addBuildingBox({
    name: 'LOD1 building footprint',
    offset: [0, 0, 0.08],
    dimensions: [width + 0.28, length + 0.28, 0.16],
    color: '#ded8ca',
    outlineColor: '#c8c0ad',
    alpha: 0.55
  })

  addBuildingBox({
    name: 'LOD1 building mass',
    offset: [0, 0, massHeight / 2],
    dimensions: [width, length, massHeight],
    color: '#f4f1e8',
    outlineColor: '#c8c0ad'
  })
}

const addLod2Building = () => {
  if (!viewer) return

  const { width, length, wallHeight, roofHeight } = lod3Building

  addBuildingBox({
    name: 'LOD2 building foundation',
    offset: [0, 0, 0.08],
    dimensions: [width + 0.28, length + 0.28, 0.16],
    color: '#334155',
    outlineColor: '#0f172a'
  })

  addBuildingBox({
    name: 'LOD2 building walls',
    offset: [0, 0, wallHeight / 2],
    dimensions: [width, length, wallHeight],
    color: '#f1eadf',
    outlineColor: '#334155'
  })

  addGabledRoof({
    namePrefix: 'LOD2',
    color: '#a86645',
    outlineColor: '#7c6f64',
    ridgeColor: '#e7dfd2'
  })
}

const addLod3Building = ({ prefix = 'LOD3', wallAlpha = 1, roofAlpha = 1 } = {}) => {
  if (!viewer) return

  const { width, length, wallHeight, roofHeight } = lod3Building
  const frontY = length / 2 + 0.08
  const backY = -length / 2 - 0.08
  const leftX = -width / 2 - 0.08
  const rightX = width / 2 + 0.08
  const windowX = width * 0.28
  const sideWindowY = length * 0.22
  const windowZ = wallHeight * 0.64
  const doorHeight = Math.min(2.1, wallHeight * 0.72)
  const doorWidth = Math.min(1.15, width * 0.22)

  addBuildingBox({
    name: `${prefix} building foundation`,
    offset: [0, 0, 0.08],
    dimensions: [width + 0.28, length + 0.28, 0.16],
    color: '#334155',
    outlineColor: '#0f172a'
  })

  addBuildingBox({
    name: `${prefix} building walls`,
    offset: [0, 0, wallHeight / 2],
    dimensions: [width, length, wallHeight],
    color: '#e8d7bd',
    outlineColor: '#334155',
    alpha: wallAlpha
  })

  addGabledRoof({ namePrefix: prefix, alpha: roofAlpha })

  addBuildingBox({
    name: `${prefix} front door`,
    offset: [0, frontY, doorHeight / 2],
    dimensions: [doorWidth, 0.16, doorHeight],
    color: '#7c4a28',
    outlineColor: '#111827'
  })

  addBuildingBox({
    name: `${prefix} door handle`,
    offset: [doorWidth * 0.32, frontY - 0.02, doorHeight * 0.55],
    dimensions: [0.12, 0.08, 0.12],
    color: '#facc15',
    outlineColor: '#92400e'
  })

  addWindow(`${prefix} front window left`, -windowX, frontY, windowZ)
  addWindow(`${prefix} front window right`, windowX, frontY, windowZ)
  addWindow(`${prefix} back window left`, -windowX, backY, windowZ)
  addWindow(`${prefix} back window right`, windowX, backY, windowZ)
  addWindow(`${prefix} left side window`, leftX, sideWindowY, windowZ, 'left')
  addWindow(`${prefix} right side window`, rightX, -sideWindowY, windowZ, 'right')

  ;[
    [-width / 2 + 0.12, -length / 2 + 0.12],
    [width / 2 - 0.12, -length / 2 + 0.12],
    [-width / 2 + 0.12, length / 2 - 0.12],
    [width / 2 - 0.12, length / 2 - 0.12]
  ].forEach(([x, y], index) => {
    addBuildingBox({
      name: `${prefix} corner column ${index + 1}`,
      offset: [x, y, wallHeight / 2],
      dimensions: [0.28, 0.28, wallHeight],
      color: '#d6c2a7',
      outlineColor: '#475569'
    })
  })

  addBuildingBox({
    name: `${prefix} roof ridge cap`,
    offset: [0, 0, wallHeight + roofHeight + 0.08],
    dimensions: [0.18, length + 0.18, 0.14],
    color: '#f8fafc',
    outlineColor: '#64748b'
  })
}

const addLod4Building = () => {
  const { width, length, wallHeight, roofHeight } = lod3Building

  addLod3Building({ prefix: 'LOD4', wallAlpha: 1, roofAlpha: 1 })

  ;[-width * 0.28, 0, width * 0.28].forEach((x, index) => {
    addBuildingPolyline(`LOD4 roof tile rib ${index + 1}`, [
      [x, -length / 2, wallHeight + roofHeight + 0.16],
      [x, length / 2, wallHeight + roofHeight + 0.16]
    ], '#f1c7a8', 1.25)
  })

  addBuildingBox({
    name: 'LOD4 white metal canopy',
    offset: [width * 0.28, length * 0.22, wallHeight + roofHeight + 0.22],
    dimensions: [2.2, 1.4, 0.08],
    color: '#f8fafc',
    outlineColor: '#94a3b8',
    alpha: 0.96
  })

  addBuildingBox({
    name: 'LOD4 rooftop tank',
    offset: [-width * 0.28, length * 0.2, wallHeight + roofHeight + 0.48],
    dimensions: [0.55, 0.55, 0.62],
    color: '#e5e7eb',
    outlineColor: '#64748b'
  })

  addBuildingBox({
    name: 'LOD4 front path',
    offset: [0, length / 2 + 1.1, 0.05],
    dimensions: [2.0, 1.7, 0.1],
    color: '#d6d3d1',
    outlineColor: '#78716c',
    alpha: 0.86
  })

  addBuildingBox({
    name: 'LOD4 front garden',
    offset: [-width * 0.28, length / 2 + 0.82, 0.09],
    dimensions: [2.2, 0.56, 0.18],
    color: '#3f7d35',
    outlineColor: '#2f5d28'
  })

  addBuildingBox({
    name: 'LOD4 small parked vehicle',
    offset: [width * 0.58, length / 2 + 1.3, 0.38],
    dimensions: [1.18, 0.56, 0.42],
    color: '#1f2937',
    outlineColor: '#111827'
  })
}

const buildSelectedLodBuilding = () => {
  if (!viewer || viewer.isDestroyed()) return

  stopBuildingOrbit()
  clearBuilding()

  const lod = currentBuildingLod()
  addNeighborhoodScene(lod)

  switch (lod) {
    case 1:
      addLod1Building()
      break
    case 2:
      addLod2Building()
      break
    case 4:
      addLod4Building()
      break
    case 3:
    default:
      addLod3Building()
      break
  }

  updateMarkerOverlay()
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
  const range = 118

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
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1800

    loadingStatus.value = `Step 4: Build LOD ${currentBuildingLod()} building...`
    console.log(`5. Build LOD ${currentBuildingLod()} building`)
    buildSelectedLodBuilding()

    loadingStatus.value = 'Step 5: Lock location marker...'
    console.log('6. Lock location marker')
    bindMarkerOverlay()

    loadingStatus.value = 'Step 6: Fly to location...'
    console.log('7. Fly to location')

    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(buildingCameraTarget(), 42),
      {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(-28),
          Cesium.Math.toRadians(-36),
          118
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

watch(() => props.buildingLod, () => {
  buildSelectedLodBuilding()
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
