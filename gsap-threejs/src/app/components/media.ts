
// ✅ media.ts

// const media = new Media({
//   element: image,
//   scene: this.scene,
//   sizes: this.sizes,
// })


import {
  Scene,
  ShaderMaterial,
  PlaneGeometry,
  Mesh,
  Uniform,
  Vector4,
  Vector2,
  Color,
  TextureLoader,
} from "three"
import gsap from "gsap"

import { Position, Size } from "../types/types"
import vertexShader from "../shaders/vertex.glsl"
import fragmentShader from "../shaders/fragment.glsl"

interface Props {
  element: HTMLImageElement 
  scene: Scene
  sizes: Size 
}

export default class Media {
  element: HTMLImageElement // 画像
  scene: Scene
  sizes: Size // 描画の範囲(ワールド座標)

  anchorElement: HTMLAnchorElement | undefined
  material: ShaderMaterial
  geometry: PlaneGeometry
  mesh: Mesh
  nodeDimensions: Size
  meshDimensions: Size
  meshPosition: Position
  elementBounds: DOMRect
  currentScroll: number
  lastScroll: number
  scrollSpeed: number
  scrollTrigger: gsap.core.Tween
  onClickHandler: (e: PointerEvent) => void

  constructor({ element, scene, sizes }: Props) {
    this.element = element; // 画像 img要素
    this.anchorElement = this.element.closest("a") as HTMLAnchorElement | undefined
    // console.log(this.anchorElement); // 親要素のaタグを取得
    this.scene = scene
    this.sizes = sizes // ワールド座標

    this.currentScroll = 0
    this.lastScroll = 0
    this.scrollSpeed = 0

    this.createGeometry()
    this.createMaterial()
    this.createMesh()
    this.setNodeBounds() // 👉 画像の位置情報などを取得
    this.setMeshDimensions()
    this.setMeshPosition()
    this.setTexture(); // テクスチャを生成、元の画像のサイズ取得、uniformに格納

    this.onClickHandler = this.onClickLink.bind(this)
    this.anchorElement?.addEventListener("click", this.onClickHandler)

    this.scene.add(this.mesh)
  }

  // ✅ 画像をクリック時、aタグにdata-home-link-active="true" を付ける
  // ; ... 分を区切っているだけ。
  onClickLink(e: PointerEvent) {
    // console.log("onClickLink");
    // ;(e.currentTarget as HTMLAnchorElement).setAttribute("data-home-link-active", "true")
    const link = e.currentTarget as HTMLAnchorElement;
    link.setAttribute("data-home-link-active", "true");
  }

  createGeometry() {
    this.geometry = new PlaneGeometry(1, 1, 1, 1)
  }

  createMaterial() {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: new Uniform(new Vector4()), // テクスチャ。のちに格納
        uResolution: new Uniform(new Vector2(0, 0)), // 元々の画像の幅、高さ
        uContainerRes: new Uniform(new Vector2(0, 0)), // html上の画像の幅、高さ
        uProgress: new Uniform(0),
        uGridSize: new Uniform(20),
        uColor: new Uniform(new Color("#242424")),
      },
    })
  }

  createMesh() {
    this.mesh = new Mesh(this.geometry, this.material)
  }

  // ✅ 画像の位置情報などを取得
  setNodeBounds() {
    this.elementBounds = this.element.getBoundingClientRect();
    // console.log(this.elementBounds); // DOMRect {x: 26, y: 207.6953125, width: 331.4375, height: 249.6484375, top: 207.6953125, …}

    this.nodeDimensions = {
      width: this.elementBounds.width,
      height: this.elementBounds.height,
    }
  }

  // ✅ 画面の幅/高さに対する画像の幅の割合を算出して、ワールド座標の幅/高さにかけることで
  // ⭐️ ワールド座標におけるメッシュの比率を算出
  setMeshDimensions() {
    // console.log(this.sizes.width); // 11.399472430513804 → ワールド座標でのポイント
    this.meshDimensions = {
      // 👉 (画像の幅 / 画面の幅) * ワールド座標の幅に変形
      //    → 画面の幅に対する画像の幅の割合を算出 
      //    → ワールド座標の幅にかけれて、ワールド座標での比率を算出
      width: (this.nodeDimensions.width * this.sizes.width) / window.innerWidth,
      height: (this.nodeDimensions.height * this.sizes.height) / window.innerHeight,
    }

    // console.log(this.meshDimensions.width, this.meshDimensions.height); // 5.267469111275602 3.9676620790619386
    this.mesh.scale.x = this.meshDimensions.width;
    this.mesh.scale.y = this.meshDimensions.height;
  }

  // ✅ ブラウザ座標における画像の位置を、ワールド座標に変換して、meshに適用する
  setMeshPosition() {
    // ワールド座標での位置の割合を算出
    this.meshPosition = {
      x: (this.elementBounds.left * this.sizes.width) / window.innerWidth,
      y: (-this.elementBounds.top * this.sizes.height) / window.innerHeight,
    }

    this.meshPosition.x -= this.sizes.width / 2; // 左にずらす
    this.meshPosition.x += this.meshDimensions.width / 2; // meshの位置が左に

    this.meshPosition.y -= this.meshDimensions.height / 2;
    this.meshPosition.y += this.sizes.height / 2;

    this.mesh.position.x = this.meshPosition.x;
    this.mesh.position.y = this.meshPosition.y;
  }

  // ✅ テクスチャを生成、元の画像のサイズ取得、uniformに格納
  setTexture() {
    this.material.uniforms.uTexture.value = new TextureLoader().load(
      this.element.src, // 画像のurl
      ({ image }) => {
        const { naturalWidth, naturalHeight } = image;
        // console.log(naturalWidth, naturalHeight); // 画像のもともとの大きさ

        this.material.uniforms.uResolution.value = new Vector2(
          naturalWidth,
          naturalHeight,
        )

        this.material.uniforms.uContainerRes.value = new Vector2(
          this.nodeDimensions.width, // html上の幅
          this.nodeDimensions.height,
        )
      },
    )
  }

  // ✅ Canvasのrenderで発火
  updateScroll(scrollY: number) {
    // console.log(scrollY); // スクロール量
    // console.log(this.sizes.height); // 15.346539759579208
    // console.log(-scrollY / window.innerHeight); // 画面に対するスクロールの割合
    // → それを、this.sizes.height(ワールド座標)にかけることでワールド座標の移動量を算出
    this.currentScroll = (-scrollY * this.sizes.height) / window.innerHeight;
    // console.log(this.currentScroll);

    // 👉 前フレームからどれだけスクロール量が変化したか。
    const deltaScroll = this.currentScroll - this.lastScroll;
    // console.log(deltaScroll);
    this.lastScroll = this.currentScroll

    this.updateY(deltaScroll);
  }

  // ✅ meshのy軸をスクロールに合わせて動かす。
  updateY(deltaScroll: number) {
    // console.log(deltaScroll);
    this.meshPosition.y -= deltaScroll;
    // console.log(this.meshPosition.y);
    this.mesh.position.y = this.meshPosition.y
  }

  // ✅ Scroll Trigger で監視。
  observe() {
    this.scrollTrigger = gsap.to(this.material.uniforms.uProgress, {
      value: 1,
      scrollTrigger: {
        trigger: this.element,
        start: "top bottom",
        end: "bottom top",
        toggleActions: "play reset restart reset",
      },
      duration: 1.6,
      ease: "linear",
    })
  }

  // ✅ WebGL環境を消す、ScrollTriggerを解除
  destroy() {
    this.scene.remove(this.mesh)
    this.scrollTrigger.scrollTrigger?.kill()
    this.scrollTrigger?.kill()
    this.anchorElement?.removeEventListener("click", this.onClickHandler)
    this.anchorElement?.removeAttribute("data-home-link-active")
    this.geometry.dispose()
    this.material.dispose()
  }

  // ✅ 
  onResize(sizes: Size) { // canvas.size
    this.sizes = sizes

    this.setNodeBounds()
    this.setMeshDimensions()
    this.setMeshPosition()

    this.material.uniforms.uContainerRes.value = new Vector2(
      this.nodeDimensions.width,
      this.nodeDimensions.height,
    )
  }
}
