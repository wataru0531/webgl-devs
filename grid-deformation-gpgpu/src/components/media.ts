
// Media
// 画像のmeshを生成 → Canvasでレンダリング → Canvasは、App.jsでレンダリング
// ここではMedia(画像)１枚に関する処理を記述

import {
  Scene,
  WebGLRenderer,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  Vector4,
  Vector2,
  Uniform,
  TextureLoader,
} from 'three';
import GUI from 'lil-gui'

import { 
  Position, // { x: number y: number }
  Size      // { width: number height: number }
} from '../types/types'; 

import GPGPU from '../utils/gpgpu'
import vertexShader from '../shaders/vertex.glsl'
import fragmentShader from '../shaders/fragment.glsl'

// 型
interface Props {
  element: HTMLImageElement
  scene: Scene
  sizes: Size // canvasのサイズ。 { width: number height: number }
  renderer: WebGLRenderer
  debug: GUI
}


export default class Media {
  element: HTMLImageElement
  scene: Scene // クラスは型としても使用可能
  sizes: Size  // canvasのサイズ。型 { width: number height: number }
  material: ShaderMaterial 
  geometry: PlaneGeometry
  renderer: WebGLRenderer
  mesh: Mesh
  nodeDimensions: Size
  meshDimensions: Size
  meshPosition: Position // 型 { x: number y: number }
  elementBounds: DOMRect // ブラウザAPIが提供する型
  currentScroll: number
  lastScroll: number
  scrollSpeed: number
  gpgpu: GPGPU 
  time: number
  debug: GUI

  constructor({ element, scene, sizes, renderer, debug }: Props) {
    this.element = element; // img
    // 共通のもの(scene, sizes, renderer, debugなど)が渡ってくる
    this.scene = scene 
    this.sizes = sizes // canvasのサイズ
    this.renderer = renderer
    this.debug = debug

    this.currentScroll = 0
    this.lastScroll = 0
    this.scrollSpeed = 0
    this.time = 0

    this.createGeometry(); // plane
    this.createMaterial();
    this.createMesh();
    this.setNodeBounds(); // imgの幅と高さ
    this.setMeshDimensions();
    this.setMeshPosition();

    this.setTexture();
    this.createGPGPU();
    this.setupDebug();

    this.scene.add(this.mesh); // 共通のsceneに追加 → Canvasでレンダリング
  }

  createGeometry() {
    this.geometry = new PlaneGeometry(1, 1)
  }

  createMaterial() {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        // Uniform()で作成されたインスタンスを使うことで、シェーダープログラムに渡す値を動的に変更できる
        // → ロード完了前にShaderMaterialを作成する必要がある場合、一時的に適当な型で初期化することでエラーを防いでいる
        // Three.jsのShaderMaterialは、uniformsプロパティにすべてのuniformを渡す必要がある
        // 値が未定義（undefined）のままだとエラーになるため、仮の値で初期化しているだけ
        // new Uniform() は、{ value: Vector4() } と同じ
        uTexture: new Uniform(new Vector4()),
        uGrid: new Uniform(new Vector4()),
        uImageResolution: new Uniform(new Vector2(0, 0)), // 画像自体の幅と高さ
        uContainerResolution: new Uniform(new Vector2()), // containerの幅と高さ。resolution 解像度
        uDisplacement: new Uniform(0),
        uRGBshift: new Uniform(new Vector2(0.02, 0.0)),
      },
    })
  }

  createMesh() {
    this.mesh = new Mesh(this.geometry, this.material)
  }

  // 画像の幅と高さを取得
  setNodeBounds() {
    this.elementBounds = this.element.getBoundingClientRect(); // img

    this.nodeDimensions = {
      width: this.elementBounds.width,
      height: this.elementBounds.height,
    }
    // console.log(this.nodeDimensions); // { width: 700, height: 412.3671875 }
  }

  // meshの幅と高さを取得 → meshの拡大・縮小率 を取得 
  setMeshDimensions() { // imgの幅と高さを
    // this.nodeDimensions → 実際の画像のサイズ
    // this.sizes → canvasのサイズ(Three.js空間のカメラの視野)。(あくまでもカメラの視野内における相対的な空間のサイズ)
    //              canvasのサイズはブラウザいっぱいに広がっているサイズと同じ

    // 画像のサイズ自体を、canvasの大きさに合わせる → meshの大きさとそろえる
    this.meshDimensions = {
      width: this.nodeDimensions.width * (this.sizes.width / window.innerWidth),
      height: this.nodeDimensions.height * (this.sizes.height / window.innerHeight),
    }
    // console.log(this.nodeDimensions.width, this.nodeDimensions.height); // 1000 589.1015625
    // console.log(this.meshDimensions); //{ width: 14.105275514319125, height: 8.309439844978389 }
    

    this.mesh.scale.x = this.meshDimensions.width
    this.mesh.scale.y = this.meshDimensions.height
  }

  setupDebug() {
    const opt = {
      dis: this.material.uniforms.uDisplacement.value > 0,
    }

    this.debug.add(opt, 'dis').onChange((dis: boolean) => {
      if (dis) this.material.uniforms.uDisplacement.value = 1;
      else this.material.uniforms.uDisplacement.value = 0;

    }).name('grid map')

    //this.debug.add(this.material.uniforms.uRGBshift.value, 'x').min(-0.1).max(0.1).step(0.001).name('rgb X')
    //this.debug.add(this.material.uniforms.uRGBshift.value, 'y').min(-0.1).max(0.1).step(0.001).name('rgb Y')
  }

  // GPGPUの処理
  // 
  createGPGPU() {
    this.gpgpu = new GPGPU({
      // 共通のrendererなどを渡す
      renderer: this.renderer,
      scene: this.scene,
      sizes: this.sizes, // canvasのサイズ
      debug: this.debug,
    })
  }

  // 位置を設定
  setMeshPosition() {
    this.meshPosition = {
      // this.elementBounds → 画像のDomRectを格納
      x: (this.elementBounds.left * this.sizes.width) / window.innerWidth,
      y: (-this.elementBounds.top * this.sizes.height) / window.innerHeight,
    }

    this.meshPosition.x -= this.sizes.width / 2
    this.meshPosition.x += this.meshDimensions.width / 2

    this.meshPosition.y -= this.meshDimensions.height / 2
    this.meshPosition.y += this.sizes.height / 2

    this.mesh.position.x = this.meshPosition.x
    this.mesh.position.y = this.meshPosition.y
  }

  // テクスチャのロード
  setTexture() {
    this.material.uniforms.uTexture.value = new TextureLoader().load(this.element.src, ({ image }) => {
      const { naturalWidth, naturalHeight } = image; 
      // console.log(naturalWidth, naturalHeight); // 2699 1590

      const container = document.querySelector('.image-container') as HTMLElement;
      const { width, height } = container.getBoundingClientRect()

      // console.log(width, height); // 976 574.9609375

      this.material.uniforms.uImageResolution.value = new Vector2(naturalWidth, naturalHeight);
      this.material.uniforms.uContainerResolution.value = new Vector2(width, height);
    })
  }

  // スクロール量の更新 どこで使う？
  updateScroll(scrollY: number) {
    // console.log(scrollY);

    this.currentScroll = (-scrollY * this.sizes.height) / window.innerHeight

    const deltaScroll = this.currentScroll - this.lastScroll
    this.lastScroll = this.currentScroll

    this.updateY(deltaScroll)
  }

  updateY(deltaScroll: number) {
    // console.log(deltaScroll)
    this.meshPosition.y -= deltaScroll
    this.mesh.position.y = this.meshPosition.y
  }

  onResize(sizes: Size) {
    this.sizes = sizes;

    this.setNodeBounds()
    this.setMeshDimensions()
    this.setMeshPosition()
  }

  // CanvasのonMouseMove で発火。
  // → レイキャスティングで衝突した画像のuvを渡す
  onMouseMove(uv: Vector2) {
    this.gpgpu.updateMouse(uv);
  }

  // レンダー
  render(time: number) { // Canvasでレンダリング → Appでレンダリング
    // time → Clockにより取得した経過時間
    // this.time と time の差分が取得しつづける
    const deltaTime = this.time - time;
    this.time = time;
    // console.log(deltaTime)
    // console.log(time);

    this.gpgpu.render(time, deltaTime); // 経過時間、差分(浮動小数で大体一定の値)

    this.material.uniforms.uGrid.value = this.gpgpu.getTexture()
  }
}
