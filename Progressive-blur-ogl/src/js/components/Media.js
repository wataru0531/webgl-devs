
// 

import { Mesh, Program, Texture } from 'ogl'
import vertex from '../../shaders/vertex.glsl';
import fragment from '../../shaders/fragment.glsl';

export default class Media {
  constructor ({ gl, geometry, scene, renderer, screen, viewport, $el, img }) {
    this.gl = gl, // WebGL2RenderingContext {renderer: Renderer, ... }
    this.geometry = geometry;
    this.scene = scene;
    // console.log(renderer); // Renderer {dpr: 1, alpha: true, color: true, depth: true, stencil: false, …}
    this.renderer = renderer;
    this.screen = screen; // { width: window.innerWidth, height: window.innerHeight }
    this.viewport = viewport; // カメラから見える3Dの幅と高さ（視野の幅と高さ）
    this.img = img;
    this.$el = $el;
    this.scroll = 0; // window.scrollY
    this.blurStrength = 1; // heroのみ変化させていく

    this._createShader();
    this._createMesh(); // mesh生成

    this.onResize(); // meshの位置をhtmlの画像の位置に設定する
  }

  _createShader () {
    // このライブラリでいうnew Textureはこのプロジェクトでtextureが使えるように設定しているだけ
    // → textureに渡す画像は後から格納
    // this.glはコンテキストのことで、Threeではこのように渡したりはしないが、OGLではこのように渡すのが
    const texture = new Texture(this.gl, {
      generateMipmaps: false, // レンダリングする際に解像度に応じた適切なサイズのテクスチャを使用するためのもので、生成することでよりスムーズな縮小表示が可能になるが、このテクスチャでは必要ないため無効化。
    });
    // console.log(texture); // Texture {gl: WebGL2RenderingContext, id: 10, image: undefined, target: 3553, type: 5121, …}

    this.program = new Program(this.gl, { // ThreeでいうMaterialを生成してる
      depthTest: false,
      depthWrite: false,
      fragment,
      vertex,
      
      uniforms: {
        tMap: { value: texture }, // 画像
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [0, 0] },
        uViewportSize: { value: [ this.viewport.width, this.viewport.height ] },
        uTime: { value: 100 * Math.random() }, // .04づつプラス
        uBlurStrength: { value: this.blurStrength }, // heroのみ変化。あとは1
      },
      transparent: true
    })

    const image = new Image();

    image.src = this.img.src;
    image.onload = _ => {
      // ここでテクスチャに画像を渡している。
      // 
      texture.image = image; 
      // console.log(texture); // Texture {gl: WebGL2RenderingContext, id: 1, image: img, target: 3553, type: 5121, …}

      // 画像のもともとの大きさ
      // console.log(image.naturalWidth, image.naturalHeight);
      this.program.uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight]
    }
  }

  _createMesh () {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program // Materialのこと
    })

    this.plane.setParent(this.scene); // sceneに追加
  }

  // y軸の位置調整
  onScroll(_scroll) { // window.scrollYのスクロール量
    this.scroll = _scroll
    this.setY(this.y)
  }

  // rafで常時レンダリング。
  update() {
    // console.log(this.blurStrength); // hero以外は1のまま
    this.program.uniforms.uTime.value += .04
    // console.log(this.blurStrength);
    this.program.uniforms.uBlurStrength.value = this.blurStrength
  }

  // 画像の表示サイズ(xとyで指定された幅と高さ)を、3D空間上の表示に合わせて調整する
  // 初回に発火
  setScale (x, y) {
    x = x || this.$el.offsetWidth;
    y = y || this.$el.offsetHeight;
    // console.log(x, y); // 760 669

    // HTMLの画像の大きさの割合を、3D空間におけるplaneの割合を統合させる
    // → 3D 空間のオブジェクトサイズが HTML 上の見た目のサイズと一致するように調整される
    // console.log(this.viewport.width); // 14.66242698665823
    // console.log(x / this.screen.width); // .95
    this.plane.scale.x = this.viewport.width * x / this.screen.width;
    // console.log(this.plane.scale.x); // 13.929305637325319
    this.plane.scale.y = this.viewport.height * y / this.screen.height;

    // 3D空間上のスケール
    this.plane.program.uniforms.uPlaneSize.value = [this.plane.scale.x, this.plane.scale.y];
    // console.log(this.plane.scale.x, this.plane.scale.y); // 13.929305637325319 12.261454567592944
  }

  // HTMLの座標(左上が0, 0)からワールド座標(中央が0)に変換
  setX(x = 0) { // x: this.$el.offsetLeft
    this.x = x; // 
    // console.log(this.x)
    // console.log(this.viewport.width); // 14.66242698665823
    // console.log(this.plane.scale.x); // 13.929305637325319
    // 画面幅における左からの距離の割合を算出 → viewportにおけるその長さを算出
    // → HTMLの座標から3Dの座標に変換
    this.plane.position.x = -(this.viewport.width / 2) + (this.plane.scale.x / 2) + ((this.x / this.screen.width) * this.viewport.width)
    // console.log(this.plane.position.x);
  }

  setY(y = 0) { // this.$el.offsetTop
    // console.log(y); // ブラウザのtopからの位置
    // console.log(this.screen.height)
    this.y = y
    this.plane.position.y = (this.viewport.height / 2) - (this.plane.scale.y / 2) - ((this.y - this.scroll) / this.screen.height) * this.viewport.height
  }

  // GL.jsで、new Media時、リサイズ時に発火する
  // スケール、位置の更新
  onResize({ screen, viewport } = {}) {
    // console.log(screen);   // ブラウザ画面の実際のサイズ
    // console.log(viewport); // cameraからみた範囲の高さと幅
    
    // 初回はscreenがないので発火しない。リサイズ時に発火
    if (screen) { this.screen = screen } // { width: window.innerWidth, height: window.innerHeight }
    // console.log(screen, viewport);

    // 初回はviewportがないので発火しない。リサイズに発火
    if (viewport) { 
      this.viewport = viewport
      console.log(this.viewport);
      this.plane.program.uniforms.uViewportSize.value = [this.viewport.width, this.viewport.height]
    }

    this.setScale(); // pc画面幅に応じたplaneのスケールの比率を決定

    // console.log(this.$el.offsetLeft); // pc画面幅からの距離
    // console.log(this.$el.offsetTop); // bodyの上からの距離
    this.setX(this.$el.offsetLeft)
    this.setY(this.$el.offsetTop)
  }
}