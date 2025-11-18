<template>
  <div class="digital-twin-3d">
    <div ref="container" class="canvas-container"></div>
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

const props = defineProps({
  sensorData: {
    type: Object,
    default: () => ({ temperature: 0, voltage: 0, current: 0, humidity: 0, power: 0 })
  },
  peopleCount: {
    type: Number,
    default: 0
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

const initThreeJS = () => {
  if (!container.value) {
    console.error('Container not found')
    return
  }

  try {
    // Scene dengan background terang
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe8f4f8)
    // Tidak menggunakan fog untuk tampilan lebih terang

    // Camera
    const width = container.value.clientWidth || 800
    const height = container.value.clientHeight || 500
    camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    )
    camera.position.set(20, 15, 20)
    camera.lookAt(0, 0, 0)

    // Renderer dengan antialiasing dan shadow
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.value.appendChild(renderer.domElement)
  } catch (error) {
    console.error('Error initializing Three.js:', error)
    return
  }

  // Lighting yang lebih terang dan natural
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
  directionalLight.position.set(15, 20, 10)
  directionalLight.castShadow = true
  directionalLight.shadow.camera.left = -20
  directionalLight.shadow.camera.right = 20
  directionalLight.shadow.camera.top = 20
  directionalLight.shadow.camera.bottom = -20
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  // Additional directional light dari sisi lain untuk mengurangi shadow
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight2.position.set(-15, 15, -10)
  scene.add(directionalLight2)

  // Point light untuk accent (lebih subtle)
  const pointLight1 = new THREE.PointLight(0x4ecdc4, 0.3, 30)
  pointLight1.position.set(-5, 3, -5)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xff6b6b, 0.3, 30)
  pointLight2.position.set(5, 3, -5)
  scene.add(pointLight2)

  // Raycaster untuk deteksi klik
  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  // Create room
  createRoom()

  // Create sensors dengan detail lebih
  createSensors()

  // Setup controls
  setupControls()

  // Setup click detection
  setupClickDetection()

  // Handle window resize
  eventHandlers.onWindowResize = onWindowResize
  window.addEventListener('resize', onWindowResize)
}

const createRoom = () => {
  // Floor dengan texture pattern dan tiles (lebih terang)
  const floorGeometry = new THREE.PlaneGeometry(30, 30, 10, 10)
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xd5dbdb,
    roughness: 0.6,
    metalness: 0.1
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Add floor pattern (tiles) dengan warna lebih terang
  const tileGroup = new THREE.Group()
  for (let i = -15; i < 15; i += 3) {
    for (let j = -15; j < 15; j += 3) {
      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 2.8),
        new THREE.MeshStandardMaterial({ 
          color: i % 6 === 0 || j % 6 === 0 ? 0xcacfd2 : 0xd5dbdb,
          roughness: 0.5
        })
      )
      tile.rotation.x = -Math.PI / 2
      tile.position.set(i, 0.01, j)
      tileGroup.add(tile)
    }
  }
  scene.add(tileGroup)

  // Walls dengan detail (lebih terang)
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.05
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

  // Ceiling dengan detail (lebih terang)
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.7
    })
  )
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = 12
  scene.add(ceiling)

  // Add ceiling lights
  for (let i = -10; i <= 10; i += 10) {
    for (let j = -10; j <= 10; j += 10) {
      const lightFixture = createCeilingLight()
      lightFixture.position.set(i, 11.8, j)
      scene.add(lightFixture)
    }
  }

  // Create AC Unit (di dinding belakang)
  const acUnit = createACUnit()
  acUnit.position.set(-10, 8, -14.9)
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

  // Create CCTV Cameras (4 kamera di setiap sudut)
  const cctvPositions = [
    { x: -12, y: 10, z: -12, rotation: Math.PI / 4 },      // Sudut kiri belakang
    { x: 12, y: 10, z: -12, rotation: -Math.PI / 4 },       // Sudut kanan belakang
    { x: -12, y: 10, z: 12, rotation: 3 * Math.PI / 4 },   // Sudut kiri depan
    { x: 12, y: 10, z: 12, rotation: -3 * Math.PI / 4 }     // Sudut kanan depan
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
}

const createCeilingLight = () => {
  const group = new THREE.Group()
  
  // Light fixture base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 })
  )
  base.position.y = 0.1
  group.add(base)

  // Light glow
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0xffffaa, 
      transparent: true, 
      opacity: 0.6,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5
    })
  )
  group.add(glow)

  // Point light
  const light = new THREE.PointLight(0xffffff, 0.5, 10)
  light.position.set(0, 0, 0)
  group.add(light)

  return group
}

const createACUnit = () => {
  const group = new THREE.Group()

  // AC Body (kotak besar di dinding)
  const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 0.3)
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.7,
    roughness: 0.3
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.castShadow = true
  group.add(body)

  // AC Vents (lubang udara)
  const ventMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2c3e50,
    metalness: 0.9,
    roughness: 0.1
  })
  
  for (let i = 0; i < 8; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, 0.1),
      ventMaterial
    )
    vent.position.set(-1.5 + (i * 0.4), 0, 0.2)
    group.add(vent)
  }

  // AC Display Panel
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.3),
    new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8
    })
  )
  display.position.set(1.2, 0.3, 0.16)
  group.add(display)

  // AC Logo/Text
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x3498db })
  )
  logo.position.set(0, -0.5, 0.16)
  group.add(logo)

  // Status indicator (LED)
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 1
    })
  )
  led.position.set(-1.5, 0.5, 0.16)
  group.add(led)

  // Store references untuk animasi
  group.userData.display = display
  group.userData.led = led

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
  // Sensor Suhu (DHT22) - dengan glow effect
  const tempSensor = createAdvancedSensor(
    0xff6b6b, 
    'Sensor Suhu',
    'temperature',
    { temperature: props.sensorData.temperature, humidity: props.sensorData.humidity }
  )
  tempSensor.position.set(-8, 1.5, -8)
  tempSensor.userData = {
    type: 'sensor',
    name: 'Sensor Suhu (DHT22)',
    sensorType: 'temperature',
    data: { temperature: props.sensorData.temperature, humidity: props.sensorData.humidity }
  }
  scene.add(tempSensor)
  sensors.push({ mesh: tempSensor, type: 'temperature' })

  // Sensor Arus (SCT-013)
  const currentSensor = createAdvancedSensor(
    0x4ecdc4, 
    'Sensor Arus',
    'current',
    { current: props.sensorData.current }
  )
  currentSensor.position.set(8, 1.5, -8)
  currentSensor.userData = {
    type: 'sensor',
    name: 'Sensor Arus (SCT-013)',
    sensorType: 'current',
    data: { 
      current: props.sensorData.current,
      status: props.sensorData.currentStatus
    }
  }
  scene.add(currentSensor)
  sensors.push({ mesh: currentSensor, type: 'current' })

  // Sensor Tegangan (ZMPT101B)
  const voltageSensor = createAdvancedSensor(
    0x95e1d3, 
    'Sensor Tegangan',
    'voltage',
    { voltage: props.sensorData.voltage }
  )
  voltageSensor.position.set(0, 1.5, -8)
  voltageSensor.userData = {
    type: 'sensor',
    name: 'Sensor Tegangan (ZMPT101B)',
    sensorType: 'voltage',
    data: { 
      voltage: props.sensorData.voltage,
      status: props.sensorData.voltageStatus
    }
  }
  scene.add(voltageSensor)
  sensors.push({ mesh: voltageSensor, type: 'voltage' })

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

  // Main sensor body dengan glow
  const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
  const material = new THREE.MeshStandardMaterial({ 
    color,
    emissive: color,
    emissiveIntensity: 0.5,
    metalness: 0.7,
    roughness: 0.3
  })
  const box = new THREE.Mesh(geometry, material)
  box.castShadow = true
  group.add(box)

  // Glow effect dengan ring
  const ringGeometry = new THREE.TorusGeometry(1.2, 0.1, 8, 16)
  const ringMaterial = new THREE.MeshBasicMaterial({ 
    color,
    transparent: true,
    opacity: 0.6
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.75
  group.add(ring)

  // Status indicator (sphere di atas)
  const indicatorGeometry = new THREE.SphereGeometry(0.2, 16, 16)
  const indicatorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x27ae60,
    emissive: 0x27ae60,
    emissiveIntensity: 1
  })
  const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial)
  indicator.position.y = 1.2
  group.add(indicator)

  // Label plane
  const labelGeometry = new THREE.PlaneGeometry(3, 0.8)
  const labelMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000,
    transparent: true,
    opacity: 0.8
  })
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial)
  labelMesh.position.set(0, -1.2, 0)
  labelMesh.rotation.x = -Math.PI / 2
  group.add(labelMesh)

  // Store reference untuk animasi
  group.userData.ring = ring
  group.userData.indicator = indicator
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
    // Sensor suhu/kelembaban
    data.temperature = props.sensorData.temperature
    data.humidity = props.sensorData.humidity
  } else if (userData.sensorType === 'current') {
    data.current = props.sensorData.current
    data.status = props.sensorData.currentStatus
  } else if (userData.sensorType === 'voltage') {
    data.voltage = props.sensorData.voltage
    data.status = props.sensorData.voltageStatus
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
    if (userData.sensorType === 'temperature') {
      const hasTemp = data.temperature !== undefined && data.temperature !== null
      const hasHum = data.humidity !== undefined && data.humidity !== null
      if (hasTemp || hasHum) {
        status = 'online'
        statusText = 'Aktif'
      } else {
        status = 'offline'
        statusText = 'Offline'
      }
    } else if (userData.sensorType === 'current') {
      const currentStatus = props.sensorData.currentStatus
      if (currentStatus === 'terhubung') {
        status = 'online'
        statusText = 'Sensor Terhubung'
      } else {
        status = 'offline'
        statusText = 'Tidak Terhubung'
      }
    } else if (userData.sensorType === 'voltage') {
      const voltageStatus = props.sensorData.voltageStatus
      if (voltageStatus === 'terhubung') {
        status = 'online'
        statusText = 'Sensor Terhubung'
      } else {
        status = 'offline'
        statusText = 'Tidak Terhubung'
      }
    } else {
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
  if (key === 'status') {
    if (value === 'on' || value === 'recording') return 'Aktif'
    if (value === 'terhubung') return 'Terhubung'
    if (value === 'tidak_terhubung') return 'Tidak Terhubung'
    if (value === 'online') return 'Online'
    if (value === 'offline') return 'Offline'
    return value ?? 'Tidak Aktif'
  }
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

  // Animate sensors
  sensors.forEach(sensor => {
    if (sensor.mesh.userData.ring) {
      sensor.mesh.userData.ring.rotation.z += 0.02
    }
    sensor.mesh.rotation.y += 0.005
  })

  // Animate people
  peopleIndicators.forEach((person, index) => {
    person.rotation.y += 0.01
    person.position.y = 0.9 + Math.sin(Date.now() * 0.001 + index) * 0.1
  })

  // Animate AC
  scene.children.forEach(child => {
    if (child.userData && child.userData.deviceType === 'ac') {
      // Pulse LED
      if (child.userData.led && child.userData.led.material.type === 'MeshStandardMaterial') {
        const intensity = 0.5 + Math.sin(Date.now() * 0.003) * 0.5
        child.userData.led.material.emissiveIntensity = intensity
      }
      // Rotate display
      if (child.userData.display) {
        child.userData.display.rotation.z = Math.sin(Date.now() * 0.001) * 0.1
      }
    }
  })

  // Animate CCTV cameras (slow rotation)
  scene.children.forEach(child => {
    if (child.userData && child.userData.deviceType === 'cctv') {
      // Slow pan rotation
      child.rotation.y += 0.002
      // Pulse LED
      if (child.userData.led && child.userData.led.material.type === 'MeshStandardMaterial') {
        const intensity = 0.7 + Math.sin(Date.now() * 0.005) * 0.3
        child.userData.led.material.emissiveIntensity = intensity
      }
      // Lens reflection effect
      if (child.userData.lens) {
        child.userData.lens.rotation.y = Math.sin(Date.now() * 0.002) * 0.2
      }
    }
  })

  renderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

const resetCamera = () => {
  camera.position.set(20, 15, 20)
  camera.lookAt(0, 0, 0)
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
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #e8f4f8 0%, #d5e8f0 100%);
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideUp 0.3s;
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
  color: #2c3e50;
  font-size: 24px;
}

.popup-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #ecf0f1;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: #7f8c8d;
}

.detail-value {
  font-weight: 700;
  color: #2c3e50;
  font-size: 18px;
}

.popup-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-weight: 600;
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
