const BASE_HEIGHT_VH = 0.22;
const VIEWPORT_PADDING = 0.3;
const FOCAL_LENGTH = 600;
const Z_SPREAD = 350;
const NEAR_CLIP = 50;
const DRAG_SENSITIVITY = 0.003;
const MOMENTUM_DECAY = 0.95;
const MOMENTUM_MIN = 0.00005;

function seededRandom(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function index() {
  return `
    <section data-page="index" class="page page-index">
      <h1 class="page-title">Index</h1>
    </section>
  `;
}

export class IndexFloat {
  constructor(gpu) {
    this.gpu = gpu;
    this.worldPositions = [];
    this.baseSizes = [];
    this.targets = []; // rects in plane-index order, captured by prepare()

    this.rotX = 0;
    this.rotY = 0;
    this.velX = 0;
    this.velY = 0;
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this._running = false;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
  }

  prepare() {
    this.computeLayout();
    this.targets = this._project();
  }

  computeLayout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.worldPositions = [];
    this.baseSizes = [];
    for (let i = 0; i < this.gpu.planes.length; i++) {
      const plane = this.gpu.planes[i];
      if (plane.kind !== 'main') continue;
      const aspect = this.gpu.aspects[plane.image] ?? 4 / 5;
      const zNorm = seededRandom(i * 31 + 7);
      const zWorld = (zNorm - 0.5) * 2 * Z_SPREAD;
      const baseH = vh * BASE_HEIGHT_VH;
      const baseW = baseH * aspect;
      const xRange = vw * (1 - 2 * VIEWPORT_PADDING);
      const yRange = vh * (1 - 2 * VIEWPORT_PADDING);
      const xWorld = -xRange / 2 + seededRandom(i * 17 + 3) * xRange;
      const yWorld = -yRange / 2 + seededRandom(i * 23 + 11) * yRange;
      this.worldPositions[i] = { x: xWorld, y: yWorld, z: zWorld };
      this.baseSizes[i] = { w: baseW, h: baseH };
    }
  }

  _project() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const rects = [];
    for (let i = 0; i < this.gpu.planes.length; i++) {
      const pos = this.worldPositions[i];
      const size = this.baseSizes[i];
      if (!pos || !size) continue;

      const rx = pos.x * cosY + pos.z * sinY;
      let ry = pos.y;
      let rz = -pos.x * sinY + pos.z * cosY;
      const ry2 = ry * cosX - rz * sinX;
      const rz2 = ry * sinX + rz * cosX;
      ry = ry2;
      rz = rz2;

      const depth = FOCAL_LENGTH + rz;
      if (depth < NEAR_CLIP) {
        rects[i] = { x: -9999, y: -9999, w: 0, h: 0, z: rz };
        continue;
      }

      const f = FOCAL_LENGTH / depth;
      const w = size.w * f;
      const h = size.h * f;
      const cx = rx * f + vw / 2;
      const cy = ry * f + vh / 2;
      rects[i] = { x: cx - w / 2, y: cy - h / 2, w, h, z: rz };
    }
    return rects;
  }

  applyProjection() {
    const rects = this._project();
    for (let i = 0; i < this.gpu.planes.length; i++) {
      const r = rects[i];
      if (!r) continue;
      const plane = this.gpu.planes[i];
      plane.bounds.x = r.x;
      plane.bounds.y = r.y;
      plane.bounds.w = r.w;
      plane.bounds.h = r.h;
      plane.bounds.z = r.z;
    }
  }

  start() {
    this._running = true;
    this.applyProjection();
    window.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
  }

  stop() {
    this._running = false;
    window.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this.isDragging = false;
    this.velX = 0;
    this.velY = 0;
  }

  measure() {
    this.rotX = 0;
    this.rotY = 0;
    this.velX = 0;
    this.velY = 0;
    this.computeLayout();
    this.targets = this._project();
    this.applyProjection();
  }

  getTargets() {
    return this.targets;
  }

  tick() {
    if (!this._running) return;
    if (this.isDragging) return;
    if (
      Math.abs(this.velX) < MOMENTUM_MIN &&
      Math.abs(this.velY) < MOMENTUM_MIN
    ) {
      this.velX = 0;
      this.velY = 0;
      return;
    }
    this.rotX += this.velX;
    this.rotY += this.velY;
    this.velX *= MOMENTUM_DECAY;
    this.velY *= MOMENTUM_DECAY;
    this.applyProjection();
  }

  _onDown(e) {
    if (e.target?.closest?.('a')) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velX = 0;
    this.velY = 0;
  }

  _onMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.rotY += dx * DRAG_SENSITIVITY;
    this.rotX += dy * DRAG_SENSITIVITY;
    this.velY = dx * DRAG_SENSITIVITY;
    this.velX = dy * DRAG_SENSITIVITY;
    this.applyProjection();
  }

  _onUp() {
    this.isDragging = false;
  }
}
