import * as THREE from 'three';

interface LabelOptions {
  fontSize?: number;
  color?: string;
  background?: string;
  padding?: number;
  borderRadius?: number;
}

/**
 * Create a small sprite-based label for annotating IoT devices in the scene.
 */
export const createMiniLabel = (text: string, options: LabelOptions = {}) => {
  const {
    fontSize = 64,
    color = '#0f172a',
    background = 'rgba(255,255,255,0.85)',
    padding = 16,
    borderRadius = 12
  } = options;

  const font = `${fontSize}px 'Inter', 'Segoe UI', sans-serif`;

  const metricsCanvas = document.createElement('canvas');
  const metricsCtx = metricsCanvas.getContext('2d');
  if (!metricsCtx) throw new Error('Unable to acquire canvas context for label.');
  metricsCtx.font = font;
  const textMetrics = metricsCtx.measureText(text);
  const width = Math.ceil(textMetrics.width + padding * 2);
  const height = Math.ceil(fontSize + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to acquire canvas context for label.');
  ctx.font = font;
  ctx.fillStyle = background;
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;

  const drawRoundedRect = () => {
    const radius = Math.min(borderRadius, height / 2);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
  };

  drawRoundedRect();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  const scaleFactor = 0.0025; // scale down to world units (meters)
  sprite.scale.set(width * scaleFactor, height * scaleFactor, 1);

  const dispose = () => {
    material.dispose();
    texture.dispose();
  };
  sprite.userData.dispose = dispose;

  return sprite;
};
