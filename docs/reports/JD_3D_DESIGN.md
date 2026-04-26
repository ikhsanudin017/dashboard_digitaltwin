# Jobdesk: 3D Design (Visualization & Art)

**Penanggung Jawab:** 3D Artist / UX Designer / Visualization Engineer
**Jobdesk Code:** 3D-01

---

## 1. Overview

Tim 3D Design bertanggung jawab untuk semua aspek visual Digital Twin — glTF model, Babylon.js scene, reactive materials, SCADA-style overlays, dan pengalaman user visualization yang immersive. Fokus: membuat data sensor "hidup" di dalam 3D environment.

### Tools & Stack

| Tool | Fungsi |
|------|--------|
| Blender | 3D modeling dan glTF export |
| Babylon.js 8.43 | 3D rendering engine (browser) |
| glTF 2.0 | 3D model format |
| PBR Materials | Physically-based rendering |
| Particle System | Visual effects (AC cold air) |
| Glow Layer | Emissive materials |
| Dynamic Texture | Real-time texture update |

---

## 2. Yang Sudah Ada (Fungsional)

### 2.1 3D Model (glTF)

**File:** `public/models/3d twin/scene.gltf`
**Textures:** 50+ texture files (walls, floors, furniture)

**Model contents:**
- Apartment scene dengan multiple rooms
- Walls, floor, ceiling
- Kitchen with appliances (refrigerator, stove, sink)
- Living room with sofa, TV
- Bedroom with bed, wardrobe
- AC wall-mounted unit (mesh terpisah untuk animasi)
- Furniture dan props
- Lighting objects

### 2.2 Babylon.js Scene Setup

**File:** `view_virtual/src/components/DigitalTwin3D_Babylon.vue`

**Features yang sudah ada:**
- [x] glTF scene loading dengan loader
- [x] PBR materials (walls, furniture)
- [x] AC unit mesh terpisah (identifikasi untuk animasi)
- [x] Cold-air particle system (falling cold air dari AC)
- [x] Glow layer untuk emissive objects
- [x] Dark/Light theme support
- [x] Camera orbit controls
- [x] Sensor overlay icons (floating label di atas mesh)
- [x] Mesh click interaction (partially disabled)
- [x] Responsive canvas sizing
- [x] Scene dispose on unmount

### 2.3 Current Visual Elements

| Element | Implementation |
|---------|----------------|
| AC unit mesh | `TransformNode` dengan child meshes |
| Cold air particles | `ParticleSystem` with downward gravity |
| Sensor icons | `Plane` mesh dengan dynamic texture label |
| Glow | `GlowLayer` dengan emissive materials |
| Lighting | HemisphericLight + DirectionalLight |
| Camera | `ArcRotateCamera` dengan orbit controls |

---

## 3. Yang Perlu Ditambahkan (Gap Analysis)

### 3.1 Reactive Materials — PRIORITY TINGGI

**Masalah:** Mesh materials tidak berubah sesuai sensor data. Scene terlihat static meskipun data real-time berubah.

**Kondisi saat ini:** Materials menggunakan static colors. Tidak ada binding ke sensor data.

**Fitur yang butuhkan:**

| Visual Feature | Sensor Data | Material Change |
|----------------|-------------|-----------------|
| **Temperature Heatmap** | `suhu` (20-35°C) | Wall/floor color: biru→hijau→kuning→merah |
| **Humidity Visualization** | `kelembaban` (0-100%) | Surface: matte→shiny, fog overlay |
| **Power Glow** | `daya` (0-500W) | Appliance meshes: emissive intensity |
| **People Density** | `jumlahOrang` | Floor: heatmap overlay |
| **AC Status** | `ac_power` | AC unit: blue glow (on) vs off |
| **Alert State** | threshold exceeded | Mesh pulse red, border highlight |

**Temperature Color Mapping:**

```javascript
const tempToColor = (temp) => {
  if (temp < 20) return new BABYLON.Color3(0, 0.5, 1)      // cold blue
  if (temp < 23) return new BABYLON.Color3(0, 1, 0.5)        // cool cyan
  if (temp < 26) return new BABYLON.Color3(0, 1, 0)          // normal green
  if (temp < 29) return new BABYLON.Color3(1, 0.8, 0)        // warm yellow
  if (temp < 32) return new BABYLON.Color3(1, 0.5, 0)       // hot orange
  return new BABYLON.Color3(1, 0, 0)                        // very hot red
}
```

**Implementation approach:**

```javascript
// Dalam DigitalTwin3D_Babylon.vue — reactive update
watch(sensorData, (data) => {
  // Update wall materials
  const wallMaterial = scene.getMaterialByName('wall_pbr')
  if (wallMaterial) {
    const color = tempToColor(data.temperature)
    wallMaterial.albedoColor = color
    wallMaterial.emissiveColor = color.scale(0.1) // subtle glow
  }

  // Update AC glow
  if (data.ac_power === 'on') {
    acGlowLayer.intensity = 1.0
    acUnitMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.6, 1)
  } else {
    acGlowLayer.intensity = 0.2
    acUnitMaterial.emissiveColor = BABYLON.Color3.Black()
  }
}, { deep: true })
```

### 3.2 SCADA-Style Overlay — PRIORITY TINGGI

**Masalah:** Tidak ada SCADA-style alarming visualization. Alert hanya di text/notification, tidak ada visual di 3D scene.

**Fitur yang butuhkan:**

| Feature | Description |
|---------|-------------|
| **Alert Mesh Highlight** | Alerted sensor mesh pulse dengan warna merah/kuning |
| **Threshold Indicator** | Color band di sensor label (green/yellow/red zone) |
| **Live Value Annotation** | Floating label dengan value real-time (tidak hanya nama) |
| **Trend Arrow** | Arrow indicator naik/turun dari trend |
| **Zone Boundary** | Visual boundary untuk room/zone |

**File baru:**

```javascript
// view_virtual/src/components/SCADAOverlay.vue
// Inline overlay atau separate component
const createSCADAOverlay = (scene) => {
  // Alert pulse animation
  const pulseAlert = (mesh, color) => {
    const animation = new BABYLON.Animation(
      "pulseAlert", "visibility", 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    )
    animation.setKeys([
      { frame: 0, value: 1 },
      { frame: 15, value: 0.3 },
      { frame: 30, value: 1 }
    ])
    mesh.animations = [animation]
    scene.beginAnimation(mesh, 0, 30, true)
  }

  // Zone boundary
  const createZoneBoundary = (name, position, size) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { size: 2 })
    plane.position = position
    // Animated dashed border effect
  }

  return { pulseAlert, createZoneBoundary }
}
```

### 3.3 Animated AC Unit — PRIORITY TINGGI

**Masalah:** AC unit mesh hanya static. Tidak ada animasi sesuai actual AC state.

**Fitur yang butuhkan:**

| Animation | Trigger |
|-----------|---------|
| **Fan Spin** | AC on → fan blades rotate |
| **Louver Swing** | AC on → louvers oscillate |
| **Cold Air Flow** | cooling active → particle intensity proportional |
| **LED Indicator** | power on/off → emissive LED color |
| **Filter Dirt** | time-based → texture overlay dirt accumulation |

**Implementation:**

```javascript
// AC fan animation
const acFan = scene.getMeshByName('ac_fan_blade')
if (acFan && sensorData.value.ac_power === 'on') {
  // Rotation animation
  acFan.rotation.y += 0.1 * deltaTime // continuous rotation
} else {
  // Decelerate to stop
  acFan.rotation.y *= 0.95
}

// Cold air particle intensity
const coldAirParticles = scene.getParticleSystemByName('cold_air')
if (sensorData.value.control_band === 'cooling') {
  coldAirParticles.emitRate = 100 // active
  coldAirParticles.minSize = 0.1
} else {
  coldAirParticles.emitRate = 10 // idle
}
```

### 3.4 Multi-Room Navigation — PRIORITY SEDANG

**Masalah:** 3D scene hanya tampilkan 1 ruangan. Tidak ada navigation antar ruangan.

**Fitur yang butuhkan:**

| Feature | Description |
|---------|-------------|
| **Room Selector** | Dropdown atau minimap untuk pilih ruangan |
| **Floor Plan View** | 2D top-down view sebagai navigation |
| **Camera Animation** | Smooth camera transition antar ruangan |
| **Room Boundary Highlight** | Highlight selected room |
| **Breadcrumb** | Show current room path |

**Implementation:**

```javascript
// Room camera positions
const roomCameras = {
  'living_room': { alpha: -1.5, beta: 1.0, radius: 8, target: (0, 1, 0) },
  'bedroom': { alpha: 0.5, beta: 1.0, radius: 6, target: (5, 1, -3) },
  'kitchen': { alpha: 2.0, beta: 1.0, radius: 5, target: (2, 1, 4) }
}

const navigateToRoom = (roomName) => {
  const camera = scene.activeCamera
  const target = roomCameras[roomName]

  // Animate camera transition
  const anim = new BABYLON.Animation(
    'cameraMove', 'position', 60,
    BABYLON.Animation.ANIMATIONTYPE_VECTOR3
  )
  // ... animation keys
  scene.beginDirectAnimation(camera, [anim], 0, 60, false)
}
```

### 3.5 People Density Heatmap — PRIORITY SEDANG

**Masalah:** People count tidak visualized di 3D scene. Hanya number di dashboard.

**Fitur yang butuhkan:**

| Feature | Description |
|---------|-------------|
| **Floor Heatmap** | Color gradient overlay berdasarkan people count |
| **Avatar Markers** | 3D marker di posisi orang terdeteksi |
| **Zone Capacity** | Progress bar per zone |
| **Occupancy Trend** | History chart di corner |

**Implementation:**

```javascript
// Create avatar markers untuk detected people
const createPersonMarker = (position) => {
  const sphere = BABYLON.MeshBuilder.CreateSphere('person_' + id, { diameter: 0.3 })
  sphere.position = position
  sphere.material = new BABYLON.StandardMaterial('personMat')
  sphere.material.emissiveColor = BABYLON.Color3.Green()

  // Animated glow
  const glow = new BABYLON.GlowLayer('personGlow')
  glow.addIncludedOnlyMesh(sphere)
}
```

### 3.6 Performance Optimization — PRIORITY SEDANG

**Masalah:** Scene dengan 50+ textures dan complex meshes bisa lag di mobile/low-end devices.

**Fitur yang butuhkan:**

| Technique | Implementation |
|-----------|----------------|
| **LOD (Level of Detail)** | Multiple mesh resolution |
| **Texture Compression** | DXT compression untuk textures |
| **Instanced Meshes** | Instanced rendering untuk repeated objects |
| **Frustum Culling** | Only render visible objects |
| **Deferred Shading** | Optimize complex materials |
| **Scene Optimization** | `freezeMaterials()`, `doNotSyncBoundingInfo` |

---

## 4. Technical Details

### 4.1 glTF Model Requirements

**Mesh naming convention** (untuk scripting):

```
Scene Root
├── LivingRoom/
│   ├── Floor
│   ├── Walls
│   ├── Sofa
│   ├── TV
│   └── AC_Unit/           ← AC control target
│       ├── Body
│       ├── Fan
│       ├── Louver
│       └── LED_Indicator
├── Bedroom/
│   ├── Floor
│   ├── Walls
│   ├── Bed
│   └── AC_Unit/
├── Kitchen/
│   ├── Floor
│   ├── Walls
│   ├── Counter
│   ├── Refrigerator
│   ├── Stove
│   └── AC_Unit/
├── SensorMarkers/
│   ├── Temp_Sensor_1
│   ├── Humidity_Sensor_1
│   └── Power_Meter
└── Furniture/
    ├── Chair
    ├── Table
    └── Lamp
```

**Material naming:**

```
wall_pbr          ← Temperature-reactive
floor_pbr         ← Temperature-reactive
ac_unit_body      ← AC status-reactive
refrigerator_pbr  ← Power glow
lamp_emissive     ← On/off state
sensor_marker     ← Status indicator
```

### 4.2 Babylon.js Material Setup

```javascript
// PBR material dengan emissive untuk reactivity
const wallMaterial = new BABYLON.PBRMaterial('wall_pbr', scene)
wallMaterial.albedoColor = BABYLON.Color3.White()
wallMaterial.metallic = 0.1
wallMaterial.roughness = 0.8
wallMaterial.emissiveColor = BABYLON.Color3.Black()
wallMaterial.emissiveIntensity = 0.1

// AC material dengan glow
const acMaterial = new BABYLON.PBRMaterial('ac_unit_body', scene)
acMaterial.albedoColor = BABYLON.Color3.White()
acMaterial.metallic = 0.8
acMaterial.roughness = 0.3
acMaterial.emissiveColor = BABYLON.Color3.Blue()
```

### 4.3 Particle System Config

```javascript
const createColdAirParticles = (scene) => {
  const particles = new BABYLON.ParticleSystem('cold_air', 500, scene)
  particles.particleTexture = new BABYLON.Texture('cold_air.png', scene)
  particles.emitter = new BABYLON.Vector3(0, 2.5, 0) // AC position
  particles.minEmitBox = new BABYLON.Vector3(-0.3, 0, -0.3)
  particles.maxEmitBox = new BABYLON.Vector3(0.3, 0, 0.3)
  particles.color1 = new BABYLON.Color4(0.7, 0.9, 1, 0.8)
  particles.color2 = new BABYLON.Color4(0.5, 0.8, 1, 0.4)
  particles.minSize = 0.05
  particles.maxSize = 0.15
  particles.minLifeTime = 1.0
  particles.maxLifeTime = 3.0
  particles.emitRate = 50
  particles.gravity = new BABYLON.Vector3(0, -0.5, 0)
  particles.direction1 = new BABYLON.Vector3(-0.2, -1, -0.2)
  particles.direction2 = new BABYLON.Vector3(0.2, -1, 0.2)
  particles.minEmitPower = 0.1
  particles.maxEmitPower = 0.3
  return particles
}
```

### 4.4 File yang Perlu Dibuat (New Files)

```
view_virtual/src/
├── components/
│   └── DigitalTwin3D_Babylon.vue   # UPDATE — reactive materials
├── lib/
│   ├── sceneMaterials.js            # Material definitions
│   ├── sceneAnimations.js           # Animation helpers
│   └── sceneOptimization.js          # LOD and performance
└── assets/
    ├── textures/
    │   ├── cold_air.png             # Particle texture
    │   └── heat_gradient.png         # Heatmap overlay
    └── models/
        └── apartment_simple.glb    # LOD low-res version
```

### 4.5 File yang Perlu Dimodifikasi

| File | Perubahan |
|------|-----------|
| `DigitalTwin3D_Babylon.vue` | Reactive materials, SCADA overlay, AC animations |

---

## 5. Asset Creation Checklist

### 5.1 glTF Model Checklist

- [ ] Consistent mesh naming (room_meshes, AC_Unit, etc.)
- [ ] PBR materials exported correctly
- [ ] Texture paths relative to glTF
- [ ] Animation clips (if any) properly exported
- [ ] LOD variations (high/medium/low) for performance
- [ ] Collision meshes for raycasting
- [ ] UV mapping optimized for texture tiling

### 5.2 Texture Checklist

- [ ] Diffuse/Albedo maps (2K resolution minimum)
- [ ] Normal maps for surface detail
- [ ] Roughness/Metallic maps for PBR
- [ ] Emissive maps for glow objects
- [ ] DXT compressed for web delivery
- [ ] Power-of-2 dimensions (512, 1024, 2048)
- [ ] Mipmaps generated

### 5.3 Animation Checklist

- [ ] AC fan rotation loop
- [ ] AC louver oscillation
- [ ] Cold air particle timing
- [ ] Camera transition smooth easing
- [ ] Alert pulse animation

---

## 6. Dependencies dengan Jobdesk Lain

| Jobdesk | Dependency | Notes |
|---------|-----------|-------|
| **Website** | Sensor data binding | `useAzureTelemetry.js` sensor data |
| **Website** | Alert state | `useAlerts.js` alert triggers |
| **IoT Hardware** | AC status data | `main.cpp` telemetry `ac_power` field |
| **IoT Hardware** | People count position | Camera detection data |

---

## 7. Timeline Suggestion

| Fase | Durasi | Fitur |
|------|--------|-------|
| **Phase 1** | 1-2 minggu | Reactive temperature materials |
| **Phase 2** | 1 minggu | AC unit animations (fan, louver, glow) |
| **Phase 3** | 1-2 minggu | SCADA overlay + alert visualization |
| **Phase 4** | 1 minggu | Multi-room navigation |
| **Phase 5** | 1-2 minggu | People density heatmap |
| **Phase 6** | 1 minggu | Performance optimization (LOD) |

---

## 8. Verification Checklist

- [ ] glTF model load tanpa error di Babylon.js
- [ ] Wall color berubah sesuai temperature data
- [ ] AC fan animate saat AC on
- [ ] Cold air particles intensity sesuai cooling state
- [ ] Alert mesh pulse saat threshold exceeded
- [ ] Camera smooth transition antar ruangan
- [ ] Frame rate > 30fps di mobile device
- [ ] Scene dispose properly on unmount (no memory leak)
- [ ] Dark/Light theme switch berfungsi

---

## 9. Reference Images / Inspiration

### SCADA Dashboard Style
- Industrial control system aesthetic
- Color-coded status (green/yellow/red)
- Monospace fonts untuk values
- Grid overlay
- Real-time trend sparklines

### Heatmap Visualization
- Color gradient overlay pada floor plan
- Opacity berdasarkan density
- Animated pulse untuk hot spots

---

## 10. Notes

- Babylon.js punya Performance Budget estimator — gunakan untuk validate performance target
- glTF sudah support animations dan skins — bisa export animated AC fan dari Blender
- Particle texture bisa generated dengan code (noise + gradient) atau dari asset
- Texture compression: use `.ktx2` format untuk GPU-compressed textures di mobile

**Next Action:** Mulai dari Phase 1 — update `DigitalTwin3D_Babylon.vue` dengan reactive temperature material. Buat helper function `tempToColor()` dan bind ke wall/floor meshes.