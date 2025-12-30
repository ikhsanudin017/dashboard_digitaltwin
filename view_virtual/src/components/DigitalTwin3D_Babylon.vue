<template>
  <div class="digital-twin-3d">
    <canvas ref="canvas" class="canvas-container"></canvas>
    
    <!-- Loading Indicator -->
    <div v-if="!modelLoaded" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading 3D Model... {{ loadingProgress.toFixed(0) }}%</p>
      </div>
    </div>
    
    <div class="controls">
      <button @click="resetCamera" class="btn btn-primary">🔄 Reset Kamera</button>
      <button @click="toggleAnimation" class="btn btn-primary">
        {{ isAnimating ? '⏸️ Pause' : '▶️ Play' }}
      </button>
    </div>
    
    <!-- Popup Detail Item -->
    <div v-if="selectedItem" class="item-popup" @click="closePopup">
      <div class="popup-content" @click.stop>
        <button class="close-btn" @click="closePopup">×</button>
        <h3>{{ selectedItem.name }}</h3>
        <div class="popup-details">
          <div v-for="(value, key) in selectedItem.data" :key="key" class="detail-row">
            <span class="detail-label">{{ formatLabel(key) }}:</span>
            <span class="detail-value">{{ formatValue(key, value) }}</span>
          </div>
        </div>
        <div class="popup-status">
          <span class="status-indicator" :class="selectedItem.status"></span>
          {{ selectedItem.statusText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders/glTF'

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({ temperature: 0, voltage: 0, current: 0, humidity: 0, power: 0 })
  },
  peopleCount: {
    type: Number,
    default: 0
  },
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

const canvas = ref(null)
const isAnimating = ref(true)
const selectedItem = ref(null)

let engine = null
let scene = null
let camera = null
let blenderModel = null
const modelLoaded = ref(false)
const loadingProgress = ref(0)

onMounted(() => {
  setTimeout(() => {
    if (canvas.value) {
      initBabylonJS()
    } else {
      console.error('Canvas element not found')
    }
  }, 100)
})

onUnmounted(() => {
  cleanup()
})

watch(() => props.sensorData, (newData) => {
  updateSensorVisualization(newData)
  if (selectedItem.value) {
    updateSelectedItem()
  }
}, { deep: true })

watch(() => props.peopleCount, (count) => {
  updatePeopleVisualization(count)
  if (selectedItem.value) {
    updateSelectedItem()
  }
})

watch(() => props.isDarkMode, () => {
  updateSceneTheme()
})

const updateSceneTheme = () => {
  if (!scene) return
  
  if (props.isDarkMode) {
    scene.clearColor = new BABYLON.Color4(0.06, 0.09, 0.16, 1)
  } else {
    scene.clearColor = new BABYLON.Color4(0.94, 0.97, 1, 1)
  }
}

const initBabylonJS = () => {
  if (!canvas.value) {
    console.error('Canvas not found')
    return
  }

  try {
    // Create engine
    engine = new BABYLON.Engine(canvas.value, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    })

    // Create scene
    scene = new BABYLON.Scene(engine)
    updateSceneTheme()
    
    // Enable fog
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2
    scene.fogDensity = 0.015
    scene.fogColor = props.isDarkMode 
      ? new BABYLON.Color3(0.06, 0.09, 0.16) 
      : new BABYLON.Color3(0.94, 0.97, 1)

    // Create camera
    camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 4,
      Math.PI / 3,
      15,
      new BABYLON.Vector3(0, 2, 0),
      scene
    )
    camera.attachControl(canvas.value, true)
    camera.lowerRadiusLimit = 5
    camera.upperRadiusLimit = 30
    camera.wheelPrecision = 50

    // Enhanced lighting
    const ambientLight = new BABYLON.HemisphericLight(
      "ambientLight",
      new BABYLON.Vector3(0, 1, 0),
      scene
    )
    ambientLight.intensity = 0.5

    // Main directional light
    const mainLight = new BABYLON.DirectionalLight(
      "mainLight",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    )
    mainLight.intensity = 0.8
    mainLight.position = new BABYLON.Vector3(10, 15, 10)

    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, mainLight)
    shadowGenerator.useBlurExponentialShadowMap = true
    shadowGenerator.blurScale = 2

    // Point lights
    const pointLight1 = new BABYLON.PointLight(
      "pointLight1",
      new BABYLON.Vector3(-3, 3, -3),
      scene
    )
    pointLight1.intensity = 0.6
    pointLight1.diffuse = new BABYLON.Color3(1, 0.9, 0.8)

    const pointLight2 = new BABYLON.PointLight(
      "pointLight2",
      new BABYLON.Vector3(3, 3, 3),
      scene
    )
    pointLight2.intensity = 0.6
    pointLight2.diffuse = new BABYLON.Color3(0.8, 0.9, 1)

    console.log('✅ Babylon.js initialized')

    // Prevent page scroll/zoom when scrolling on canvas - only zoom 3D view
    canvas.value.addEventListener('wheel', (event) => {
      event.preventDefault()
    }, { passive: false })

    // Load model
    loadModel(shadowGenerator)

    // Render loop
    engine.runRenderLoop(() => {
      if (scene && isAnimating.value) {
        scene.render()
      }
    })

    // Handle resize
    window.addEventListener('resize', () => {
      engine.resize()
    })

  } catch (error) {
    console.error('Error initializing Babylon.js:', error)
  }
}

const loadModel = (shadowGenerator) => {
  console.log('🏠 Loading floor plan model...')
  
  BABYLON.SceneLoader.ImportMesh(
    "",
    "/models/",
    "floor_plan.glb",
    scene,
    (meshes) => {
      console.log('✅ Model loaded successfully!')
      console.log('📦 Meshes loaded:', meshes.length)
      
      blenderModel = meshes[0]
      
      // Enable shadows for all meshes and change wall colors
      meshes.forEach((mesh) => {
        if (mesh) {
          mesh.receiveShadows = true
          shadowGenerator.addShadowCaster(mesh)
          
          // Change wall color to light beige/cream
          if (mesh.name && (mesh.name.includes('wall') || mesh.name.includes('Wall') || mesh.name.includes('WALL'))) {
            const wallMaterial = new BABYLON.StandardMaterial("wallMaterial_" + mesh.name, scene)
            wallMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.92, 0.85) // Light cream/beige
            wallMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1)
            mesh.material = wallMaterial
            console.log('🎨 Wall color changed:', mesh.name)
          }
          
          // Log mesh info
          if (mesh.name) {
            console.log('📦 Mesh:', mesh.name)
          }
        }
      })
      
      // Tambahkan AC unit di atas pintu
      createACUnit(shadowGenerator)
      
      modelLoaded.value = true
      loadingProgress.value = 100
      
      console.log('📊 Model info:', {
        meshes: meshes.length,
        position: blenderModel.position
      })
    },
    (event) => {
      if (event.lengthComputable) {
        loadingProgress.value = (event.loaded / event.total) * 100
        console.log(`⏳ Loading: ${loadingProgress.value.toFixed(1)}%`)
      }
    },
    (scene, message, exception) => {
      console.error('❌ Error loading model:', message, exception)
      console.error('⚠️ Pastikan file ada di: /public/models/floor_plan.glb')
      modelLoaded.value = true
    }
  )
}

const createACUnit = (shadowGenerator) => {
  console.log('🌬️ Creating AC unit...')
  
  // AC Body (main unit) - dipasang MENEMPEL di dinding
  const acBody = BABYLON.MeshBuilder.CreateBox("acBody", {
    width: 1.2,
    height: 0.25,
    depth: 0.35
  }, scene)
  
  // Posisi AC: MENEMPEL di dinding DARI DALAM RUANGAN, di atas pintu
  // X = 0 (sejajar dengan pintu coklat)
  // Y = 2.5 (di atas pintu)
  // Z = -4.5 (DI DALAM ruangan, menempel ke dinding yang ada di -5)
  acBody.position = new BABYLON.Vector3(0, 2.5, -2.3)
  acBody.rotation.y = 0 // Face ke dalam ruangan
  
  // Material AC
  const acMaterial = new BABYLON.StandardMaterial("acMaterial", scene)
  acMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9)
  acMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6)
  acMaterial.roughness = 0.3
  acBody.material = acMaterial
  
  // Front panel with vents
  const ventPanel = BABYLON.MeshBuilder.CreateBox("ventPanel", {
    width: 1.0,
    height: 0.2,
    depth: 0.02
  }, scene)
  ventPanel.position = new BABYLON.Vector3(0, 0, 0.18)
  
  const ventMaterial = new BABYLON.StandardMaterial("ventMaterial", scene)
  ventMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15)
  ventPanel.material = ventMaterial
  ventPanel.parent = acBody
  
  // Create horizontal vent slits
  for (let i = 0; i < 6; i++) {
    const vent = BABYLON.MeshBuilder.CreateBox(`vent${i}`, {
      width: 0.8,
      height: 0.015,
      depth: 0.01
    }, scene)
    vent.position = new BABYLON.Vector3(0, -0.06 + i * 0.025, 0.19)
    
    const slitMaterial = new BABYLON.StandardMaterial(`slitMaterial${i}`, scene)
    slitMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    vent.material = slitMaterial
    
    vent.parent = acBody
    shadowGenerator.addShadowCaster(vent)
  }
  
  // LED indicator (hijau = AC hidup)
  const led = BABYLON.MeshBuilder.CreateSphere("acLED", {
    diameter: 0.04
  }, scene)
  led.position = new BABYLON.Vector3(0.4, 0.08, 0.19)
  
  const ledMaterial = new BABYLON.StandardMaterial("ledMaterial", scene)
  ledMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0)
  ledMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 0)
  led.material = ledMaterial
  led.parent = acBody
  
  // Add glow effect
  const glowLayer = new BABYLON.GlowLayer("glow", scene)
  glowLayer.addIncludedOnlyMesh(led)
  glowLayer.intensity = 1.0
  
  // Louver/Air flow direction indicator
  const louver = BABYLON.MeshBuilder.CreateBox("louver", {
    width: 0.9,
    height: 0.08,
    depth: 0.01
  }, scene)
  louver.position = new BABYLON.Vector3(0, -0.13, 0.19)
  louver.rotation.x = Math.PI / 6 // Slight angle downward
  
  const louverMaterial = new BABYLON.StandardMaterial("louverMaterial", scene)
  louverMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3)
  louver.material = louverMaterial
  louver.parent = acBody
  
  // Enable shadows
  acBody.receiveShadows = true
  ventPanel.receiveShadows = true
  louver.receiveShadows = true
  
  shadowGenerator.addShadowCaster(acBody)
  shadowGenerator.addShadowCaster(ventPanel)
  shadowGenerator.addShadowCaster(louver)
  
  // Create particle system for cold air effect
  const particleSystem = new BABYLON.ParticleSystem("acParticles", 2000, scene)
  
  // Texture for particles (using a white dot)
  particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene)
  
  // Position where particles emit from (from AC vents)
  // AC body is at (0, 2.5, -4.5), emit from front vents
  particleSystem.emitter = acBody.position.clone()
  particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, -0.1, 0.18)
  particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, -0.05, 0.35)
  
  // Colors
  particleSystem.color1 = new BABYLON.Color4(0.7, 0.9, 1.0, 0.3)
  particleSystem.color2 = new BABYLON.Color4(0.8, 0.95, 1.0, 0.2)
  particleSystem.colorDead = new BABYLON.Color4(0.9, 0.98, 1.0, 0)
  
  // Size of particles
  particleSystem.minSize = 0.05
  particleSystem.maxSize = 0.15
  
  // Life time of particles
  particleSystem.minLifeTime = 0.5
  particleSystem.maxLifeTime = 1.5
  
  // Emission rate
  particleSystem.emitRate = 200
  
  // Blend mode
  particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD
  
  // Direction of particles (downward and forward into the room)
  particleSystem.direction1 = new BABYLON.Vector3(-0.3, -0.5, 0.5)
  particleSystem.direction2 = new BABYLON.Vector3(0.3, -0.8, 1.0)
  
  // Speed
  particleSystem.minEmitPower = 0.5
  particleSystem.maxEmitPower = 1.2
  particleSystem.updateSpeed = 0.01
  
  // Gravity effect (slight downward)
  particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0)
  
  // Start the particle system
  particleSystem.start()
  
  // Animation - subtle vibration effect
  let angle = 0
  scene.registerBeforeRender(() => {
    angle += 0.02
    acBody.position.y = 2.5 + Math.sin(angle) * 0.003
    
    // Update particle emitter position to follow AC body exactly
    particleSystem.emitter = acBody.position.clone()
  })
  
  console.log('✅ AC unit created above door INSIDE room at position:', acBody.position)
  console.log('✅ Cold air particle system started')
  console.log('   Mounted on interior wall above door')
}

const resetCamera = () => {
  if (camera) {
    camera.alpha = Math.PI / 4
    camera.beta = Math.PI / 3
    camera.radius = 15
    camera.target = new BABYLON.Vector3(0, 2, 0)
  }
}

const zoomIn = () => {
  if (camera) {
    camera.radius = Math.max(camera.radius - 2, camera.lowerRadiusLimit)
  }
}

const zoomOut = () => {
  if (camera) {
    camera.radius = Math.min(camera.radius + 2, camera.upperRadiusLimit)
  }
}

const toggleAnimation = () => {
  isAnimating.value = !isAnimating.value
}

const closePopup = () => {
  selectedItem.value = null
}

const updateSensorVisualization = (data) => {
  // Implement sensor visualization if needed
  console.log('Sensor data updated:', data)
}

const updatePeopleVisualization = (count) => {
  // Implement people count visualization if needed
  console.log('People count updated:', count)
}

const updateSelectedItem = () => {
  // Update selected item data
  if (selectedItem.value) {
    selectedItem.value.data = {
      temperature: props.sensorData.temperature,
      humidity: props.sensorData.humidity,
      voltage: props.sensorData.voltage,
      current: props.sensorData.current,
      power: props.sensorData.power
    }
  }
}

const formatLabel = (key) => {
  const labels = {
    temperature: 'Suhu',
    humidity: 'Kelembaban',
    voltage: 'Tegangan',
    current: 'Arus',
    power: 'Daya',
    peopleCount: 'Jumlah Orang'
  }
  return labels[key] || key
}

const formatValue = (key, value) => {
  const units = {
    temperature: '°C',
    humidity: '%',
    voltage: 'V',
    current: 'A',
    power: 'W',
    peopleCount: ' orang'
  }
  return `${value}${units[key] || ''}`
}

const cleanup = () => {
  if (engine) {
    engine.dispose()
  }
  window.removeEventListener('resize', () => {
    engine?.resize()
  })
}
</script>

<style scoped>
.digital-twin-3d {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
}

.canvas-container {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
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
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 10;
}

.loading-spinner {
  text-align: center;
  color: white;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid white;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 5;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.btn-secondary {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: white;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.item-popup {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 100;
}

.popup-content {
  background: white;
  padding: 25px;
  border-radius: 15px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 5px 10px;
}

.close-btn:hover {
  color: #333;
}

.popup-content h3 {
  margin: 0 0 20px 0;
  font-size: 22px;
  color: #333;
}

.popup-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.detail-label {
  font-weight: 600;
  color: #666;
}

.detail-value {
  color: #333;
  font-weight: 500;
}

.popup-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  font-weight: 500;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.normal {
  background: #10b981;
}

.status-indicator.warning {
  background: #f59e0b;
}

.status-indicator.critical {
  background: #ef4444;
}
</style>
