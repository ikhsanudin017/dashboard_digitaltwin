<template>
  <div class="digital-twin-3d">
    <div ref="container" class="canvas-container"></div>
    
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
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

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

const container = ref(null)
const isAnimating = ref(true)
const selectedItem = ref(null)
const clickedObjectData = ref(null) // Store clicked object's userData for real-time updates

let scene, camera, renderer, raycaster, mouse
let room, lights, sensors = []
let peopleIndicators = []
let animationId = null
let eventHandlers = {}
let hoveredObject = null
let acParticleSystem = null // Particle system untuk efek udara dingin AC

// Blender Model Variables
let blenderModel = null
const modelLoaded = ref(false)
const loadingProgress = ref(0)

onMounted(() => {
  // Wait for next tick to ensure DOM is ready
  setTimeout(() => {
    if (container.value) {
      initThreeJS()
      animate()
    } else {
      console.error('Container element not found')
    }
  }, 100)
})

onUnmounted(() => {
  cleanup()
})

watch(() => props.sensorData, (newData) => {
  updateSensorVisualization(newData)
  updateACParticles(newData) // Update partikel AC berdasarkan suhu
  // Update popup jika sedang terbuka
  if (selectedItem.value && clickedObjectData.value) {
    updateSelectedItem()
  }
}, { deep: true })

watch(() => props.peopleCount, (count) => {
  updatePeopleVisualization(count)
  // Update popup jika sedang terbuka
  if (selectedItem.value && clickedObjectData.value) {
    updateSelectedItem()
  }
})

// Watch theme changes
watch(() => props.isDarkMode, () => {
  updateSceneTheme()
})

// Update scene theme based on dark mode
const updateSceneTheme = () => {
  if (!scene) return
  
  if (props.isDarkMode) {
    // Dark mode colors
    scene.background = new THREE.Color(0x0f172a)
    if (scene.fog) {
      scene.fog.color.setHex(0x0f172a)
    } else {
      scene.fog = new THREE.FogExp2(0x0f172a, 0.015)
    }
  } else {
    // Light mode colors
    scene.background = new THREE.Color(0xf0f8ff)
    if (scene.fog) {
      scene.fog.color.setHex(0xf0f8ff)
    } else {
      scene.fog = new THREE.FogExp2(0xf0f8ff, 0.015)
    }
  }
}

const initThreeJS = () => {
  if (!container.value) {
    console.error('Container not found')
    return
  }

  try {
    // Scene dengan background gradient effect
    scene = new THREE.Scene()
    updateSceneTheme()

    // Camera dengan smooth controls
    const width = container.value.clientWidth || 800
    const height = container.value.clientHeight || 500
    camera = new THREE.PerspectiveCamera(
      55,
      width / height,
      0.1,
      1000
    )
    // Kamera fokus ke interior ruangan (inside building)
    camera.position.set(5, 3, 8) // Lebih dekat, di dalam ruangan
    camera.lookAt(0, 2, 0) // Fokus ke tengah ruangan

    // Renderer dengan enhanced quality dan realism settings
    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      logarithmicDepthBuffer: true // Better depth precision
    })
    renderer.setSize(width, height)
    
    // Enhanced shadow quality
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = true
    
    // Better tone mapping untuk realism (penting!)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.9 // Balanced - tidak terlalu terang atau gelap
    
    // Color management
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Pixel ratio untuk sharpness
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Enable physically correct lighting (PENTING untuk realism!)
    renderer.physicallyCorrectLights = true
    
    container.value.appendChild(renderer.domElement)
  } catch (error) {
    console.error('Error initializing Three.js:', error)
    return
  }

  // Enhanced lighting setup mirip Blender Eevee untuk MAXIMUM REALISM
  
  // Ambient light untuk base illumination - balanced
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)
  
  // Hemisphere light untuk natural sky/ground lighting
  const hemisphereLight = new THREE.HemisphereLight(
    0xffffff, // Sky color
    0x444444, // Ground color
    0.5
  )
  hemisphereLight.position.set(0, 20, 0)
  scene.add(hemisphereLight)

  // Main directional light (sun) dengan ultra-high-quality shadows
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8) // Balanced intensity
  directionalLight.position.set(20, 30, 15)
  directionalLight.castShadow = true
  
  // Ultra-high-quality shadow settings
  directionalLight.shadow.camera.left = -30
  directionalLight.shadow.camera.right = 30
  directionalLight.shadow.camera.top = 30
  directionalLight.shadow.camera.bottom = -30
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 100
  directionalLight.shadow.mapSize.width = 4096
  directionalLight.shadow.mapSize.height = 4096
  directionalLight.shadow.bias = -0.00005
  directionalLight.shadow.normalBias = 0.01
  directionalLight.shadow.radius = 2 // Soft shadows
  scene.add(directionalLight)

  // Fill light (bounce light dari dinding)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)
  fillLight.position.set(-20, 15, -15)
  scene.add(fillLight)

  // Rim light (edge lighting untuk depth)
  const rimLight = new THREE.DirectionalLight(0x88ccff, 0.6)
  rimLight.position.set(-25, 8, 25)
  scene.add(rimLight)

  // Accent point lights dengan better positioning
  const pointLight1 = new THREE.PointLight(0x4ecdc4, 0.8, 25)
  pointLight1.position.set(-8, 4, -8)
  pointLight1.castShadow = true
  pointLight1.shadow.mapSize.width = 1024
  pointLight1.shadow.mapSize.height = 1024
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8, 25)
  pointLight2.position.set(8, 4, -8)
  pointLight2.castShadow = true
  pointLight2.shadow.mapSize.width = 1024
  pointLight2.shadow.mapSize.height = 1024
  scene.add(pointLight2)

  // Warm accent light
  const warmLight = new THREE.PointLight(0xffd700, 0.5, 20)
  warmLight.position.set(0, 3, 8)
  scene.add(warmLight)

  // Raycaster untuk deteksi klik
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // Setup environment untuk realistic reflections
  setupEnvironment()
  
  // Load Blender Model (REPLACE createRoom)
  loadBlenderModel()

  // Sensors, AC, dan CCTV dibuat di createACAndSensors() setelah model load
  // Tidak perlu dipanggil di sini

  // Setup controls
  setupControls()

  // Setup click detection
  setupClickDetection()

  // Handle window resize
  eventHandlers.onWindowResize = onWindowResize
  window.addEventListener('resize', onWindowResize)
}

// Setup Environment Map untuk Realistic Reflections
const setupEnvironment = () => {
  // Create environment map (procedural)
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()
  
  // Create realistic gradient environment scene
  const envScene = new THREE.Scene()
  
  // Sky gradient with more saturation
  const skyGradient = new THREE.Color(0xb8d4ff) // More vibrant blue
  envScene.background = skyGradient
  
  // Add hemisphere light to environment
  const envHemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.0)
  envScene.add(envHemi)
  
  // Generate environment map
  const envMap = pmremGenerator.fromScene(envScene).texture
  scene.environment = envMap
  
  // Set scene background (bisa diubah sesuai dark/light mode)
  scene.background = new THREE.Color(props.isDarkMode ? 0x1a1a2e : 0xf0f8ff)
  
  pmremGenerator.dispose()
  
  console.log('✅ Environment map setup complete')
}

// Load 3D Model
const loadBlenderModel = () => {
  const loader = new GLTFLoader()
  
  console.log('🏠 Loading floor plan model...')
  
  loader.load(
    '/models/3d twin/floor_plan.glb',
    
    // onLoad - Success
    (gltf) => {
      blenderModel = gltf.scene
      
      // Setup posisi dan scale
      blenderModel.position.set(0, 0, 0)
      blenderModel.scale.set(1, 1, 1)
      
      // Enable shadows dan improve materials untuk MAXIMUM REALISM
      blenderModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          
          // Improve material quality
          if (child.material) {
            child.material.needsUpdate = true
            
            // Enhanced material properties untuk realism
            if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
              // Environment mapping untuk reflections (PENTING!)
              if (scene.environment) {
                child.material.envMap = scene.environment
                child.material.envMapIntensity = 1.0 // Balanced - tidak terlalu glossy
              }
              
              // Improve metalness & roughness
              child.material.metalness = child.material.metalness || 0
              child.material.roughness = Math.max(child.material.roughness || 0.5, 0.3)
              
              // Disable flat shading (penting untuk smooth surfaces)
              child.material.flatShading = false
              
              // Ensure correct side rendering
              child.material.side = THREE.FrontSide
              
              // Improve texture quality
              if (child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace
                child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy()
              }
              
              // Improve normal map
              if (child.material.normalMap) {
                child.material.normalScale.set(1, 1)
              }
            }
          }
          
          // Log object names untuk debugging
          if (child.name) {
            console.log('📦 Object:', child.name, '| Material:', child.material?.type)
          }
        }
      })
      
          // Tambahkan ke scene
          scene.add(blenderModel)
          
          // Sensor dinonaktifkan sementara
          // createACAndSensors()
          
          modelLoaded.value = true
          loadingProgress.value = 100
          
          console.log('✅ Model 3D berhasil dimuat!')
          console.log('📊 Model info:', {
            objects: blenderModel.children.length,
            position: blenderModel.position,
            scale: blenderModel.scale
          })
        },
        
        // onProgress
        (progress) => {
          if (progress.total > 0) {
            loadingProgress.value = (progress.loaded / progress.total) * 100
            console.log(`⏳ Loading: ${loadingProgress.value.toFixed(1)}%`)
          }
        },
        
        // onError
        (error) => {
          console.error('❌ Error loading 3D model:', error)
          console.error('⚠️ Pastikan file ada di: /models/3d twin/floor_plan.glb')
          
          // Fallback: gunakan room procedural jika model gagal load
          console.log('🔄 Fallback: Menggunakan room procedural')
          createRoom()
          modelLoaded.value = true
        }
      )
    }


// Fungsi untuk membuat AC, Sensors, dan CCTV (dipanggil baik pakai Blender model atau procedural room)
const createACAndSensors = () => {
  console.log('🌬️ Creating AC unit with particles...')
  
  // Create AC Unit dengan partikel dingin (di DALAM ruangan building)
  const acUnit = createACUnit()
  // AC di dinding kiri, DI ATAS sensor DHT11
  acUnit.position.set(-5.7, 4.5, 0) // MENEMPEL di dinding kiri, tinggi 4.5m (di atas sensor)
  acUnit.rotation.y = Math.PI / 2 // Flat against left wall
  acUnit.userData = {
    type: 'device',
    name: 'AC (Air Conditioner)',
    deviceType: 'ac',
    data: { 
      status: 'on', 
      temperature: props.sensorData.temperature,
      mode: 'cooling'
    }
  }
  scene.add(acUnit)
  
  // Create particle system untuk efek udara dingin
  acParticleSystem = createACParticleSystem()
  acParticleSystem.position.set(-5.4, 3.7, 0) // Di bawah AC, keluar dari dinding kiri
  acParticleSystem.rotation.y = Math.PI / 2 // Sesuai orientasi AC
  scene.add(acParticleSystem)
  console.log('✅ AC unit and particles created!')
  
  // Create sensors di dinding interior
  console.log('📡 Creating sensors...')
  createSensors()
  console.log('✅ Sensors created!')
  
  // Create CCTV Cameras (di dalam ruangan)
  console.log('📹 Creating CCTV cameras...')
  const cctvPositions = [
    { x: -5, y: 5.8, z: -5, rotation: Math.PI / 4 },      // Pojok kiri belakang (ceiling)
    { x: 5, y: 5.8, z: -5, rotation: -Math.PI / 4 },      // Pojok kanan belakang (ceiling)
  ]

  cctvPositions.forEach((pos, index) => {
    const cctv = createCCTV()
    cctv.position.set(pos.x, pos.y, pos.z)
    cctv.rotation.y = pos.rotation
    cctv.userData = {
      type: 'device',
      name: `CCTV Camera ${index + 1}`,
      deviceType: 'cctv',
      data: { 
        status: 'recording', 
        peopleDetected: props.peopleCount,
        angle: index * 90
      }
    }
    scene.add(cctv)
  })
  console.log('✅ CCTV cameras created!')
}

const createRoom = () => {
  // Enhanced floor dengan better material properties
  const floorGeometry = new THREE.PlaneGeometry(30, 30, 20, 20)
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xe8e8e8,
    roughness: 0.7,
    metalness: 0.05,
    envMapIntensity: 0.5
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Enhanced floor pattern dengan better visual depth
  const tileGroup = new THREE.Group()
  for (let i = -15; i < 15; i += 3) {
    for (let j = -15; j < 15; j += 3) {
      const isBorder = i % 6 === 0 || j % 6 === 0
      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(2.9, 2.9),
        new THREE.MeshStandardMaterial({ 
          color: isBorder ? 0xd0d0d0 : 0xf0f0f0,
          roughness: isBorder ? 0.4 : 0.6,
          metalness: isBorder ? 0.1 : 0.05
        })
      )
      tile.rotation.x = -Math.PI / 2
      tile.position.set(i, 0.005, j)
      tile.receiveShadow = true
      tileGroup.add(tile)
    }
  }
  scene.add(tileGroup)

  // Enhanced walls dengan better material properties
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xfafafa,
    roughness: 0.7,
    metalness: 0.02,
    envMapIntensity: 0.3
  })

  // Back wall
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 12),
    wallMaterial
  )
  backWall.position.set(0, 6, -15)
  backWall.receiveShadow = true
  scene.add(backWall)

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 12),
    wallMaterial
  )
  leftWall.rotation.y = Math.PI / 2
  leftWall.position.set(-15, 6, 0)
  leftWall.receiveShadow = true
  scene.add(leftWall)

  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 12),
    wallMaterial
  )
  rightWall.rotation.y = -Math.PI / 2
  rightWall.position.set(15, 6, 0)
  rightWall.receiveShadow = true
  scene.add(rightWall)

  // Enhanced ceiling dengan better lighting properties
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ 
      color: 0xf5f5f5,
      roughness: 0.8,
      metalness: 0.01,
      emissive: 0xffffff,
      emissiveIntensity: 0.05
    })
  )
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = 12
  ceiling.receiveShadow = true
  scene.add(ceiling)

  // Add ceiling lights
  for (let i = -10; i <= 10; i += 10) {
    for (let j = -10; j <= 10; j += 10) {
      const lightFixture = createCeilingLight()
      lightFixture.position.set(i, 11.8, j)
      scene.add(lightFixture)
    }
  }

  // AC, Sensors, dan CCTV dibuat lewat createACAndSensors()
  createACAndSensors()
}

const createCeilingLight = () => {
  const group = new THREE.Group()
  
  // Enhanced light fixture base dengan better material
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32),
    new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      metalness: 0.9, 
      roughness: 0.1,
      envMapIntensity: 1.0
    })
  )
  base.position.y = 0.1
  base.castShadow = true
  group.add(base)

  // Enhanced light glow dengan better emissive
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32),
    new THREE.MeshStandardMaterial({ 
      color: 0xffffdd, 
      transparent: true, 
      opacity: 0.8,
      emissive: 0xffffaa,
      emissiveIntensity: 1.2
    })
  )
  group.add(glow)

  // Inner glow ring
  const innerGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.03, 32),
    new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 2.0
    })
  )
  group.add(innerGlow)

  // Enhanced point light dengan better range
  const light = new THREE.PointLight(0xffffff, 1.2, 15, 2)
  light.position.set(0, 0, 0)
  light.castShadow = true
  light.shadow.mapSize.width = 512
  light.shadow.mapSize.height = 512
  group.add(light)

  // Store reference untuk animasi
  group.userData.glow = glow
  group.userData.innerGlow = innerGlow
  group.userData.light = light

  return group
}

const createACUnit = () => {
  const group = new THREE.Group()

  // Main AC body (realistis)
  const bodyGeometry = new THREE.BoxGeometry(5, 1.8, 0.4)
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.6,
    roughness: 0.2,
    envMapIntensity: 1.0
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.castShadow = true
  group.add(body)

  // Front panel (darker untuk depth)
  const frontPanel = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1.6, 0.05),
    new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0,
      metalness: 0.3,
      roughness: 0.4
    })
  )
  frontPanel.position.set(0, 0, 0.225)
  group.add(frontPanel)

  // Air vents (horizontal louvers)
  const ventMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2c3e50,
    metalness: 0.8,
    roughness: 0.2
  })
  
  for (let i = 0; i < 10; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.05, 0.1),
      ventMaterial
    )
    vent.position.set(0, -0.6 + (i * 0.14), 0.25)
    group.add(vent)
  }

  // Digital display panel (hijau)
  const displayGeometry = new THREE.PlaneGeometry(1.2, 0.4)
  const displayMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.9
  })
  const display = new THREE.Mesh(displayGeometry, displayMaterial)
  display.position.set(1.5, 0.5, 0.26)
  group.add(display)

  // Brand logo area
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.3),
    new THREE.MeshStandardMaterial({ 
      color: 0x3498db,
      metalness: 0.5,
      roughness: 0.3
    })
  )
  logo.position.set(-1.2, 0.6, 0.26)
  group.add(logo)

  // Power LED indicator (hijau = on)
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    })
  )
  led.position.set(-2, 0.6, 0.26)
  group.add(led)

  // LED glow effect
  const ledGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3
    })
  )
  ledGlow.position.set(-2, 0.6, 0.26)
  group.add(ledGlow)

  // Side panels untuk depth
  const sideMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xf5f5f5,
    metalness: 0.4,
    roughness: 0.3
  })
  
  const leftSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.8, 0.4),
    sideMaterial
  )
  leftSide.position.set(-2.5, 0, 0)
  group.add(leftSide)

  const rightSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.8, 0.4),
    sideMaterial
  )
  rightSide.position.set(2.5, 0, 0)
  group.add(rightSide)

  // Bottom air outlet (tempat partikel keluar)
  const outlet = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.2, 0.15),
    new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.1
    })
  )
  outlet.position.set(0, -0.95, 0.25)
  group.add(outlet)

  // Store references untuk animasi
  group.userData.display = display
  group.userData.led = led
  group.userData.ledGlow = ledGlow

  return group
}

const createCCTV = () => {
  const group = new THREE.Group()

  // CCTV Base (mount di langit-langit)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      metalness: 0.8,
      roughness: 0.2
    })
  )
  base.position.y = 0.1
  group.add(base)

  // CCTV Body (kotak kamera)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.1
    })
  )
  body.position.y = 0.3
  body.castShadow = true
  group.add(body)

  // CCTV Lens (lensa kamera)
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0x0000ff,
      emissiveIntensity: 0.3
    })
  )
  lens.position.set(0, 0.3, 0.3)
  group.add(lens)

  // CCTV LED indicator (merah - recording)
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1
    })
  )
  led.position.set(0.2, 0.4, 0.2)
  group.add(led)

  // CCTV Cable
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  )
  cable.position.y = -0.15
  group.add(cable)

  // Store references
  group.userData.led = led
  group.userData.lens = lens

  return group
}

const createSensors = () => {
  // Sensor Suhu & Kelembaban (DHT11) - di dinding ruangan interior
  const tempSensor = createWallMountedSensor(
    0xff6b6b, 
    'DHT11',
    'temperature',
    { temperature: props.sensorData.temperature, humidity: props.sensorData.humidity }
  )
  tempSensor.position.set(-5.5, 2.5, 0) // MENEMPEL di dinding kiri
  tempSensor.rotation.y = Math.PI / 2 // Flat against wall, menghadap kanan
  tempSensor.userData = {
    type: 'sensor',
    name: 'Sensor Suhu & Kelembaban (DHT11)',
    sensorType: 'temperature',
    data: { temperature: props.sensorData.temperature, humidity: props.sensorData.humidity }
  }
  scene.add(tempSensor)
  sensors.push({ mesh: tempSensor, type: 'temperature' })

  // Sensor Arus & Tegangan (ZMPT101B + SCT013) - di dinding interior
  const powerSensor = createWallMountedSensor(
    0x4ecdc4, 
    'ZMPT+SCT',
    'power',
    { voltage: props.sensorData.voltage, current: props.sensorData.current }
  )
  powerSensor.position.set(5.5, 3, 0) // MENEMPEL di dinding kanan (panel listrik)
  powerSensor.rotation.y = -Math.PI / 2 // Flat against wall, menghadap kiri
  powerSensor.userData = {
    type: 'sensor',
    name: 'Sensor Daya (ZMPT101B + SCT013)',
    sensorType: 'power',
    data: { voltage: props.sensorData.voltage, current: props.sensorData.current }
  }
  scene.add(powerSensor)
  sensors.push({ mesh: powerSensor, type: 'power' })

  // ESP32 Node
  const esp32Node = createDeviceNode(0xf39c12, 'ESP32', 'esp32')
  esp32Node.position.set(-4, 0.5, 0)
  esp32Node.userData = {
    type: 'device',
    name: 'ESP32 Node',
    deviceType: 'esp32',
    data: { status: 'online', connected: true }
  }
  scene.add(esp32Node)

  // Raspberry Pi Node
  const rpiNode = createDeviceNode(0x9b59b6, 'RPi 4', 'rpi')
  rpiNode.position.set(4, 0.5, 0)
  rpiNode.userData = {
    type: 'device',
    name: 'Raspberry Pi 4',
    deviceType: 'rpi',
    data: { status: 'online', peopleCount: props.peopleCount }
  }
  scene.add(rpiNode)
}

const createAdvancedSensor = (color, label, type, data) => {
  const group = new THREE.Group()

  // Enhanced main sensor body dengan better PBR
  const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5, 2, 2, 2)
  const material = new THREE.MeshStandardMaterial({ 
    color,
    emissive: color,
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 1.0
  })
  const box = new THREE.Mesh(geometry, material)
  box.castShadow = true
  box.receiveShadow = true
  group.add(box)

  // Enhanced glow effect dengan multiple rings
  const ringGeometry = new THREE.TorusGeometry(1.2, 0.08, 16, 32)
  const ringMaterial = new THREE.MeshStandardMaterial({ 
    color,
    transparent: true,
    opacity: 0.7,
    emissive: color,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.1
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.75
  group.add(ring)

  // Outer glow ring
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.05, 12, 24),
    new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.4
    })
  )
  outerRing.rotation.x = Math.PI / 2
  outerRing.position.y = 0.75
  group.add(outerRing)

  // Enhanced status indicator dengan pulse effect
  const indicatorGeometry = new THREE.SphereGeometry(0.25, 24, 24)
  const indicatorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x27ae60,
    emissive: 0x27ae60,
    emissiveIntensity: 1.5,
    metalness: 0.3,
    roughness: 0.7
  })
  const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial)
  indicator.position.y = 1.2
  indicator.castShadow = true
  group.add(indicator)

  // Glow sphere untuk indicator
  const indicatorGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshBasicMaterial({ 
      color: 0x27ae60,
      transparent: true,
      opacity: 0.3,
      emissive: 0x27ae60
    })
  )
  indicatorGlow.position.y = 1.2
  group.add(indicatorGlow)

  // Enhanced label plane dengan better visibility
  const labelGeometry = new THREE.PlaneGeometry(3.5, 1.0)
  const labelMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    transparent: true,
    opacity: 0.85,
    roughness: 0.5,
    metalness: 0.1
  })
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial)
  labelMesh.position.set(0, -1.2, 0)
  labelMesh.rotation.x = -Math.PI / 2
  labelMesh.receiveShadow = true
  group.add(labelMesh)

  // Store reference untuk animasi
  group.userData.ring = ring
  group.userData.outerRing = outerRing
  group.userData.indicator = indicator
  group.userData.indicatorGlow = indicatorGlow
  group.userData.box = box

  return group
}

const createDeviceNode = (color, label, type) => {
  const group = new THREE.Group()

  // Device body
  const geometry = new THREE.BoxGeometry(2, 1, 2)
  const material = new THREE.MeshStandardMaterial({ 
    color,
    metalness: 0.8,
    roughness: 0.2
  })
  const box = new THREE.Mesh(geometry, material)
  box.castShadow = true
  group.add(box)

  // LED indicators
  for (let i = 0; i < 3; i++) {
    const ledGeometry = new THREE.SphereGeometry(0.1, 8, 8)
    const ledMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 1
    })
    const led = new THREE.Mesh(ledGeometry, ledMaterial)
    led.position.set(-0.6 + i * 0.6, 0.6, 1.1)
    group.add(led)
  }

  return group
}

// Sensor yang mounted di dinding (lebih compact)
const createWallMountedSensor = (color, label, type, data) => {
  const group = new THREE.Group()

  // Sensor box (lebih tipis, menempel di dinding)
  const geometry = new THREE.BoxGeometry(0.8, 1, 0.3)
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.4,
    envMapIntensity: 0.8
  })
  const box = new THREE.Mesh(geometry, material)
  box.castShadow = true
  group.add(box)

  // Colored indicator panel
  const indicatorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.05),
    new THREE.MeshStandardMaterial({ 
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2
    })
  )
  indicatorPanel.position.set(0, 0.2, 0.18)
  group.add(indicatorPanel)

  // Status LED (hijau = active)
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    })
  )
  led.position.set(0, -0.3, 0.18)
  group.add(led)

  // LED glow
  const ledGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.4
    })
  )
  ledGlow.position.set(0, -0.3, 0.18)
  group.add(ledGlow)

  // Mounting bracket (simulasi mounting ke dinding)
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      metalness: 0.9,
      roughness: 0.2
    })
  )
  bracket.position.set(0, 0.55, 0)
  group.add(bracket)

  // Store references
  group.userData.led = led
  group.userData.ledGlow = ledGlow
  group.userData.indicatorPanel = indicatorPanel

  return group
}

// Particle system untuk efek udara dingin AC
const createACParticleSystem = () => {
  const particleCount = 500
  const geometry = new THREE.BufferGeometry()
  const positions = []
  const velocities = []

  // Inisialisasi posisi dan kecepatan partikel
  for (let i = 0; i < particleCount; i++) {
    // Spread horizontal dari AC outlet
    positions.push(
      (Math.random() - 0.5) * 4, // X: -2 to 2 (lebar AC outlet)
      Math.random() * 2, // Y: 0 to 2 (mulai dari outlet)
      (Math.random() - 0.5) * 0.5 // Z: slight depth
    )
    
    // Velocity untuk gerakan turun dan drift
    velocities.push(
      (Math.random() - 0.5) * 0.02, // X drift
      -0.02 - Math.random() * 0.03, // Y turun (gravitasi)
      (Math.random() - 0.5) * 0.01 // Z drift
    )
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3))

  // Material partikel (biru cyan transparan)
  const material = new THREE.PointsMaterial({
    color: 0x4dd0e1,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const particles = new THREE.Points(geometry, material)
  particles.userData.particleCount = particleCount
  
  return particles
}

// Update partikel AC berdasarkan suhu
const updateACParticles = (data) => {
  if (!acParticleSystem) return
  
  const temperature = data.temperature || 25
  
  // Atur intensitas berdasarkan suhu
  if (temperature < 25) {
    // AC full blast (suhu rendah)
    acParticleSystem.visible = true
    acParticleSystem.material.opacity = 0.7
    acParticleSystem.material.size = 0.1
  } else if (temperature < 28) {
    // AC sedang
    acParticleSystem.visible = true
    acParticleSystem.material.opacity = 0.5
    acParticleSystem.material.size = 0.08
  } else {
    // AC ringan atau mati
    acParticleSystem.visible = true
    acParticleSystem.material.opacity = 0.3
    acParticleSystem.material.size = 0.06
  }
}

const updateSensorVisualization = (data) => {
  sensors.forEach(sensor => {
    const mesh = sensor.mesh
    
    // Update userData
    if (sensor.type === 'temperature') {
      mesh.userData.data = { 
        temperature: data.temperature || 0, 
        humidity: data.humidity || 0 
      }
      
      // Update color berdasarkan suhu
      const temp = data.temperature || 0
      const normalizedTemp = Math.min(Math.max((temp - 15) / 15, 0), 1)
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0x4ecdc4),
        new THREE.Color(0xff6b6b),
        normalizedTemp
      )
      mesh.children[0].material.color = color
      // Pastikan material adalah MeshStandardMaterial sebelum set emissive
      if (mesh.children[0].material.type === 'MeshStandardMaterial') {
        mesh.children[0].material.emissive = color
      }
    } else if (sensor.type === 'current') {
      mesh.userData.data = { current: data.current || 0 }
      const current = data.current || 0
      const intensity = Math.min(current / 10, 1)
      // Pastikan material adalah MeshStandardMaterial sebelum set emissiveIntensity
      if (mesh.children[0].material.type === 'MeshStandardMaterial') {
        mesh.children[0].material.emissiveIntensity = 0.3 + intensity * 0.7
      }
    } else if (sensor.type === 'voltage') {
      mesh.userData.data = { voltage: data.voltage || 0 }
      const voltage = data.voltage || 0
      const intensity = Math.min(voltage / 220, 1)
      // Pastikan material adalah MeshStandardMaterial sebelum set emissiveIntensity
      if (mesh.children[0].material.type === 'MeshStandardMaterial') {
        mesh.children[0].material.emissiveIntensity = 0.3 + intensity * 0.7
      }
    } else if (sensor.type === 'power') {
      // Update untuk sensor power (voltage + current)
      mesh.userData.data = { 
        voltage: data.voltage || 0, 
        current: data.current || 0 
      }
      const voltage = data.voltage || 0
      const intensity = Math.min(voltage / 220, 1)
      if (mesh.userData.indicatorPanel && mesh.userData.indicatorPanel.material.type === 'MeshStandardMaterial') {
        mesh.userData.indicatorPanel.material.emissiveIntensity = 0.5 + intensity * 0.5
      }
    }
  })
}

const updatePeopleVisualization = (count) => {
  // Hapus indicator lama
  peopleIndicators.forEach(indicator => scene.remove(indicator))
  peopleIndicators = []

  // Buat indicator baru
  const maxDisplay = Math.min(count, 12)
  for (let i = 0; i < maxDisplay; i++) {
    const person = new THREE.Group()
    
    // Body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.8, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3498db,
      metalness: 0.3,
      roughness: 0.7
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.castShadow = true
    person.add(body)

    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.2
    head.castShadow = true
    person.add(head)

    // Position
    const row = Math.floor(i / 4)
    const col = i % 4
    person.position.set(
      -6 + col * 4,
      0.9,
      -6 + row * 4
    )
    
    person.userData = {
      type: 'person',
      name: `Orang ${i + 1}`,
      data: { index: i + 1 }
    }
    
    person.castShadow = true
    scene.add(person)
    peopleIndicators.push(person)
  }
}

const setupControls = () => {
  let isDragging = false
  let previousMousePosition = { x: 0, y: 0 }

  const onMouseDown = (e) => {
    isDragging = true
    previousMousePosition = { x: e.clientX, y: e.clientY }
  }

  const onMouseMove = (e) => {
    if (!isDragging) return

    const deltaX = e.clientX - previousMousePosition.x
    const deltaY = e.clientY - previousMousePosition.y

    const spherical = new THREE.Spherical()
    spherical.setFromVector3(camera.position)
    spherical.theta -= deltaX * 0.01
    spherical.phi += deltaY * 0.01
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))

    camera.position.setFromSpherical(spherical)
    camera.lookAt(0, 0, 0)

    previousMousePosition = { x: e.clientX, y: e.clientY }
  }

  const onMouseUp = () => {
    isDragging = false
  }

  const onWheel = (e) => {
    e.preventDefault()
    const distance = camera.position.length()
    const newDistance = distance + e.deltaY * 0.01
    if (newDistance > 10 && newDistance < 60) {
      camera.position.normalize().multiplyScalar(newDistance)
    }
  }

  if (renderer && renderer.domElement) {
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    eventHandlers = { onMouseDown, onMouseMove, onMouseUp, onWheel }
  }
}

const setupClickDetection = () => {
  if (!renderer || !renderer.domElement) return

  const onMouseClick = (event) => {
    if (!raycaster || !camera) return

    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    // Check semua objects yang bisa diklik
    const clickableObjects = [
      ...sensors.map(s => s.mesh),
      ...peopleIndicators,
      ...scene.children.filter(child => 
        child.userData && (
          child.userData.type === 'device' || 
          child.userData.type === 'sensor' ||
          child.userData.type === 'person'
        )
      )
    ]

    const intersects = raycaster.intersectObjects(clickableObjects, true)

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object
      let targetObject = clickedObject

      // Cari parent yang punya userData
      while (targetObject && !targetObject.userData.type) {
        targetObject = targetObject.parent
      }

      if (targetObject && targetObject.userData) {
        showItemDetails(targetObject)
      }
    }
  }

  const onMouseMove = (event) => {
    if (!raycaster || !camera) return

    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const clickableObjects = [
      ...sensors.map(s => s.mesh),
      ...peopleIndicators,
      ...scene.children.filter(child => 
        child.userData && (
          child.userData.type === 'device' || 
          child.userData.type === 'sensor' ||
          child.userData.type === 'person'
        )
      )
    ]

    const intersects = raycaster.intersectObjects(clickableObjects, true)

    if (intersects.length > 0) {
      const hovered = intersects[0].object
      let targetObject = hovered

      while (targetObject && !targetObject.userData.type) {
        targetObject = targetObject.parent
      }

      if (targetObject !== hoveredObject) {
        // Reset previous hover
        if (hoveredObject) {
          hoveredObject.scale.set(1, 1, 1)
        }

        hoveredObject = targetObject
        if (hoveredObject) {
          hoveredObject.scale.set(1.2, 1.2, 1.2)
          renderer.domElement.style.cursor = 'pointer'
        }
      }
    } else {
      if (hoveredObject) {
        hoveredObject.scale.set(1, 1, 1)
        hoveredObject = null
      }
      renderer.domElement.style.cursor = 'default'
    }
  }

  if (renderer && renderer.domElement) {
    renderer.domElement.addEventListener('click', onMouseClick)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    eventHandlers.onClick = onMouseClick
    eventHandlers.onHover = onMouseMove
  }
}

const updateSelectedItem = () => {
  if (!clickedObjectData.value) return
  
  const userData = clickedObjectData.value
  
  // Get current data
  let data = { ...userData.data }
  
  // Update dengan data real-time dari MQTT
  if (userData.sensorType === 'temperature') {
    // Hanya untuk sensor DHT11/DHT22, update suhu dan kelembaban
    data.temperature = props.sensorData.temperature
    data.humidity = props.sensorData.humidity
    // Hapus field yang tidak relevan
    delete data.current
    delete data.voltage
  } else if (userData.sensorType === 'current') {
    data.current = props.sensorData.current
    // Hapus field yang tidak relevan
    delete data.temperature
    delete data.humidity
    delete data.voltage
  } else if (userData.sensorType === 'voltage') {
    data.voltage = props.sensorData.voltage
    // Hapus field yang tidak relevan
    delete data.temperature
    delete data.humidity
    delete data.current
  } else if (userData.deviceType === 'rpi') {
    data.peopleCount = props.peopleCount
  } else if (userData.deviceType === 'ac') {
    data.temperature = props.sensorData.temperature
    data.status = 'on'
    data.mode = 'cooling'
    data.targetTemp = 24
  } else if (userData.deviceType === 'cctv') {
    data.peopleDetected = props.peopleCount
    data.status = 'recording'
    data.resolution = '1080p'
    data.storage = '64GB'
  }

  // Determine status berdasarkan data real-time
  let status = 'online'
  let statusText = 'Aktif'
  
  if (userData.type === 'sensor') {
    // Untuk sensor DHT11/DHT22, cek apakah ada data valid
    // Untuk temperature sensor, cek temperature dan humidity
    if (userData.sensorType === 'temperature') {
      const hasTemp = data.temperature !== undefined && data.temperature !== null
      const hasHum = data.humidity !== undefined && data.humidity !== null
      // Sensor online jika ada data temperature atau humidity (bisa 0 untuk suhu di tempat dingin)
      if (hasTemp || hasHum) {
        status = 'online'
        statusText = 'Aktif'
      } else {
        status = 'offline'
        statusText = 'Offline'
      }
    } else {
      // Untuk sensor lain (voltage, current), cek nilai bukan 0
      const value = Object.values(data)[0]
      if (value !== undefined && value !== null && value !== 0) {
        status = 'online'
        statusText = 'Aktif'
      } else {
        status = 'offline'
        statusText = 'Offline'
      }
    }
  } else if (userData.deviceType === 'ac') {
    status = data.status === 'on' ? 'online' : 'offline'
    statusText = data.status === 'on' ? 'Menyala' : 'Mati'
  } else if (userData.deviceType === 'cctv') {
    status = data.status === 'recording' ? 'online' : 'offline'
    statusText = data.status === 'recording' ? 'Merekam' : 'Tidak Aktif'
  }

  // Update selectedItem dengan data terbaru
  selectedItem.value = {
    name: userData.name,
    data,
    status,
    statusText
  }
}

const showItemDetails = (object) => {
  const userData = object.userData
  if (!userData) return

  // Simpan reference ke userData untuk update real-time
  clickedObjectData.value = userData
  
  // Update popup dengan data terbaru
  updateSelectedItem()
}

const closePopup = () => {
  selectedItem.value = null
  clickedObjectData.value = null // Clear reference saat popup ditutup
}

const formatLabel = (key) => {
  const labels = {
    temperature: 'Suhu',
    humidity: 'Kelembaban',
    voltage: 'Tegangan',
    current: 'Arus',
    power: 'Daya',
    peopleCount: 'Jumlah Orang',
    status: 'Status',
    connected: 'Terhubung'
  }
  return labels[key] || key
}

const formatValue = (key, value) => {
  if (key === 'temperature') {
    // Format temperature dengan 1 desimal
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    return `${!isNaN(numValue) ? numValue.toFixed(1) : value}°C`
  }
  if (key === 'humidity') {
    // Format humidity tanpa desimal (bulatkan)
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    return `${!isNaN(numValue) ? Math.round(numValue) : value}%`
  }
  if (key === 'voltage') return `${value}V`
  if (key === 'current') return `${value}A`
  if (key === 'power') return `${value}W`
  if (key === 'connected') return value ? 'Ya' : 'Tidak'
  if (key === 'status') return value === 'on' || value === 'recording' ? 'Aktif' : 'Tidak Aktif'
  if (key === 'mode') return value === 'cooling' ? 'Pendingin' : value
  if (key === 'targetTemp') return `${value}°C`
  if (key === 'peopleDetected') return `${value} orang`
  if (key === 'resolution') return value
  if (key === 'storage') return value
  return value
}

const animate = () => {
  if (!isAnimating.value) {
    animationId = requestAnimationFrame(animate)
    return
  }

  // Enhanced sensor animations dengan smooth effects
  const time = Date.now() * 0.001
  sensors.forEach((sensor, index) => {
    // Wall-mounted sensors - pulse LED glow
    if (sensor.mesh.userData.ledGlow) {
      const glowPulse = 0.3 + Math.sin(time * 3 + index) * 0.15
      sensor.mesh.userData.ledGlow.material.opacity = glowPulse
      const scale = 1 + Math.sin(time * 2 + index) * 0.15
      sensor.mesh.userData.ledGlow.scale.set(scale, scale, scale)
    }
    // Pulse LED
    if (sensor.mesh.userData.led && sensor.mesh.userData.led.material.type === 'MeshStandardMaterial') {
      const intensity = 1.5 + Math.sin(time * 4 + index) * 0.5
      sensor.mesh.userData.led.material.emissiveIntensity = intensity
    }
    // Pulse indicator panel
    if (sensor.mesh.userData.indicatorPanel && sensor.mesh.userData.indicatorPanel.material.type === 'MeshStandardMaterial') {
      const intensity = 0.6 + Math.sin(time * 2 + index) * 0.2
      sensor.mesh.userData.indicatorPanel.material.emissiveIntensity = intensity
    }
    
    // Old sensor animations (untuk sensor floating)
    if (sensor.mesh.userData.ring) {
      sensor.mesh.userData.ring.rotation.z += 0.015
      const pulse = 1 + Math.sin(time * 2 + index) * 0.1
      sensor.mesh.userData.ring.scale.set(pulse, pulse, 1)
    }
    if (sensor.mesh.userData.outerRing) {
      sensor.mesh.userData.outerRing.rotation.z -= 0.01
      const pulse = 1 + Math.sin(time * 1.5 + index) * 0.15
      sensor.mesh.userData.outerRing.scale.set(pulse, pulse, 1)
    }
  })

  // Enhanced people animations dengan smooth movement
  const peopleTime = Date.now() * 0.001
  peopleIndicators.forEach((person, index) => {
    person.rotation.y += 0.008
    // Smooth floating animation
    person.position.y = 0.9 + Math.sin(peopleTime * 1.5 + index * 0.5) * 0.08
    // Subtle rotation untuk natural movement
    person.rotation.x = Math.sin(peopleTime * 0.5 + index) * 0.05
  })

  // Animate AC dengan LED glow
  scene.children.forEach(child => {
    if (child.userData && child.userData.deviceType === 'ac') {
      // Pulse LED
      if (child.userData.led && child.userData.led.material.type === 'MeshStandardMaterial') {
        const intensity = 1.5 + Math.sin(Date.now() * 0.003) * 0.5
        child.userData.led.material.emissiveIntensity = intensity
      }
      // Pulse LED glow
      if (child.userData.ledGlow) {
        const glowPulse = 0.3 + Math.sin(Date.now() * 0.004) * 0.1
        child.userData.ledGlow.material.opacity = glowPulse
      }
      // Rotate display
      if (child.userData.display) {
        child.userData.display.rotation.z = Math.sin(Date.now() * 0.001) * 0.1
      }
    }
  })
  
  // Animate AC particles (efek udara dingin)
  if (acParticleSystem && acParticleSystem.visible) {
    const positions = acParticleSystem.geometry.attributes.position.array
    const velocities = acParticleSystem.geometry.attributes.velocity.array
    
    for (let i = 0; i < acParticleSystem.userData.particleCount; i++) {
      const i3 = i * 3
      
      // Update posisi berdasarkan velocity
      positions[i3] += velocities[i3] // X
      positions[i3 + 1] += velocities[i3 + 1] // Y (turun)
      positions[i3 + 2] += velocities[i3 + 2] // Z
      
      // Reset partikel yang sudah turun ke bawah
      if (positions[i3 + 1] < -5) {
        positions[i3] = (Math.random() - 0.5) * 4 // Reset X
        positions[i3 + 1] = 0 // Reset Y ke atas
        positions[i3 + 2] = (Math.random() - 0.5) * 0.5 // Reset Z
      }
      
      // Drift horizontal (angin)
      velocities[i3] += (Math.random() - 0.5) * 0.0005
      velocities[i3] = Math.max(-0.02, Math.min(0.02, velocities[i3]))
    }
    
    acParticleSystem.geometry.attributes.position.needsUpdate = true
  }

  // Enhanced CCTV camera animations
  const cctvTime = Date.now() * 0.001
  scene.children.forEach((child, index) => {
    if (child.userData && child.userData.deviceType === 'cctv') {
      // Smooth pan rotation dengan easing
      child.rotation.y += 0.0015 + Math.sin(cctvTime * 0.1 + index) * 0.0005
      // Enhanced pulse LED dengan better timing
      if (child.userData.led && child.userData.led.material.type === 'MeshStandardMaterial') {
        const intensity = 0.8 + Math.sin(cctvTime * 4 + index) * 0.4
        child.userData.led.material.emissiveIntensity = intensity
        // Scale pulse
        const scale = 1 + Math.sin(cctvTime * 6 + index) * 0.1
        child.userData.led.scale.set(scale, scale, scale)
      }
      // Enhanced lens reflection effect
      if (child.userData.lens) {
        child.userData.lens.rotation.y = Math.sin(cctvTime * 0.3 + index) * 0.15
        // Lens glow effect
        if (child.userData.lens.material.type === 'MeshStandardMaterial') {
          const lensIntensity = 0.3 + Math.sin(cctvTime * 2 + index) * 0.1
          child.userData.lens.material.emissiveIntensity = lensIntensity
        }
      }
    }
  })
  
  // Animate ceiling lights
  scene.children.forEach((child, index) => {
    if (child.userData && child.userData.glow) {
      const lightTime = Date.now() * 0.001
      const pulse = 1 + Math.sin(lightTime * 2 + index) * 0.05
      child.userData.glow.material.emissiveIntensity = 1.2 + Math.sin(lightTime * 3 + index) * 0.3
      if (child.userData.innerGlow) {
        child.userData.innerGlow.material.emissiveIntensity = 2.0 + Math.sin(lightTime * 4 + index) * 0.5
      }
    }
  })

  renderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

const resetCamera = () => {
  // Smooth camera transition
  const startPos = camera.position.clone()
  const targetPos = new THREE.Vector3(5, 3, 8) // Interior view
  const startTime = Date.now()
  const duration = 1000 // 1 second

  const animateCamera = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Easing function (easeInOutCubic)
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
    
    camera.position.lerpVectors(startPos, targetPos, eased)
    camera.lookAt(0, 2, 0) // Fokus ke tengah ruangan interior
    
    if (progress < 1) {
      requestAnimationFrame(animateCamera)
    }
  }
  
  animateCamera()
}

const toggleAnimation = () => {
  isAnimating.value = !isAnimating.value
}

const onWindowResize = () => {
  if (!container.value || !camera || !renderer) return
  
  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

const cleanup = () => {
  if (animationId) cancelAnimationFrame(animationId)
  
  if (renderer && renderer.domElement) {
    if (eventHandlers.onMouseDown) {
      renderer.domElement.removeEventListener('mousedown', eventHandlers.onMouseDown)
    }
    if (eventHandlers.onWheel) {
      renderer.domElement.removeEventListener('wheel', eventHandlers.onWheel)
    }
    if (eventHandlers.onClick) {
      renderer.domElement.removeEventListener('click', eventHandlers.onClick)
    }
    if (eventHandlers.onHover) {
      renderer.domElement.removeEventListener('mousemove', eventHandlers.onHover)
    }
  }
  
  if (eventHandlers.onMouseMove) {
    window.removeEventListener('mousemove', eventHandlers.onMouseMove)
  }
  if (eventHandlers.onMouseUp) {
    window.removeEventListener('mouseup', eventHandlers.onMouseUp)
  }
  if (eventHandlers.onWindowResize) {
    window.removeEventListener('resize', eventHandlers.onWindowResize)
  }
  
  if (renderer) {
    renderer.dispose()
  }
}
</script>

<style scoped>
.digital-twin-3d {
  width: 100%;
  position: relative;
}

.canvas-container {
  width: 100%;
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--three-bg-start) 0%, var(--three-bg-end) 50%, var(--three-bg-tertiary) 100%);
  position: relative;
  box-shadow: 
    0 10px 30px var(--shadow-md),
    0 0 0 1px var(--border-color) inset;
  backdrop-filter: blur(10px);
  transition: background 0.3s ease;
}

.controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.item-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

.popup-content {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px var(--shadow-lg);
  position: relative;
  animation: slideUp 0.3s;
  border: 1px solid var(--border-color);
  transition: background 0.3s ease, border-color 0.3s ease;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 32px;
  color: #7f8c8d;
  cursor: pointer;
  line-height: 1;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #e74c3c;
}

.popup-content h3 {
  margin: 0 0 20px 0;
  color: var(--text-primary);
  font-size: 24px;
  transition: color 0.3s ease;
}

.popup-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-dark);
  transition: border-color 0.3s ease;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.detail-value {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 18px;
  transition: color 0.3s ease;
}

.popup-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.3s ease;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #27ae60;
  box-shadow: 0 0 8px #27ae60;
}

.status-indicator.offline {
  background: #e74c3c;
  box-shadow: 0 0 8px #e74c3c;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  text-align: center;
  color: white;
}

.loading-spinner p {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 600;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #4ecdc4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .canvas-container {
    height: 300px;
  }
  
  .popup-content {
    padding: 20px;
  }
}
</style>
