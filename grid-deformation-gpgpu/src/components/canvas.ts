
// Canvasクラス
// Scene, Renderer, Cameraなどの環境を生成し、Canvasにおける全体的な処理をかける
// Mediaを初期化してレンダリングにかける

// import * as THREE from 'three';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Clock,
  Raycaster,
  Vector2,
  Mesh,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui'

import { Dimensions, Size } from '../types/types';
import Media from './media';

// クラスのプロパティには 型定義 を付けるだけでなく、後から実体を格納することも可能。
// そして、型定義と実体の初期値を同時に設定することもできます。
export default class Canvas {
  // HTMLCanvasElement。ブラウザが標準で提供しているWeb APIの型
  // → elementが、HTMLCanvasElement型であることが保証されることで、
  //   エディタがgetContextや他のキャンバス関連メソッドを補完してくれるため、開発効率が向上する
  element: HTMLCanvasElement;
  scene: Scene
  // → Three.jsからインポートしたクラスは型としても利用できる。
  // 　TypeScriptの特性によるもの
  //   @types/threeのパッケージからSceneなどのクラスの型定義が済んでいるので。
  //   それゆえに@types/threeがインストールされていなければ使えない。
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  sizes: Size // 型 { width: number height: number }
  dimensions: Dimensions // 型 { width: number height: number pixelRatio: number }
  time: number
  clock: Clock
  raycaster: Raycaster
  mouse: Vector2
  orbitControls: OrbitControls
  medias: Media[]
  debug: GUI;
  timerId: null | number;

  constructor() {
    this.element = document.getElementById('webgl') as HTMLCanvasElement;
    this.timerId = null;

    this.time = 0
    this.createClock();
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.setSizes();
    this.createRayCaster();
    this.createOrbitControls();
    this.addEventListeners();
    this.createDebug();
    this.createMedias();
    this.render();
  }

  createClock() {
    this.clock = new Clock();
    // console.log(this.clock); // Clock {autoStart: true, startTime: 0, oldTime: 0, elapsedTime: 0, running: false}
  }

  createScene() {
    this.scene = new Scene()
  }

  createCamera() {
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    this.scene.add(this.camera)
    this.camera.position.z = 10
  }

  createOrbitControls() {
    // console.log(this.renderer.domElement); // canvasタグ。rendererの初期化の部分で渡したthis.elementのこと
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
  }

  createRenderer() {
    this.dimensions = { // 
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.renderer = new WebGLRenderer({ canvas: this.element, alpha: true })
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.renderer.render(this.scene, this.camera)

    this.renderer.setPixelRatio(this.dimensions.pixelRatio);
  }

  createDebug() {
    this.debug = new GUI()
  }

  // cameraのfovとhtmlまでの距離zから、canvasの幅と高さを算出
  // → Three.js空間のカメラの視野(canvasの幅と高さ)
  setSizes() {
    // console.log(this.camera); // PerspectiveCamera {isObject3D: true, uuid: 'be40c74b-3c45-4578-8160-c532d6e2b921', name: '', type: 'PerspectiveCamera', parent: Scene, …}
    let fov = this.camera.fov * (Math.PI / 180); // radianに変換
    let height = (Math.tan(fov / 2) * this.camera.position.z) * 2; // 
    let width = height * this.camera.aspect
    // console.log(width, height); // 9.873692860023388 15.346539759579208

    this.sizes = { width, height } // canvasの幅と高さ
  }

  createRayCaster() {
    this.raycaster = new Raycaster()
    this.mouse = new Vector2()
  }

  // マウス、レイキャスティング。 このファイル内で発火。
  onMouseMove(event: MouseEvent) {
    // -1 〜 1に
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    // setFromCamera
    // → マウスの画面上の位置から、カメラの視点に基づいてシーン内で光線がどの方向に向かうべきかを計算
    // 　マウスの位置からカメラのビューにおける 3D空間の位置に向けて光線を発射する処理
    this.raycaster.setFromCamera(this.mouse, this.camera); // 
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    // console.log(intersects); // [{…}]

    const target = intersects[0]; // ぶつかった持っても手前のオブジェクトオブジェクト
    // console.log(target); // { distance: 12.054448659808303, point: _Vector3, object: Mesh, uv: _Vector2, normal: _Vector3, …}

    // ぶつかったtargetが存在するか、target.objectにmaterialプロパティがあるかどうか
    // → axesHelperなどはmaterialを持たないので対象から外す
    if (target && 'material' in target.object) {
      const targetMesh = intersects[0].object as Mesh;
      // console.log(targetMesh); // Mesh {isObject3D: true, uuid: '29d5b400-3210-41e6-92f6-abef10864001', name: '', type: 'Mesh', parent: Scene, …}

      // 
      this.medias.forEach((media) => {
        // 生成したmediaとぶつかったオブジェクトのmeshと同じ かつ targetがuvをもっていたら
        if (media.mesh === targetMesh && target.uv) {
          media.onMouseMove(target.uv);
          // → this.gpgpu.updateMouse(uv); 
        }
      })
    }
  }

  addEventListeners() {
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('resize', () => {
      this.onResize();

      clearTimeout(this.timerId as number);
      // this.onResize.bind(this)
      this.timerId = setTimeout(() => {
        // console.log("resize done!!");
        this.onResize();
      }, 500);
    })
  }

  // リサイズ処理
  onResize() {
    // console.log(this.medias)

    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.setSizes()

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)

    // if(this.medias[0]){
    //   this.medias.forEach(media => {
    //     media.onResize();
    //   })
    // }
  }

  // 
  createMedias() {
    this.medias = []

    const images = [...document.querySelectorAll('img')];
    // console.log(images);

    images.forEach((img) => {
      const media = new Media({
        element: img,
        scene: this.scene, // 共通のSceneなどを渡していく。
        sizes: this.sizes,
        renderer: this.renderer,
        debug: this.debug, 
      })

      this.medias.push(media)
    })
  }

  render() { // → main.jsのAppでレンダリング
    this.time = this.clock.getElapsedTime();
    // console.log(this.time);
    // → Clockインスタンスが作成されてからの経過した秒数。実際の経過時間

    this.orbitControls.update();
    this.medias.forEach((media) => media.render(this.time));

    this.renderer.render(this.scene, this.camera);
  }
}
