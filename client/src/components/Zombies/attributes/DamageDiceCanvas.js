import React, { useEffect, useMemo, useRef } from 'react';
import { getPolyhedronGeometry } from '../../../utils/dieGeometry';

const LIGHT_DIRECTION = normalizeVector([0.42, 0.86, 0.52]);
const GRAVITY = 9.8;
const SETTLE_VELOCITY_THRESHOLD = 0.35;
const SETTLE_ANGULAR_THRESHOLD = 0.4;
const BASE_PLANE_Y = 0;
const BOUNDS_X = 6.5;
const BOUNDS_Z = 4.5;
const FRICTION = 0.86;
const RESTITUTION = 0.45;
const AIR_RESISTANCE = 0.985;
const LABEL_OPACITY_FALLOFF = 0.6;

function normalizeVector(vector) {
  if (!Array.isArray(vector)) return [0, 0, 1];
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length <= 1e-6) {
    return [0, 0, 1];
  }
  return vector.map((value) => value / length);
}

function subtract(a, b) {
  return a.map((value, index) => value - (b[index] || 0));
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * (b[index] || 0), 0);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function projectToScreen(point, camera, viewport) {
  const relative = subtract(point, camera.position);
  const x = dot(relative, camera.right);
  const y = dot(relative, camera.up);
  const z = dot(relative, camera.forward);

  const depth = z + camera.distance;
  const perspective = camera.focalLength / Math.max(camera.near, depth);

  return {
    x: viewport.width / 2 + x * perspective * camera.scale,
    y: viewport.height * 0.58 - y * perspective * camera.scale,
    depth,
  };
}

function parseColor(input, fallback) {
  if (typeof input !== 'string') {
    return fallback;
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return fallback;
  }

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : hex;
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((value) => Number(value.trim()));
    if (parts.every((value) => Number.isFinite(value))) {
      return parts;
    }
  }

  return fallback;
}

function colorToString([r, g, b]) {
  return `rgb(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(
    clamp(b, 0, 255),
  )})`;
}

function blendColor(color, intensity, highlight) {
  const ratio = clamp(intensity, 0, 1);
  return color.map((value, index) => value * (0.25 + ratio * 0.75) + highlight[index] * ratio * 0.15);
}

function rotateVertex(vertex, rotation) {
  const cosX = Math.cos(rotation.x);
  const sinX = Math.sin(rotation.x);
  const cosY = Math.cos(rotation.y);
  const sinY = Math.sin(rotation.y);
  const cosZ = Math.cos(rotation.z);
  const sinZ = Math.sin(rotation.z);

  let [x, y, z] = vertex;

  // X rotation
  let ty = y * cosX - z * sinX;
  let tz = y * sinX + z * cosX;
  y = ty;
  z = tz;

  // Y rotation
  let tx = x * cosY + z * sinY;
  tz = -x * sinY + z * cosY;
  x = tx;
  z = tz;

  // Z rotation
  tx = x * cosZ - y * sinZ;
  ty = x * sinZ + y * cosZ;

  return [tx, ty, z];
}

function computeCamera(viewport) {
  const distance = 9.5;
  const position = [0, 5.4, 11.5];
  const target = [0, 0.8, 0];
  const forward = normalizeVector(subtract(target, position));
  const worldUp = [0, 1, 0];
  let right = cross(forward, worldUp);
  if (Math.hypot(...right) < 1e-6) {
    right = [1, 0, 0];
  }
  right = normalizeVector(right);
  const up = normalizeVector(cross(right, forward));

  const aspect = viewport.width / Math.max(1, viewport.height);
  const focalLength = 2.6;

  return {
    position,
    target,
    forward,
    right,
    up,
    distance,
    focalLength,
    near: 0.8,
    scale: clamp(0.9 * Math.min(1.2, aspect + 0.2), 0.85, 1.35),
  };
}

function createDieState(die, index, total, colorPalette) {
  const geometry = getPolyhedronGeometry(die.sides);
  const scale = geometry.scale || 1;
  const vertices = geometry.vertices || [];
  const faces = geometry.faces || [];

  const spread = total > 1 ? (index / Math.max(1, total - 1)) * 2 - 1 : 0;
  const position = [spread * 2.8, 2.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6];
  const velocity = [
    (Math.random() - 0.5) * 1.5,
    -2.4 - Math.random() * 1.2,
    (Math.random() - 0.5) * 1.2,
  ];
  const rotation = {
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2,
  };
  const angularVelocity = {
    x: (Math.random() - 0.5) * 8,
    y: (Math.random() - 0.5) * 8,
    z: (Math.random() - 0.5) * 8,
  };

  const baseColor = colorPalette.getColor(die.category);
  const highlight = colorPalette.getHighlight(die.category);

  return {
    id: die.id,
    value: die.value,
    sides: die.sides,
    typeClass: die.typeClass,
    position,
    velocity,
    rotation,
    angularVelocity,
    scale,
    vertices,
    faces,
    settled: false,
    baseColor,
    highlight,
    labelPosition: { x: 0, y: 0, visible: false },
  };
}

class ColorPalette {
  constructor(root) {
    const computed = getComputedStyle(root || document.documentElement);
    this.base = parseColor(
      computed.getPropertyValue('--dice-face-color'),
      [31, 70, 204],
    );
    this.critical = parseColor('#f2c100', [242, 193, 0]);
    this.criticalBonus = parseColor('#ff8a33', [255, 138, 51]);
    this.bonus = parseColor('#30b86f', [48, 184, 111]);
    this.highlight = parseColor('#ffffff', [255, 255, 255]);
  }

  getColor(category) {
    switch (category) {
      case 'critical':
        return this.critical;
      case 'critical-bonus':
        return this.criticalBonus;
      case 'bonus':
        return this.bonus;
      default:
        return this.base;
    }
  }

  getHighlight(category) {
    if (category === 'critical' || category === 'critical-bonus') {
      return this.highlight;
    }
    return this.base;
  }
}

class DiceRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d', { alpha: true });
    this.dice = [];
    this.pixelRatio = window.devicePixelRatio || 1;
    this.frameRequest = null;
    this.lastTimestamp = 0;
    this.active = false;
    this.colorPalette = new ColorPalette(options.root);
    this.labelElements = options.labelElements || (() => null);
    this.camera = computeCamera({ width: canvas?.clientWidth || 300, height: canvas?.clientHeight || 300 });

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  handleResize() {
    if (!this.canvas) return;
    const { clientWidth, clientHeight } = this.canvas;
    const width = Math.max(10, clientWidth);
    const height = Math.max(10, clientHeight);
    const ratio = this.pixelRatio;
    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(ratio, ratio);
    }
    this.viewport = { width, height };
    this.camera = computeCamera(this.viewport);
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.active = false;
  }

  setLabelElements(resolver) {
    this.labelElements = typeof resolver === 'function' ? resolver : () => null;
  }

  setDice(dice) {
    if (!Array.isArray(dice) || !dice.length) {
      this.dice = [];
      this.clear();
      return;
    }

    this.dice = dice.map((die, index) =>
      createDieState(die, index, dice.length, this.colorPalette),
    );
    this.start();
  }

  start() {
    if (this.active) {
      return;
    }
    this.active = true;
    this.lastTimestamp = performance.now();
    const loop = (timestamp) => {
      if (!this.active) return;
      const delta = Math.min(0.032, (timestamp - this.lastTimestamp) / 1000 || 0.016);
      this.lastTimestamp = timestamp;
      this.update(delta);
      this.frameRequest = requestAnimationFrame(loop);
    };
    this.frameRequest = requestAnimationFrame(loop);
  }

  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    }
  }

  update(delta) {
    if (!this.ctx) return;

    this.clear();

    const facesToRender = [];

    let activeDice = 0;
    this.dice.forEach((die) => {
      this.integrateDie(die, delta);
      if (!die.vertices || die.vertices.length === 0 || !die.faces || die.faces.length === 0) {
        return;
      }
      activeDice += 1;
      const transformed = die.vertices.map((vertex) => {
        const rotated = rotateVertex(vertex, die.rotation);
        return [
          rotated[0] * die.scale + die.position[0],
          rotated[1] * die.scale + die.position[1],
          rotated[2] * die.scale + die.position[2],
        ];
      });

      const faceColor = die.baseColor;
      const highlightColor = die.highlight;

      die.faces.forEach((face) => {
        if (!Array.isArray(face) || face.length < 3) return;
        const vertices = face.map((index) => transformed[index]);
        const v0 = vertices[0];
        const v1 = vertices[1];
        const v2 = vertices[2];
        const normal = normalizeVector(cross(subtract(v1, v0), subtract(v2, v0)));
        const intensity = Math.max(0, dot(normal, LIGHT_DIRECTION));
        const fill = colorToString(blendColor(faceColor, intensity, highlightColor));
        const projected = vertices.map((point) => projectToScreen(point, this.camera, this.viewport));
        const averageDepth = projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;
        const path = projected.map(({ x, y }) => [x, y]);
        facesToRender.push({ path, fill, depth: averageDepth });
      });

      const center = transformed.reduce(
        (acc, vertex) => [acc[0] + vertex[0], acc[1] + vertex[1], acc[2] + vertex[2]],
        [0, 0, 0],
      ).map((value) => value / transformed.length);
      const projectedCenter = projectToScreen(center, this.camera, this.viewport);

      const labelElement = this.labelElements(die.id);
      if (labelElement) {
        const clampedX = clamp(projectedCenter.x, 20, this.viewport.width - 20);
        const clampedY = clamp(projectedCenter.y, 20, this.viewport.height - 18);
        labelElement.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
        const visibility = die.settled ? 1 : clamp(1 - Math.abs(die.velocity[1]) * LABEL_OPACITY_FALLOFF, 0, 1);
        labelElement.style.opacity = visibility.toFixed(3);
      }

      const shadow = projectToScreen(
        [die.position[0], BASE_PLANE_Y + 0.1, die.position[2]],
        this.camera,
        this.viewport,
      );
      const shadowSize = 26 * clamp(1.1 - die.position[1] * 0.15, 0.4, 1.1);
      facesToRender.push({
        path: createEllipsePath(shadow.x, shadow.y, shadowSize * 1.2, shadowSize * 0.65),
        fill: 'rgba(0, 0, 0, 0.22)',
        depth: shadow.depth + 0.001,
        shadow: true,
      });
    });

    facesToRender
      .sort((a, b) => b.depth - a.depth)
      .forEach((face) => {
        if (!Array.isArray(face.path) || face.path.length < 2) return;
        this.ctx.beginPath();
        this.ctx.moveTo(face.path[0][0], face.path[0][1]);
        for (let i = 1; i < face.path.length; i += 1) {
          this.ctx.lineTo(face.path[i][0], face.path[i][1]);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = face.fill;
        this.ctx.fill();
      });

    if (activeDice === 0) {
      this.active = false;
    }
  }

  integrateDie(die, delta) {
    if (die.settled) {
      die.velocity = die.velocity.map((value) => value * 0.92);
      return;
    }

    die.velocity[1] -= GRAVITY * delta;
    die.position[0] += die.velocity[0] * delta;
    die.position[1] += die.velocity[1] * delta;
    die.position[2] += die.velocity[2] * delta;

    die.rotation.x += die.angularVelocity[0] * delta;
    die.rotation.y += die.angularVelocity[1] * delta;
    die.rotation.z += die.angularVelocity[2] * delta;

    die.angularVelocity[0] *= AIR_RESISTANCE;
    die.angularVelocity[1] *= AIR_RESISTANCE;
    die.angularVelocity[2] *= AIR_RESISTANCE;
    die.velocity[0] *= FRICTION;
    die.velocity[2] *= FRICTION;

    if (die.position[1] <= BASE_PLANE_Y) {
      die.position[1] = BASE_PLANE_Y;
      if (Math.abs(die.velocity[1]) > 0.12) {
        die.velocity[1] = Math.abs(die.velocity[1]) * RESTITUTION;
      } else {
        die.velocity[1] = 0;
      }
      die.angularVelocity[0] *= 0.78;
      die.angularVelocity[1] *= 0.78;
      die.angularVelocity[2] *= 0.78;
    }

    if (Math.abs(die.position[0]) > BOUNDS_X) {
      die.position[0] = clamp(die.position[0], -BOUNDS_X, BOUNDS_X);
      die.velocity[0] *= -RESTITUTION;
    }

    if (Math.abs(die.position[2]) > BOUNDS_Z) {
      die.position[2] = clamp(die.position[2], -BOUNDS_Z, BOUNDS_Z);
      die.velocity[2] *= -RESTITUTION;
    }

    const speed = Math.hypot(...die.velocity);
    const angularSpeed = Math.hypot(die.angularVelocity[0], die.angularVelocity[1], die.angularVelocity[2]);
    if (speed < SETTLE_VELOCITY_THRESHOLD && angularSpeed < SETTLE_ANGULAR_THRESHOLD && die.position[1] <= BASE_PLANE_Y + 0.05) {
      die.settled = true;
      die.velocity = [0, 0, 0];
      die.angularVelocity = [0, 0, 0];
    }
  }
}

function createEllipsePath(cx, cy, rx, ry) {
  const points = [];
  const steps = 16;
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return points;
}

const registerMapEntry = (map, key, node) => {
  if (!map) return;
  if (node) {
    map.set(key, node);
  } else {
    map.delete(key);
  }
};

const DamageDiceCanvas = ({ dice = [] }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const labelsRef = useRef(new Map());

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new DiceRenderer(canvasRef.current, {
      root: document.documentElement,
      labelElements: (id) => labelsRef.current.get(id) || null,
    });
    rendererRef.current = renderer;
    return () => renderer.dispose();
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setLabelElements((id) => labelsRef.current.get(id) || null);
    rendererRef.current.setDice(dice);
  }, [dice]);

  const labelItems = useMemo(
    () =>
      dice.map((die) => (
        <span
          key={die.id}
          data-die-id={die.id}
          className={`damage-dice-label ${die.typeClass || ''}`.trim()}
          ref={(node) => registerMapEntry(labelsRef.current, die.id, node)}
          style={{ opacity: 0 }}
        >
          {die.value}
        </span>
      )),
    [dice],
  );

  return (
    <div className="damage-dice-canvas">
      <canvas ref={canvasRef} className="damage-dice-canvas__surface" />
      <div className="damage-dice-canvas__labels">{labelItems}</div>
    </div>
  );
};

export default DamageDiceCanvas;
