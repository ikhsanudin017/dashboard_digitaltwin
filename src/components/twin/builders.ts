import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createVinylMaterial,
  createMatteMaterial,
  createGlassMaterial,
  createMetalMaterial,
  createPlasticMaterial,
  createFabricMaterial,
  createLedPanelMaterial,
  twinPalette
} from './materials';
import { createMiniLabel } from './labels';

export interface TwinMaterialSet {
  vinyl: THREE.Material;
  matte: THREE.Material;
  matteAccent: THREE.Material;
  glass: THREE.Material;
  metal: THREE.Material;
  plasticDark: THREE.Material;
  plasticLight: THREE.Material;
  fabric: THREE.Material;
  led: THREE.MeshStandardMaterial;
}

export interface BuildContext {
  materials: TwinMaterialSet;
}

export interface DeskBuildResult {
  mesh: THREE.InstancedMesh;
  seatCenters: THREE.Vector3[];
}

export interface ACUnitDescriptor {
  id: 'ac-left' | 'ac-right';
  group: THREE.Group;
  indicator: THREE.Mesh;
  body: THREE.Mesh;
}

export interface ACUnitsBuildResult {
  group: THREE.Group;
  units: ACUnitDescriptor[];
}

export const createMaterialSet = (): TwinMaterialSet => ({
  vinyl: createVinylMaterial(),
  matte: createMatteMaterial(),
  matteAccent: createMatteMaterial(0xe5e7eb),
  glass: createGlassMaterial(),
  metal: createMetalMaterial(),
  plasticDark: createPlasticMaterial(),
  plasticLight: createPlasticMaterial(twinPalette.plasticLight, 0.55),
  fabric: createFabricMaterial(),
  led: createLedPanelMaterial()
});

export const buildRoomShell = (materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'room-shell';

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), materials.vinyl);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  group.add(floor);

  const wallThickness = 0.05;
  const wallHeight = 3;
  const solidWallGeo = new THREE.BoxGeometry(8, wallHeight, wallThickness);
  solidWallGeo.translate(0, wallHeight / 2, -3 + wallThickness / 2);
  const backWall = new THREE.Mesh(solidWallGeo, materials.matte);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  backWall.name = 'wall-back';
  group.add(backWall);

  const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 6);
  leftWallGeo.translate(-4 + wallThickness / 2, wallHeight / 2, 0);
  const leftWall = new THREE.Mesh(leftWallGeo, materials.matte);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  leftWall.name = 'wall-left';
  group.add(leftWall);

  const transparentWalls = new THREE.Group();
  transparentWalls.name = 'glass-cutaway';

  const frontGlass = new THREE.Mesh(
    new THREE.BoxGeometry(8, wallHeight, wallThickness),
    materials.glass
  );
  frontGlass.position.set(0, wallHeight / 2, 3 - wallThickness / 2);

  const rightGlass = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, 6),
    materials.glass
  );
  rightGlass.position.set(4 - wallThickness / 2, wallHeight / 2, 0);

  const ceilingGlass = new THREE.Mesh(new THREE.BoxGeometry(8, wallThickness, 6), materials.glass);
  ceilingGlass.position.set(0, wallHeight - wallThickness / 2, 0);

  transparentWalls.add(frontGlass, rightGlass, ceilingGlass);
  group.add(transparentWalls);

  return { group, floor };
};

export const buildCeilingGrid = (_materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'ceiling-grid';

  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xd1d5db,
    linewidth: 1
  });

  const gridGeometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const panelSize = 0.6;
  const halfWidth = 4;
  const halfDepth = 3;
  const y = 2.95;

  for (let x = -halfWidth; x <= halfWidth; x += panelSize) {
    vertices.push(x, y, -halfDepth, x, y, halfDepth);
  }
  for (let z = -halfDepth; z <= halfDepth; z += panelSize) {
    vertices.push(-halfWidth, y, z, halfWidth, y, z);
  }
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const lines = new THREE.LineSegments(gridGeometry, gridMaterial);
  group.add(lines);

  return { group, material: gridMaterial, geometry: gridGeometry };
};

export const buildLedPanels = (materials: TwinMaterialSet) => {
  const cols = 3;
  const rows = 4;
  const panelSize = 0.6;
  const offsetX = -1.8;
  const offsetZ = -1.8;
  const spacingX = 1.8;
  const spacingZ = 1.5;
  const height = 2.9;

  const geometry = new THREE.PlaneGeometry(panelSize, panelSize);
  geometry.rotateX(-Math.PI / 2);

  const mesh = new THREE.InstancedMesh(geometry, materials.led, cols * rows);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.name = 'led-panels';

  const matrix = new THREE.Matrix4();
  let index = 0;
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      matrix.makeTranslation(offsetX + i * spacingX, height, offsetZ + j * spacingZ);
      mesh.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;

  return { mesh, geometry };
};

export const buildWindows = (materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'windows';

  const frameMaterial = createMetalMaterial(0x8f9ba8);
  const frameGeometry = new THREE.BoxGeometry(0.05, 1.4, 4);
  frameGeometry.translate(4 - 0.025, 1.8, 0);
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.castShadow = true;
  group.add(frame);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.4), materials.glass);
  glass.rotation.y = Math.PI / 2;
  glass.position.set(3.975, 1.8, 0);
  group.add(glass);

  const blindMaterial = createMatteMaterial(0xcfd8e3);
  const blind = new THREE.Mesh(new THREE.PlaneGeometry(4.05, 1.4), blindMaterial);
  blind.rotation.y = Math.PI / 2;
  blind.position.set(3.97, 1.8 + 0.35, -0.2);
  group.add(blind);

  return { group, frameMaterial, blindMaterial };
};

export const buildDoor = (materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'door';

  const doorGeo = new THREE.BoxGeometry(0.9, 2.1, 0.04);
  const door = new THREE.Mesh(doorGeo, createVinylMaterial());
  door.position.set(-3, 1.05, 3 - 0.05);
  door.castShadow = true;

  const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 12);
  handleGeo.rotateZ(Math.PI / 2);
  const handle = new THREE.Mesh(handleGeo, materials.metal);
  handle.position.set(0.3, 1, 0.08);
  door.add(handle);

  group.add(door);
  return { group };
};

export const buildWhiteboardAndScreen = (_materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'whiteboard';

  const boardGeo = new THREE.PlaneGeometry(3, 1.2);
  const board = new THREE.Mesh(boardGeo, createMatteMaterial(0xe9eef5));
  board.position.set(0, 1.6, -3 + 0.02);
  board.receiveShadow = false;
  group.add(board);

  const frameGeo = new THREE.EdgesGeometry(boardGeo);
  const frame = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color: 0x9ca3af }));
  board.add(frame);

  const screenGeo = new THREE.PlaneGeometry(2.4, 1.35);
  const screen = new THREE.Mesh(screenGeo, createMatteMaterial(0x0f172a));
  screen.position.set(0, 2.7, -3 + 0.04);
  group.add(screen);

  return { group };
};

export const buildDesksInstanced = (
  materials: TwinMaterialSet,
  seatColor = 0x3f4c5a
): DeskBuildResult => {
  const deskTop = new THREE.BoxGeometry(0.9, 0.05, 0.6);
  deskTop.translate(0, 0.75, 0);
  const legGeo = new THREE.BoxGeometry(0.05, 0.7, 0.05);
  const frontLeftLeg = legGeo.clone().translate(-0.4, 0.35, -0.25);
  const frontRightLeg = legGeo.clone().translate(0.4, 0.35, -0.25);
  const backLeftLeg = legGeo.clone().translate(-0.4, 0.35, 0.25);
  const backRightLeg = legGeo.clone().translate(0.4, 0.35, 0.25);

  const chairSeat = new THREE.BoxGeometry(0.45, 0.05, 0.45);
  chairSeat.translate(0, 0.55, -0.4);
  const chairBack = new THREE.BoxGeometry(0.45, 0.35, 0.05);
  chairBack.translate(0, 0.825, -0.6);

  const merge = BufferGeometryUtils.mergeGeometries(
    [deskTop, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg],
    false
  );
  const seatMerge = BufferGeometryUtils.mergeGeometries([chairSeat, chairBack], false);

  const deskMaterial = materials.matteAccent.clone() as THREE.MeshStandardMaterial;
  deskMaterial.roughness = 0.4;
  deskMaterial.color = new THREE.Color(0xf2f5f9);

  const seatMaterial = createMatteMaterial(seatColor);

  const deskMesh = new THREE.InstancedMesh(merge, deskMaterial, 24);
  deskMesh.castShadow = true;
  const seatMesh = new THREE.InstancedMesh(seatMerge, seatMaterial, 24);
  seatMesh.castShadow = true;

  const group = new THREE.Group();
  group.add(deskMesh, seatMesh);

  const seatCenters: THREE.Vector3[] = [];
  const columns = 4;
  const rows = 6;
  const spacingX = 1.6;
  const spacingZ = 1.15;
  const startX = -spacingX * (columns - 1) * 0.5;
  const startZ = -spacingZ * (rows - 1) * 0.5;

  const matrix = new THREE.Matrix4();

  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = startX + col * spacingX;
      const z = startZ + row * spacingZ + 0.4;
      matrix.makeTranslation(x, 0, z);
      deskMesh.setMatrixAt(index, matrix);
      seatMesh.setMatrixAt(index, matrix);
      seatCenters.push(new THREE.Vector3(x, 0.6, z - 0.4));
      index += 1;
    }
  }
  deskMesh.instanceMatrix.needsUpdate = true;
  seatMesh.instanceMatrix.needsUpdate = true;

  return { mesh: group, seatCenters };
};

export const buildTeacherDesk = (materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'teacher-desk';

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.7), materials.matteAccent);
  desk.position.set(0, 0.85, -2);
  desk.castShadow = true;
  group.add(desk);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.55), materials.matte);
  pedestal.position.set(-0.5, 0.375, -2);
  pedestal.castShadow = true;
  group.add(pedestal);

  const chair = new THREE.Group();
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), materials.fabric);
  chairSeat.position.set(0, 0.55, -1.4);
  chairSeat.castShadow = true;
  chair.add(chairSeat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), materials.fabric);
  backrest.position.set(0, 0.9, -1.6);
  backrest.castShadow = true;
  chair.add(backrest);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), materials.metal);
  base.position.set(0, 0.3, -1.4);
  base.castShadow = true;
  chair.add(base);

  group.add(chair);
  return { group };
};

export const buildProjector = (materials: TwinMaterialSet) => {
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.3), materials.plasticLight);
  body.position.set(0, 2.7, -2.5);
  body.castShadow = true;

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 24), materials.metal);
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.2, 0, 0.2);
  body.add(lens);

  return { group: body };
};

export const buildCableTray = (_materials: TwinMaterialSet) => {
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 6), createMatteMaterial(0x8f9ba8));
  tray.position.set(-2, 2.8, 0);
  tray.castShadow = false;
  return { group: tray };
};

export const buildMCB = (materials: TwinMaterialSet) => {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.12), materials.plasticLight);
  panel.position.set(-3.5, 1.4, 2.9);
  panel.castShadow = true;

  const breakers = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.04), materials.plasticDark);
  breakers.position.set(0, 0.05, 0.08);
  panel.add(breakers);

  return { group: panel };
};

export const buildACUnits = (materials: TwinMaterialSet): ACUnitsBuildResult => {
  const group = new THREE.Group();
  group.name = 'ac-units';
  const units: ACUnitDescriptor[] = [];

  const createUnit = (id: ACUnitDescriptor['id'], x: number) => {
    const acGroup = new THREE.Group();
    acGroup.name = id;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.3), materials.plasticLight);
    body.castShadow = true;
    acGroup.add(body);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.02), materials.matteAccent);
    grille.position.set(0, -0.05, 0.16);
    body.add(grille);

    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0x22c55e),
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.2
    });
    const indicator = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), indicatorMaterial);
    indicator.position.set(0.45, 0, 0.16);
    body.add(indicator);

    const supply = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.02), materials.matteAccent);
    supply.position.set(0, -0.18, 0.15);
    body.add(supply);

    const returnGrille = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.05, 0.02),
      createMatteMaterial(0xcbd5f5)
    );
    returnGrille.position.set(0, 0.18, 0.15);
    body.add(returnGrille);

    acGroup.position.set(x, 2.5, -2.2);
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.4, 16),
      createMetalMaterial(0xcaa472)
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(x, 2.0, -2.2);
    const insulation = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 1.1, 12),
      createPlasticMaterial(0x94a3b8, 0.6)
    );
    insulation.rotation.z = Math.PI / 2;
    insulation.position.set(x, 1.95, -2.3);

    group.add(acGroup, pipe, insulation);
    units.push({ id, group: acGroup, indicator, body });
  };

  createUnit('ac-left', -3.4);
  createUnit('ac-right', 3.4);

  return { group, units };
};

export const buildSensors = (_materials: TwinMaterialSet) => {
  const group = new THREE.Group();
  group.name = 'sensors';

  const bme = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), createMatteMaterial(0x3b82f6));
  bme.position.set(-1.5, 1.4, 2.9);
  bme.name = 'sensor-bme280';
  group.add(bme);

  const espMaterial = createPlasticMaterial(0x1f2933, 0.55);
  const esp1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.04), espMaterial);
  esp1.position.set(3.9, 1.2, 1.5);
  group.add(esp1);

  const esp2 = esp1.clone();
  esp2.position.set(-3.9, 1.2, -1.5);
  group.add(esp2);

  return { group };
};

export const buildCameraDome = (materials: TwinMaterialSet) => {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), materials.plasticDark);
  dome.position.set(3.7, 2.85, -2.8);
  dome.castShadow = true;
  return { group: dome };
};

export const buildRaspberryPi = (materials: TwinMaterialSet) => {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.03, 0.11),
    createMatteMaterial(0x1c7c54)
  );
  board.position.set(-0.8, 0.9, -2.4);
  board.castShadow = true;

  const caseTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.11), materials.plasticLight);
  caseTop.position.set(0, 0.025, 0);
  board.add(caseTop);

  const label = createMiniLabel('RPI4', {
    fontSize: 48,
    color: '#ffffff',
    background: 'rgba(15,23,42,0.8)'
  });
  label.position.set(0, 0.05, 0.07);
  board.add(label);

  return { group: board };
};

export const buildClampCT = (materials: TwinMaterialSet) => {
  const clamp = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.015, 12, 24, Math.PI * 1.4),
    materials.metal
  );
  clamp.position.set(-3.45, 1.4, 2.9);
  clamp.rotation.y = Math.PI / 2;
  clamp.name = 'clamp-ct';

  const label = createMiniLabel('CT', {
    fontSize: 56,
    color: '#0f172a',
    background: 'rgba(255,255,255,0.9)'
  });
  label.position.set(0, 0.1, 0);
  clamp.add(label);

  return { group: clamp };
};
