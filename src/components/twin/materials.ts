import * as THREE from 'three';

/**
 * Shared color palette for the digital twin materials.
 */
export const twinPalette = {
  vinyl: 0xa67b57,
  matteWhite: 0xf5f5f5,
  glass: 0xbdd4f5,
  metal: 0x9ea7ad,
  plasticDark: 0x1f2933,
  plasticLight: 0x4b5563,
  fabric: 0x6b7280
};

const textureCache: Record<string, THREE.Texture> = {};

const makeStripedTexture = (key: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
  if (textureCache[key]) return textureCache[key];
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas context for texture.');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  textureCache[key] = texture;
  return texture;
};

export const createVinylMaterial = (): THREE.MeshStandardMaterial => {
  const texture = makeStripedTexture('vinyl', (ctx) => {
    ctx.fillStyle = '#b68a62';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = 'rgba(80, 52, 30, 0.35)';
    ctx.lineWidth = 16;
    for (let x = 0; x < ctx.canvas.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }
  });
  texture.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({
    color: twinPalette.vinyl,
    roughness: 0.6,
    metalness: 0,
    map: texture,
    normalScale: new THREE.Vector2(0.3, 0.3)
  });
};

export const createMatteMaterial = (color = twinPalette.matteWhite): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.05
  });

export const createGlassMaterial = (): THREE.MeshPhysicalMaterial =>
  new THREE.MeshPhysicalMaterial({
    color: twinPalette.glass,
    transparent: true,
    opacity: 0.15,
    roughness: 0.1,
    metalness: 0.05,
    transmission: 0.85,
    thickness: 0.02,
    side: THREE.DoubleSide
  });

export const createMetalMaterial = (color = twinPalette.metal): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.8
  });

export const createPlasticMaterial = (
  color = twinPalette.plasticDark,
  roughness = 0.4
): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.1
  });

export const createFabricMaterial = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: twinPalette.fabric,
    roughness: 0.7,
    metalness: 0.05
  });

export const createLedPanelMaterial = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.05
  });

export const disposeMaterials = (materials: THREE.Material[]) => {
  materials.forEach((mat) => mat.dispose());
};
