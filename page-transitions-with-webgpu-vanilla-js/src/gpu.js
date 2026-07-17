import * as THREE from "three/webgpu";
import { Fn, uv, uniform, vec2 } from "three/tsl";

// Corner radius in CSS pixels, kept subtle.
const CORNER_RADIUS = 8;

// Camera distance from the z=0 plane. The perspective FOV is matched to this so
// the z=0 plane maps 1:1 to CSS pixels (identical framing to an ortho camera);
// smaller values = stronger perspective for out-of-plane tilts.
const CAMERA_DISTANCE = 1000;

// Builds an opacity node that masks the quad into a rounded rectangle using a
// rounded-box SDF. `sizeUniform` is the plane's pixel size (so the radius is a
// constant pixel value regardless of the plane's dimensions) and the result is
// multiplied by `opacityUniform`, the plane's fade value.
function roundedRectOpacityNode(sizeUniform, radiusUniform, opacityUniform) {
  const mask = Fn(() => {
    const half = sizeUniform.mul(0.5);
    const r = radiusUniform.min(half.x).min(half.y);
    const p = uv().sub(0.5).mul(sizeUniform);
    const q = p.abs().sub(half).add(r);
    const dist = q.max(vec2(0.0)).length().add(q.x.max(q.y).min(0.0)).sub(r);
    // ~2px feather for antialiased edges; 1 inside, 0 outside.
    return dist.smoothstep(-1.0, 1.0).oneMinus();
  })();
  return mask.mul(opacityUniform);
}

const IMAGES = [
  "/images/christian-regg-FNaFLvbLFuk-unsplash.webp",
  "/images/fabrizio-conti-rMWmDMeaoBk-unsplash.webp",
  "/images/johannes-andersson-UCd78vfC8vU-unsplash.webp",
  "/images/mads-schmidt-rasmussen-xfngap_DToE-unsplash.webp",
  "/images/weichao-deng-eyn0LjpNWV4-unsplash.webp",
];

export const MAIN_COUNT = IMAGES.length; // 5
export const SATELLITES_PER_IMAGE = 4; // 4 satellites per image
export const SATELLITE_COUNT = MAIN_COUNT * SATELLITES_PER_IMAGE; // 20
export const TOTAL_PLANES = MAIN_COUNT + SATELLITE_COUNT; // 25

export function mainIdx(image) {
  return image;
}
export function satIdx(image, j) {
  return MAIN_COUNT + image * SATELLITES_PER_IMAGE + j;
}

export class GPU {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.geometry = null;
    this.textures = [];
    this.aspects = [];
    this.planes = [];
    this.radiusUniform = uniform(CORNER_RADIUS);
    this.onResize = this.onResize.bind(this);
    this.onResizeLayout = null;
  }

  _createPlaneMaterial(texture) {
    // NodeMaterial (not the classic MeshBasicMaterial) is required for
    // `opacityNode`; the classic material silently ignores node properties.
    const material = new THREE.MeshBasicNodeMaterial({
      map: texture,
      transparent: true,
    });
    const sizeUniform = uniform(new THREE.Vector2(1, 1));
    const opacityUniform = uniform(0);
    material.opacityNode = roundedRectOpacityNode(sizeUniform, this.radiusUniform, opacityUniform);
    return { material, sizeUniform, opacityUniform };
  }

  async init() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "gpu-canvas";
    document.body.append(this.canvas);

    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    await this.renderer.init();

    this.scene = new THREE.Scene();
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.setupCamera();

    await this.loadTextures();
    this.createPlanes();
    await this.warmup();

    window.addEventListener("resize", this.onResize);
  }

  // Compile every plane's pipeline and upload its texture to the GPU up front,
  // while the preloader is still on screen. Without this, the work happens on
  // the first frame the planes turn visible — exactly when the intro plays —
  // and the animation hitches. The planes start at opacity 0, so the warm
  // render draws nothing (and sits behind the preloader regardless).
  async warmup() {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  setupCamera() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const fov = 2 * Math.atan(h / 2 / CAMERA_DISTANCE) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, CAMERA_DISTANCE * 2);
    this.camera.position.z = CAMERA_DISTANCE;
  }

  async loadTextures() {
    const loader = new THREE.TextureLoader();
    await Promise.all(
      IMAGES.map(
        (src, i) =>
          new Promise((resolve, reject) =>
            loader.load(
              src,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                this.textures[i] = tex;
                this.aspects[i] = tex.image.naturalWidth / tex.image.naturalHeight;
                resolve();
              },
              undefined,
              reject,
            ),
          ),
      ),
    );
  }

  createPlanes() {
    for (let i = 0; i < MAIN_COUNT; i++) {
      const { material, sizeUniform, opacityUniform } = this._createPlaneMaterial(this.textures[i]);
      const mesh = new THREE.Mesh(this.geometry, material);
      this.scene.add(mesh);
      this.planes.push({
        mesh,
        material,
        sizeUniform,
        opacityUniform,
        bounds: { x: 0, y: 0, w: 0, h: 0, z: 0 },
        opacity: 0,
        tilt: 0,
        tiltX: 0,
        trackedEl: null,
        kind: "main",
        image: i,
      });
    }
    // 20 satellite planes (4 per image)
    for (let i = 0; i < MAIN_COUNT; i++) {
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        const { material, sizeUniform, opacityUniform } = this._createPlaneMaterial(
          this.textures[i],
        );
        const mesh = new THREE.Mesh(this.geometry, material);
        this.scene.add(mesh);
        this.planes.push({
          mesh,
          material,
          sizeUniform,
          opacityUniform,
          bounds: { x: 0, y: 0, w: 0, h: 0, z: 0 },
          opacity: 0,
          tilt: 0,
          tiltX: 0,
          trackedEl: null,
          kind: "satellite",
          image: i,
          j,
        });
      }
    }
  }

  syncMesh(plane) {
    const { mesh, bounds, opacity } = plane;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = Math.max(bounds.w, 0.001);
    const ph = Math.max(bounds.h, 0.001);
    mesh.scale.set(pw, ph, 1);
    mesh.position.x = bounds.x + bounds.w / 2 - w / 2;
    mesh.position.y = -(bounds.y + bounds.h / 2 - h / 2);
    mesh.rotation.x = plane.tiltX ?? 0;
    mesh.rotation.y = plane.tilt ?? 0;
    mesh.renderOrder = -(bounds.z ?? 0);
    plane.sizeUniform.value.set(pw, ph);
    plane.opacityUniform.value = opacity;
    mesh.visible = opacity > 0.001 && bounds.w > 0;
  }

  applyMainLayout() {
    for (let i = 0; i < MAIN_COUNT; i++) {
      this.planes[mainIdx(i)].opacity = 1;
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        this.planes[satIdx(i, j)].opacity = 0;
      }
    }
  }

  applyInnerLayout(image) {
    for (let i = 0; i < MAIN_COUNT; i++) {
      this.planes[mainIdx(i)].opacity = i === image ? 1 : 0;
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        this.planes[satIdx(i, j)].opacity = i === image ? 1 : 0;
      }
    }
  }

  applyIndexLayout() {
    for (let i = 0; i < MAIN_COUNT; i++) {
      this.planes[mainIdx(i)].opacity = 1;
      // Satellites are not part of the float constellation, hidden on /index.
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        this.planes[satIdx(i, j)].opacity = 0;
      }
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.fov = 2 * Math.atan(h / 2 / CAMERA_DISTANCE) * (180 / Math.PI);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.onResizeLayout) this.onResizeLayout();
  }

  update() {
    for (const p of this.planes) {
      if (p.trackedEl) {
        const rect = p.trackedEl.getBoundingClientRect();
        p.bounds.x = rect.left;
        p.bounds.y = rect.top;
        p.bounds.w = rect.width;
        p.bounds.h = rect.height;
      }
      this.syncMesh(p);
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener("resize", this.onResize);
    this.renderer?.dispose();
    this.canvas?.remove();
  }
}
