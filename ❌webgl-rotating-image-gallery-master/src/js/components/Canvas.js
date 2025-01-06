
// 

import { Renderer, Camera, Transform, Plane } from "ogl";
import Media from "./Media.js";
import NormalizeWheel from "normalize-wheel";
import { lerp } from "../utils/math";
import AutoBind from "../utils/bind";

export default class Canvas {
  constructor() {
    this.images = ["./img/1.webp", "./img/2.webp", "./img/3.webp", "./img/4.webp", "./img/5.webp", "./img/6.webp", "./img/7.webp", "./img/8.webp", "./img/9.webp", "./img/10.webp", "./img/11.webp"];

    this.scroll = {
      ease: 0.01,
      current: 0, // 現在のスクロール量
      target: 0,
      last: 0,
    };
    // console.log(this); // Canvas {images: Array(11), scroll: {…}}
    AutoBind(this); // クラスのメソッド内のthisをCanvasにbindする

    this.createRenderer();
    this.createCamera();
    this.createScene();

    this.onResize();

    this.createGeometry();
    this.createMedias();

    this.update();

    this.addEventListeners();
    this.createPreloader();
  }

  createPreloader() {
    Array.from(this.images).forEach((source) => {
      const image = new Image();
      // console.log(this); // Canvas {images: Array(11), scroll: {…}, createPreloader: ƒ, createRenderer: ƒ, createCamera: ƒ, …}
      this.loaded = 0;

      image.src = source;
      image.onload = (_) => {
        this.loaded += 1;
        // console.log(this.loaded); // 1 2 3 ... 11
        // console.log(this.loaded, this.images.length);
        if (this.loaded === this.images.length) {
          // 全ての画像の読み込みが完全に終わればクラス付与
          document.documentElement.classList.remove("loading");
          document.documentElement.classList.add("loaded");
        }
      };
    });
  }

  // renderer
  // → rendererは3Dシーンをcanvasに描画（レンダリング）するためのエンジン。
  // 具体的には、GPU（グラフィックスプロセッサ）を使って、カメラで見たシーンをリアルタイムにcanvasに描画する
  createRenderer() {
    this.renderer = new Renderer({
      canvas: document.querySelector("#gl"),
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2), // devicePixelRatio
    });

    this.gl = this.renderer.gl;
    // console.log(this.gl); // WebGL2RenderingContext {renderer: Renderer, canvas: canvas#gl, drawingBufferWidth: 600, drawingBufferHeight: 300, drawingBufferColorSpace: 'srgb', …}
  }

  // camera
  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  // scene
  createScene() {
    // Transform
    // → オブジェクトのトランスフォーム（位置、回転、スケールなど）を管理するためのクラス
    //   シーン全体の管理というよりは、個々のオブジェクトの変換を管理する役割を果たす
    this.scene = new Transform();
    // console.log(this.scene); // Transform {parent: null, children: Array(0), visible: true, matrix: Mat4(16), worldMatrix: Mat4(16), …
  }

  // geometry
  createGeometry() {
    this.planeGeometry = new Plane(this.gl, { // 初期化の時はrendererを渡す
      heightSegments: 1,
      widthSegments: 100,
    });
  }

  // Media初期化。メッシュ生成
  createMedias() {
    this.medias = this.images.map((image, index) => {
      // console.log(this.gl); // WebGL2RenderingContext {renderer: Renderer, canvas: canvas#gl, drawingBufferWidth: 1940, drawingBufferHeight: 2176, drawingBufferColorSpace: 'srgb', …}
      
      // console.log(this.screen, this.viewport);
      // {width: 1000, height: 1088}, {height: 16.5685424949238, width: 15.228439793128492}
      // Three.jsでは、Scene や Mesh が内部的にレンダラーを持ち、シーンの描画が簡単に行える一方、
      // ogl では、レンダリングのプロセスや各オブジェクトの管理を明示的に指定しなければならない
      return new Media({
        gl: this.gl,
        geometry: this.planeGeometry,
        scene: this.scene,
        renderer: this.renderer,
        screen: this.screen, // ブラウザのサイズ { width: window.innerWidth, height: window.innerHeight }
        viewport: this.viewport, // 
        image,
        length: this.images.length,
        index,
      });
    });
    // console.log(this.medias); 
    // (11) [{extra: 0, gl: WebGL2RenderingContext, geometry: _Plane, scene: Transform, renderer: Renderer, …}, Media, Media, Media, Media, Media, Media, Media, Media, Media, Media]
  }

  // ここでは、cameraで見たsceneのサイズ(視野)と、ブラウザのサイズ、rendererでレンダリングするサイズを同じにする
  // スクリーン、レンダラーのサイズを同じにして、cameraが映し出すサイズをそれらと同じにする
  // → ブラウザでの1pxと、3Dの世界の1単位が同じ大きさになる

  // → ブラウザのサイズからcameraのサイズを導いていく。
  // 　ブラウザをリサイズすればcameraの視野も可変する
  // ⭐️レンダラー → cameraから捉えたシーンをレンダリングする
  onResize() {
    this.screen = { width: window.innerWidth, height: window.innerHeight };

    // 描画対象となるcanvasのサイズを設定
    // → cameraで見た範囲を全てレンダリングするわけではない
    this.renderer.setSize(this.screen.width, this.screen.height);

    this.camera.perspective({
      // this.gl → rendererのこと
      aspect: this.gl.canvas.width / this.gl.canvas.height, // アスペクト
    });

    const fov = this.camera.fov * (Math.PI / 180); // 弧度法。45°をラジアンに。0.785くらい。
    // tan 角度を与えることで比を返す →　ここから高さを算出
    const height = 2 * (Math.tan(fov / 2) * this.camera.position.z);
    const width = height * this.camera.aspect;

    // アスペクト比やサイズはブラウザあっているが、視野角が狭く、zの距離が長いので狭い範囲でしか物体が見えていない
    this.viewport = { height, width }; // カメラが描画する範囲 
    // console.log(this.viewport); // { height: 16.5685424949238, width: 15.228439793128492 }

    if (this.medias) {
      // 各meshのリサイズ
      this.medias.forEach((media) =>
        media.onResize({ screen: this.screen, viewport: this.viewport })
      );
    }
  }

  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  onTouchDown(event) {
    this.isDown = true;

    this.scroll.position = this.scroll.current;
    this.start = event.touches ? event.touches[0].clientY : event.clientY;
  }

  onTouchMove(event) {
    if (!this.isDown) return;

    const y = event.touches ? event.touches[0].clientY : event.clientY;
    const distance = (this.start - y) * 0.1;

    this.scroll.target = this.scroll.position + distance;
  }

  onTouchUp(event) {
    this.isDown = false;
  }

  onWheel(event) {
    const normalized = NormalizeWheel(event);
    const speed = normalized.pixelY;

    this.scroll.target += speed * 0.005;
    // console.log(this.scroll);
  }

  // 値の更新
  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);

    if(this.scroll.current > this.scroll.last) {
      this.direction = "up";
    } else {
      this.direction = "down";
    }

    if (this.medias) {
      // スクロール処理
      this.medias.forEach((media) => media.update(this.scroll, this.direction));
    }

    this.renderer.render({
      scene: this.scene,
      camera: this.camera,
    });

    this.scroll.last = this.scroll.current;

    window.requestAnimationFrame(this.update);
  }

  addEventListeners() {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("wheel", this.onWheel);
    window.addEventListener("mousewheel", this.onWheel);

    window.addEventListener("pointerdown", this.onTouchDown);
    window.addEventListener("pointermove", this.onTouchMove);
    window.addEventListener("pointerup", this.onTouchUp);

    window.addEventListener("touchstart", this.onTouchDown);
    window.addEventListener("touchmove", this.onTouchMove);
    window.addEventListener("touchend", this.onTouchUp);
  }
}
