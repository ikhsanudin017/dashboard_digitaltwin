<template>
  <div ref="containerRef" class="twin-container" aria-label="Digital twin 3D scene">
    <canvas ref="heatmapCanvasRef" class="heatmap-canvas"></canvas>

    <div class="twin-overlay">
      <div class="twin-overlay-top">
        <div class="twin-title">
          Digital Twin Visualisation
          <span>Room {{ roomId }} - Comfort &amp; Energy Monitor</span>
        </div>
        <span class="badge" role="status" :data-status="status" :aria-label="`AC status ${status}`">
          <span class="legend-dot" :style="{ color: statusColor }"></span>
          {{ status }}
        </span>
      </div>

      <div class="twin-legend" role="group" aria-label="Sensor legend">
        <span><span class="legend-dot" style="color: #38bdf8"></span>Temp &amp; RH Sensors</span>
        <span><span class="legend-dot" style="color: #22c55e"></span>HVAC Units</span>
        <span><span class="legend-dot" style="color: #a855f7"></span>Occupancy Heatmap</span>
      </div>

      <div class="twin-overlay-bottom">
        <button
          class="control-button"
          type="button"
          aria-label="Recenter digital twin camera"
          @click="recenterCamera"
        >
          Recenter
        </button>
      </div>
    </div>

    <div
      ref="popoverRef"
      class="popover"
      :class="{ visible: popover.visible }"
      role="dialog"
      aria-modal="false"
      aria-live="polite"
    >
      <div class="popover-header">
        <span>{{ popover.title }}</span>
        <span :style="{ color: statusColor, fontWeight: 600 }">{{ status }}</span>
      </div>
      <div class="popover-body">
        <div>Current Temp</div>
        <div>{{ tempC.toFixed(1) }} &deg;C</div>
        <div>Average (15m)</div>
        <div>{{ popover.avgTemp.toFixed(1) }} &deg;C</div>
        <div>Current Watt</div>
        <div>{{ watt.toFixed(0) }} W</div>
        <div>KWh Total</div>
        <div>{{ kwhTotal.toFixed(2) }} kWh</div>
      </div>
      <svg class="sparkline" viewBox="0 0 120 40" role="img" aria-label="Energy trend sparkline">
        <path :d="sparklinePath" />
      </svg>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
  computed,
  PropType,
  reactive,
  nextTick,
  defineExpose,
  toRefs
} from 'vue';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import {
  createMaterialSet,
  buildRoomShell,
  buildCeilingGrid,
  buildLedPanels,
  buildWindows,
  buildDoor,
  buildWhiteboardAndScreen,
  buildDesksInstanced,
  buildTeacherDesk,
  buildProjector,
  buildCableTray,
  buildMCB,
  buildACUnits,
  buildSensors,
  buildCameraDome,
  buildRaspberryPi,
  buildClampCT
} from './twin/builders';
import type { ACUnitDescriptor } from './twin/builders';
import './twin/overlay.css';

const props = defineProps({
  roomId: { type: String, default: 'room-101' },
  status: {
    type: String as PropType<'NORMAL' | 'WARNING' | 'CRITICAL'>,
    default: 'NORMAL'
  },
  tempC: { type: Number, default: 24.5 },
  rh: { type: Number, default: 58 },
  watt: { type: Number, default: 820 },
  kwhTotal: { type: Number, default: 12.34 },
  occupancy: { type: Number, default: 27 },
  occupancyGrid: {
    type: Array as PropType<number[]>,
    default: () => []
  },
  sparkline: {
    type: Array as PropType<number[]>,
    default: () => []
  }
});

const emit = defineEmits<(event: 'acSelected', payload: { id: 'ac-left' | 'ac-right' }) => void>();

const { roomId, status, tempC, watt, kwhTotal, occupancy, occupancyGrid, sparkline } =
  toRefs(props);

const containerRef = ref<HTMLDivElement | null>(null);
const heatmapCanvasRef = ref<HTMLCanvasElement | null>(null);
const popoverRef = ref<HTMLDivElement | null>(null);

const statusColors = {
  NORMAL: '#22c55e',
  WARNING: '#eab308',
  CRITICAL: '#ef4444'
} as const;

const statusColor = computed(() => statusColors[status.value] ?? statusColors.NORMAL);

const popover = reactive({
  visible: false,
  title: '',
  avgTemp: tempC.value,
  screenX: 0,
  screenY: 0
});

const sparklinePath = computed(() => {
  const data = sparkline.value.length
    ? sparkline.value
    : Array.from({ length: 30 }, () => watt.value);
  const width = 120;
  const height = 40;
  const padding = 4;
  let min = Math.min(...data);
  let max = Math.max(...data);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  return data
    .map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
});

let renderer: THREE.WebGLRenderer | null = null;
let composer: EffectComposer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationId = 0;
let clock: THREE.Clock | null = null;

const acUnits: ACUnitDescriptor[] = [];
const ledMaterialRef = ref<THREE.MeshStandardMaterial | null>(null);
const seatCenters: THREE.Vector3[] = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredAC: ACUnitDescriptor | null = null;
let selectedAC: ACUnitDescriptor | null = null;

const heatmapNeedsUpdate = ref(true);

const toScreenPosition = (vector: THREE.Vector3, target = new THREE.Vector2()) => {
  if (!camera || !renderer) return target.set(0, 0);
  const widthHalf = renderer.domElement.clientWidth / 2;
  const heightHalf = renderer.domElement.clientHeight / 2;
  const projected = vector.clone().project(camera);
  target.set(projected.x * widthHalf + widthHalf, -(projected.y * heightHalf) + heightHalf);
  return target;
};

const drawHeatmap = () => {
  if (!heatmapNeedsUpdate.value) return;
  const canvas = heatmapCanvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !camera || !renderer) return;
  const { width, height } = renderer.domElement;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.clearRect(0, 0, width, height);

  if (!seatCenters.length) return;
  const values = occupancyGrid.value.length === seatCenters.length ? occupancyGrid.value : [];
  const maxValue = values.length ? Math.max(...values, 0.01) : 1;
  const tempVec = new THREE.Vector3();
  const screenVec = new THREE.Vector2();

  seatCenters.forEach((center, index) => {
    tempVec.copy(center).y += 0.8;
    toScreenPosition(tempVec, screenVec);
    const intensity =
      values.length === seatCenters.length
        ? Math.min(values[index] / maxValue, 1)
        : occupancy.value / 40;
    const radius = 80 * intensity + 35;
    const gradient = ctx.createRadialGradient(
      screenVec.x,
      screenVec.y,
      0,
      screenVec.x,
      screenVec.y,
      radius
    );
    gradient.addColorStop(0, `rgba(56, 189, 248, ${0.35 * intensity})`);
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenVec.x, screenVec.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  heatmapNeedsUpdate.value = false;
};

const updateAcMaterials = () => {
  const color = new THREE.Color(statusColor.value);
  const intensity = status.value === 'NORMAL' ? 0.6 : status.value === 'WARNING' ? 0.85 : 1.2;
  acUnits.forEach((unit) => {
    const material = unit.indicator.material as THREE.MeshStandardMaterial;
    material.emissive.copy(color);
    material.emissiveIntensity = intensity;
  });
};

const updateLedIntensity = () => {
  if (!ledMaterialRef.value) return;
  const baseIntensity = 0.5;
  const occupancyRatio = Math.min(Math.max(occupancy.value / 40, 0), 1);
  ledMaterialRef.value.emissiveIntensity = baseIntensity + occupancyRatio * 0.6;
};

const updateFromTelemetry = () => {
  updateAcMaterials();
  updateLedIntensity();
  heatmapNeedsUpdate.value = true;
  popover.avgTemp = tempC.value;
};

defineExpose({ updateFromTelemetry });

const recenterCamera = () => {
  if (!camera) return;
  const yaw = THREE.MathUtils.degToRad(35);
  const pitch = THREE.MathUtils.degToRad(15);
  const radius = 12;
  const x = radius * Math.cos(pitch) * Math.sin(yaw);
  const y = radius * Math.sin(pitch) + 4;
  const z = radius * Math.cos(pitch) * Math.cos(yaw);
  camera.position.set(x, y, z);
  camera.lookAt(0, 1.2, 0);
  camera.up.set(0, 1, 0);
};

const handlePointerMove = (event: PointerEvent) => {
  if (!renderer || !camera || !scene) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  pointer.set(
    (x / renderer.domElement.clientWidth) * 2 - 1,
    -(y / renderer.domElement.clientHeight) * 2 + 1
  );
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(
    acUnits.map((unit) => unit.group),
    false
  );
  if (intersects.length) {
    renderer.domElement.style.cursor = 'pointer';
    hoveredAC =
      acUnits.find(
        (ac) => ac.group === intersects[0].object.parent || ac.group === intersects[0].object
      ) ?? null;
  } else {
    renderer.domElement.style.cursor = 'default';
    hoveredAC = null;
  }
};

const showPopoverForUnit = (unit: ACUnitDescriptor | null) => {
  const popoverEl = popoverRef.value;
  if (!popoverEl || !unit || !camera || !renderer) {
    popover.visible = false;
    return;
  }
  const worldPos = new THREE.Vector3();
  unit.body.getWorldPosition(worldPos);
  worldPos.y += 0.4;
  const screenPos = toScreenPosition(worldPos);
  popover.screenX = screenPos.x;
  popover.screenY = screenPos.y;
  popover.title = unit.id === 'ac-left' ? 'AC Left Zone' : 'AC Right Zone';
  popover.visible = true;
  const fallbackWidth = popoverEl.offsetWidth || 220;
  const fallbackHeight = popoverEl.offsetHeight || 140;
  const containerWidth = renderer.domElement.clientWidth ?? fallbackWidth;
  const boundedLeft = Math.min(
    Math.max(screenPos.x - fallbackWidth / 2, 16),
    containerWidth - fallbackWidth - 16
  );
  popoverEl.style.left = `${boundedLeft}px`;
  popoverEl.style.top = `${Math.max(screenPos.y - fallbackHeight - 12, 16)}px`;
};
const handleClick = () => {
  if (!hoveredAC) {
    popover.visible = false;
    selectedAC = null;
    return;
  }
  selectedAC = hoveredAC;
  showPopoverForUnit(selectedAC);
  emit('acSelected', { id: selectedAC.id });
};

const handleResize = (width: number, height: number) => {
  if (!renderer || !camera) return;
  renderer.setSize(width, height);
  const aspect = width / height;
  const frustumHeight = 6;
  const frustumWidth = frustumHeight * aspect;
  camera.left = -frustumWidth / 2;
  camera.right = frustumWidth / 2;
  camera.top = frustumHeight / 2;
  camera.bottom = -frustumHeight / 2;
  camera.near = -30;
  camera.far = 60;
  camera.updateProjectionMatrix();
  composer?.setSize(width, height);
  heatmapNeedsUpdate.value = true;
};

const disposeScene = () => {
  if (!scene) return;
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material.dispose();
      }
    }
    if (obj instanceof THREE.InstancedMesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material.dispose();
      }
    }
    const disposer = (obj.userData as { dispose?: () => void }).dispose;
    if (typeof disposer === 'function') {
      disposer();
    }
  });
};

const setupScene = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020617);

  const materialSet = createMaterialSet();
  const { group: shell, floor } = buildRoomShell(materialSet);
  scene.add(shell);

  const { group: grid } = buildCeilingGrid(materialSet);
  scene.add(grid);

  const { mesh: ledPanels } = buildLedPanels(materialSet);
  ledPanels.name = 'led-panels';
  ledPanels.position.y = 0;
  ledPanels.castShadow = false;
  ledPanels.receiveShadow = false;
  scene.add(ledPanels);
  ledMaterialRef.value = materialSet.led;

  const { group: windows } = buildWindows(materialSet);
  scene.add(windows);

  const { group: door } = buildDoor(materialSet);
  scene.add(door.group);

  const { group: board } = buildWhiteboardAndScreen(materialSet);
  scene.add(board);

  const desks = buildDesksInstanced(materialSet);
  scene.add(desks.mesh);
  seatCenters.push(...desks.seatCenters);

  const { group: teacherDesk } = buildTeacherDesk(materialSet);
  scene.add(teacherDesk);

  const { group: projector } = buildProjector(materialSet);
  scene.add(projector);

  const { group: tray } = buildCableTray(materialSet);
  scene.add(tray);

  const { group: mcb } = buildMCB(materialSet);
  scene.add(mcb);

  const ac = buildACUnits(materialSet);
  scene.add(ac.group);
  acUnits.push(...ac.units);

  const { group: sensors } = buildSensors(materialSet);
  scene.add(sensors);

  const { group: cameraDome } = buildCameraDome(materialSet);
  scene.add(cameraDome);

  const { group: rpi } = buildRaspberryPi(materialSet);
  scene.add(rpi);

  const { group: clamp } = buildClampCT(materialSet);
  scene.add(clamp);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x0f172a, 0.9);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(6, 8, 4);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  floor.receiveShadow = true;

  return materialSet;
};

const animate = () => {
  if (!renderer || !scene || !camera) return;
  animationId = requestAnimationFrame(animate);
  const delta = clock?.getDelta() ?? 0.016;
  if (composer) {
    composer.render(delta);
  } else {
    renderer.render(scene, camera);
  }
  drawHeatmap();
  if (popover.visible && selectedAC) {
    showPopoverForUnit(selectedAC);
  }
};

onMounted(async () => {
  const container = containerRef.value;
  if (!container) return;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  camera = new THREE.OrthographicCamera();
  recenterCamera();

  clock = new THREE.Clock();

  setupScene();
  updateAcMaterials();
  updateLedIntensity();

  // Post processing (SSAO optional)
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene!, camera));
    const ssaoPass = new SSAOPass(scene!, camera, 512, 512);
    ssaoPass.kernelRadius = 18;
    composer.addPass(ssaoPass);
  } catch (error) {
    console.warn('[DigitalTwin3D] SSAO unavailable, falling back to default renderer.', error);
    composer = null;
  }

  const handleContainerResize = (entries: ResizeObserverEntry[]) => {
    const entry = entries[0];
    if (!entry) return;
    const { width, height } = entry.contentRect;
    handleResize(width, height);
  };

  resizeObserver = new ResizeObserver(handleContainerResize);
  resizeObserver.observe(container);

  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('click', handleClick);

  await nextTick();
  heatmapNeedsUpdate.value = true;
  animate();

  updateFromTelemetry();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  renderer?.domElement.removeEventListener('pointermove', handlePointerMove);
  renderer?.domElement.removeEventListener('click', handleClick);
  resizeObserver?.disconnect();
  composer?.dispose();
  renderer?.dispose();
  disposeScene();
});

watch([status, tempC, watt, occupancy, occupancyGrid], () => {
  updateFromTelemetry();
});

watch(sparkline, () => {
  popover.avgTemp = tempC.value;
});
</script>
