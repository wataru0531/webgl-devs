
// Background

import GUI from 'lil-gui'
import { Renderer, Program, Color, Mesh, Triangle, Vec2 } from 'ogl';

import vertex from '../glsl/background/vertex.glsl';
import fragment from '../glsl/background/fragment.glsl';
import { isTouch } from '../utils/isTouch';

export default class Background {
  #el
  #renderer
  #mesh
  #program
  #isTouch
  #guiObj
  #visible
  
  constructor({ el }) {
    this.#el = el // .background__canvas。canvasタグ
    // this.#guiObj = guiObj
    this.setScene();

    this.#isTouch = isTouch(); // タッチデバイスならtrueを返す
  }

  get type() {
    return 'background'
  }

  get program() {
    return this.#program
  }

  async setScene() {
    // renderer
    this.#renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2), // devicePixelRatio
      canvas: this.#el,
      width: window.innerWidth,
      height: window.innerHeight,
    })

    // WebGLレンダリングコンテキストを取得
    // → ブラウザで3Dや2Dのグラフィックスを描画するためのAPI
    //   WebGLの描画機能にアクセスするためのもの
    const { gl } = this.#renderer;
    // console.log(gl); // WebGL2RenderingContext {renderer: Renderer, canvas: canvas.background__canvas, drawingBufferWidth: 1954, drawingBufferHeight: 2176, drawingBufferColorSpace: 'srgb', …}

    gl.clearColor(1, 1, 1, 1); // 描画バッファをクリアする色を指定。ここでは白

    this.resize();

    // planeは使用しない
    // 下図の通り、positionは−１から1の範囲を超えている。なので画面からはみ出る
    // uvも同様に画面からはみでる

    //         position                uv
    //      (-1, 3)                  (0, 2)
    //         |\                      |\
    //         |__\(1, 1)              |__\(1, 1)
    //         |__|_\                  |__|_\
    //   (-1, -1)   (3, -1)        (0, 0)   (2, 0)

    const geometry = new Triangle(gl); // 三角形のジオメトリを生成
    // console.log(geometry);

    // threeでいうところのmaterial
    // this.#program → WebGLのシェーダープログラム(vertexシェーダーとfragmentシェーダー)を作成するための関数
    this.#program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 }, // 経過時間
        uScroll: { value: 0 }, // スクロール量。ここでは0 〜 2。body全体で1
        uColor1: { value: new Color('#fdfaee') }, // かなり薄い黄色
        uColor2: { value: new Color('#d6abb4') }, // ピンク色
        uResolution: { value: new Vec2(gl.canvas.offsetWidth, gl.canvas.offsetHeight) },
      },
    })

    this.#mesh = new Mesh(gl, { geometry, program: this.#program })
  }

  render = (t) => {
    if (!this.#program) return
    this.#program.uniforms.uTime.value = t
    // console.log(this.#program.uniforms.uTime.value)

    // Don't need a camera if camera uniforms aren't required
    this.#renderer.render({ scene: this.#mesh })
  }

  scroll = (_s) => { // 0 〜 1。body全体で1
    this.#program.uniforms.uScroll.value = _s * 2
  }

  // リサイズ処理
  resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    this.#renderer.setSize(w, h); 

    if (this.#program) {
      this.#program.uniforms.uResolution.value = new Vec2(w, h)
    }

    this.#isTouch = isTouch();
  }
}
