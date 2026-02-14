
// ✅ Canvas

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
} from "three"
import { Dimensions, Size } from "../types/types"

import Media from "./media"
import { ScrollTrigger } from "gsap/ScrollTrigger"


export default class Canvas {
  // ✅ クラスが持つプロパティの型宣言 JSなら不要だが、TSは必須
  element: HTMLCanvasElement
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  sizes: Size
  dimensions: Dimensions
  medias: (Media | null)[] | null

  constructor() {
    // 👉 getElementByIdは、HTMLElement | null のどちらかを返すので型アサーションが必須
    this.element = document.getElementById("webgl") as HTMLCanvasElement;
    this.medias = []
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.setSizes() // 👉 
    this.addEventListeners()
  }

  createScene() {
    this.scene = new Scene()
  }

  createCamera() {
    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    // console.log(this.camera)
    this.scene.add(this.camera)
    this.camera.position.z = 10
  }

  createRenderer() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.renderer = new WebGLRenderer({
      canvas: this.element,
      alpha: true, // canvasの背景を透明に
    })
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.renderer.render(this.scene, this.camera)

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
  }

  // ✅ カメラで見えている範囲を取得。ワールド座標でのポイントで取得
  setSizes() {
    // カメラから描画の位置を取得して、描画サイズをhtmlのpxとthreeのポイントとを一致させる
    let fov = this.camera.fov * (Math.PI / 180) // ラジアンに
    let height = (this.camera.position.z * Math.tan(fov / 2)) * 2; // 👉 画面の高さ
    let width = height * this.camera.aspect; // 👉 画面の幅

    this.sizes = { // 👉 ワールド座標(3D空間の単位)。ポイント
      width: width,
      height: height,
    }
    // console.log(this.sizes); // {width: 11.399472430513804, height: 15.346539759579208}
  }

  addEventListeners() {
    window.addEventListener("resize", this.onResize.bind(this))
  }

  // ✅ リサイズ処理
  onResize() {
    ScrollTrigger.refresh(); // 👉 スクロール位置・要素サイズ・トリガー位置を全て再計算

    this.dimensions = { // 👉 ブラウザの大きさ
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.setSizes(); // カメラの範囲を取得(ワールド座標)

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)

    this.medias?.forEach((media) => {
      media?.onResize(this.sizes)
    })
  }

  // ✅ テクスチャ生成
  createMedias(activeElement?: HTMLImageElement) {
    const images = document.querySelectorAll("img");

    images.forEach((image) => {
      if(image !== activeElement) {
        const media = new Media({
          element: image,
          scene: this.scene,
          sizes: this.sizes,
        });

        this.medias?.push(media);
      }
    });

    this.medias?.forEach((media) => {
      media?.observe()
    });
  }

  // ✅ レンダー
  // scroll: スクロール量
  render(scroll: number, updateScroll: boolean = true) {
    // console.log(scroll, updateScroll); // 遷移時はfalse
    this.medias?.forEach((media) => {
      if (updateScroll) {
        media?.updateScroll(scroll)
      }
    })

    this.renderer.render(this.scene, this.camera);
  }
}
