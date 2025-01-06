
// メッシュ
// medias

import { Mesh, Program, Texture } from "ogl";
import vertex from "../../shaders/vertex.glsl";
import fragment from "../../shaders/fragment.glsl";
import { map } from "../utils/math";

export default class Media {
  constructor({
    gl, // renderer
    geometry,
    scene,
    renderer,
    screen,
    // cameraの描画範囲。
    // アスペクト比やサイズはブラウザあっているが、視野角が狭く、zの距離が長いので狭い範囲でしか物体が見えていない
    viewport,
    image,
    length, // 11
    index, // 画像のインデックス
  }) {
    this.extra = 0;

    // three.js では、Scene や Mesh が内部的にレンダラーを持ち、シーンの描画が簡単に行える一方、
    // ogl では、レンダリングのプロセスや各オブジェクトの管理を明示的に指定しなければならない
    this.gl = gl;
    this.geometry = geometry;
    this.scene = scene;
    this.renderer = renderer;
    this.screen = screen;
    this.viewport = viewport;
    this.image = image;
    this.length = length;
    this.index = index;

    this.createShader();
    this.createMesh();

    this.onResize();
  }

  createShader() {
    // ここではまだ、WebGL にテクスチャ用のメモリを確保しているだけ。ここで渡すこともできるが、後から画像を渡す
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
    });

    // new Material と同じ
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment,
      vertex,
      uniforms: {
        tMap: { value: texture },
        uPosition: { value: 0 },
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [0, 0] },
        uSpeed: { value: 0 },
        rotationAxis: { value: [0, 1, 0] },
        distortionAxis: { value: [1, 1, 0] },
        uDistortion: { value: 3 },
        uViewportSize: { value: [this.viewport.width, this.viewport.height] },
        uTime: { value: 0 },
      },
      cullFace: false,
    });

    const image = new Image();

    image.src = this.image;
    image.onload = (_) => {
      texture.image = image; // ここでテクスチャを渡す。これまではメモリを確保していただけ

      // console.log(image.naturalWidth, image.naturalHeight); // 896 1344
      this.program.uniforms.uImageSize.value = [
        image.naturalWidth, // 元々の画像の大きさ
        image.naturalHeight,
      ];
    };
  }

  // mesh生成、sceneに追加
  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });

    // planeをシーンに追加。
    // ここでは親がsceneになり、子がplane。
    // → this.sceneにひとまとめにしてレンダリング
    this.plane.setParent(this.scene);
  }

  setScale(x, y) {
    // ブラウザの画面サイズを基準に、仮想空間(カメラの描画範囲)におけるオブジェクトのサイズ(スケール)を適切に調整する
    // → ブラウザのサイズを基準にして3D空間内のオブジェクトのサイズを決定しているだけ
    x = 320;
    y = 300;
    this.plane.scale.x = (this.viewport.width * x) / this.screen.width;
    this.plane.scale.y = (this.viewport.height * y) / this.screen.height;
    // console.log(this.screen.width, this.screen.height); // 1000 1088
    // console.log(this.plane.scale.x, this.plane.scale.y); // 4.873100733801118 4.568531937938548
    // ブラウザのサイズとカメラのサイズは会っていない
    // → アスペクト比やサイズはブラウザあっているが、視野角が狭く、zの距離が長いので狭い範囲でしか物体が見えていない

    this.plane.program.uniforms.uPlaneSize.value = [
      this.plane.scale.x,
      this.plane.scale.y,
    ];
  }

  // 横軸の位置を決定
  setX() {
    this.plane.position.x =
      -(this.viewport.width / 2) + this.plane.scale.x / 2 + this.x;
  }

  // Canvasで実行
  // screen → ブラウザのサイズ。viewport → カメラが描画するサイズ。両方とも同じサイズ
  onResize({ screen, viewport } = {}) {
    if(screen) this.screen = screen;

    if(viewport) {
      this.viewport = viewport;
      this.plane.program.uniforms.uViewportSize.value = [
        this.viewport.width,
        this.viewport.height,
      ];
    }
    this.setScale();

    this.padding = 0.8;
    this.height = this.plane.scale.y + this.padding;

    this.heightTotal = this.height * this.length;

    // yの位置
    // console.log(this.index); // 0 1 2 3 ... 10
    this.y = this.height * this.index;
    // console.log(this.y); // 5.368531937938548, 10.737063875877096, 16.105595813815643, 21.474127751754192, 26.84265968969274, 32.21119162763129, 37.579723565569836, 42.948255503508
  }

  // スクロール処理。Canvasで実行
  update(scroll, direction) {
    this.plane.position.y = this.y - scroll.current - this.extra;

    // map position from 5 to 15 depending on the scroll position
    const position = map(
      this.plane.position.y,
      -this.viewport.height,
      this.viewport.height,
      5,
      15
    );

    this.program.uniforms.uPosition.value = position;

    this.speed = scroll.current - scroll.last;

    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = scroll.current;

    const planeOffset = this.plane.scale.y / 2;
    const viewportOffset = this.viewport.height;

    this.isBefore = this.plane.position.y + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.y - planeOffset > viewportOffset;

    if (direction === "up" && this.isBefore) {
      this.extra -= this.heightTotal;

      this.isBefore = false;
      this.isAfter = false;
    }

    if (direction === "down" && this.isAfter) {
      this.extra += this.heightTotal;

      this.isBefore = false;
      this.isAfter = false;
    }
  }
}
