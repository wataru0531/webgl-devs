
// Cardのコンポーネント

import GUI from 'lil-gui';
import { Renderer, Program, Color, Mesh, Triangle, Vec2 } from 'ogl';
import { gsap } from 'gsap';
import { isTouch } from '../utils/isTouch';

import IntersectionObserver from '../managers/IntersectionObserver';
import LoaderManager from '../managers/LoaderManager'; // → 初期化した状態でimport
import vertex from '../glsl/main.vert';
import fragment from '../glsl/main.frag';


export default class Card {
  #el // canvas
  #renderer
  #mesh
  #program
  #mouse = new Vec2(0, 0)
  #mouseTarget = new Vec2(0, 0)
  #elRect
  #canMove = true
  #src
  #index
  #isTouch
  #guiObj
  #visible

  constructor({ el, src, index, guiObj }) {
    this.#el = el; // canvas
    this.#src = src; 
    this.#index = index;
    this.#guiObj = guiObj; // { bulge: 0, strength: 1.1, radius: 0.95 }

    this.setScene();
    
    this.#el.dataset.intersectId = index;

    this.#isTouch = isTouch();
    // console.log('demo 1')
  }

  get type() {
    return 'card'
  }

  get program() {
    return this.#program
  }

  // 初期化
  async setScene() {
    // レンダラー
    this.#renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2), // devicePixelRatio
      canvas: this.#el,
      width: this.#el.offsetWidth, // 画像の幅と高さ
      height: this.#el.offsetHeight,
    });
    // console.log(this.#renderer); // Renderer {dpr: 2, alpha: false, color: true, depth: true, stencil: false, …}
    // console.log(this.#el.offsetWidth, this.#el.offsetHeight); // Card.js?t=1733408379653:62 264 600

    // WebGLレンダリングコンテキストを取得
    // → ブラウザで3Dや2Dのグラフィックスを描画するためのAPI
    //   WebGLの描画機能にアクセスするためのもの
    const { gl } = this.#renderer;

    // テクスチャをロードして、画像のキャッシュを生成
    // loadManager → 初期化した状態でimport
    const prms = await LoaderManager.load([
      { textureName: `image_${this.#index}`, textureUrl: `./img/${this.#src}`},
    ], gl);
    // console.log(prms); // このprmsは検証用でしか使わない

    gl.clearColor(1, 1, 1, 1)

    this.resize();

    // 
    //         position                uv
    //      (-1, 3)                  (0, 2)
    //         |\                      |\
    //         |__\(1, 1)              |__\(1, 1)
    //         |__|_\                  |__|_\
    //   (-1, -1)   (3, -1)        (0, 0)   (2, 0)

    const geometry = new Triangle(gl); // 三角形のジオメトリを生成

    // this.assets(画像のキャッシュ)からインデックスに見合ったTextureを取得
    const texture = LoaderManager.get(`image_${this.#index}`); 
    // console.log(texture); // Texture {gl: WebGL2RenderingContext, id: 1, image: img, target: 3553, type: 5121, …}

    // threeでいうところの、materialを生成
    this.#program = new Program(gl, { // glはコンテキスト
      vertex: vertex,
      fragment: fragment,

      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uTextureResolution: { value: new Vec2(texture.image.width, texture.image.height) },
        uResolution: { value: new Vec2(gl.canvas.offsetWidth, gl.canvas.offsetHeight) },
        uMouse: { value: this.#mouse }, // 
        uMouseIntro: { value: new Vec2(0.5, 0) },
        uIntro: { value: 0 },
        uBulge: { value: 0 },
        uRadius: { value: this.#guiObj.radius }, // { bulge: 0, strength: 1.1, radius: 0.95 }
        uStrength: { value: this.#guiObj.strength },
      },
    })
    // console.log(this.#program.uniforms.uTextureResolution); // value: _Vec2(2) [896, 1344]
    // console.log(this.#program.uniforms.uResolution); // 240, 600

    // mesh
    this.#mesh = new Mesh(gl, { geometry, program: this.#program })

    this.events(); // マウスのin/outの処理

    // intersectionObserver
    IntersectionObserver.observe(this.#index, this.#el, this.show, this.hide);
  }

  // リサイズ処理
  resize = () => {
    const w = this.#el.parentNode.offsetWidth;
    const h = this.#el.parentNode.offsetHeight;
    this.#renderer.setSize(w, h); 

    this.#elRect = this.#el.getBoundingClientRect();

    // console.log(this.program); 
    if (this.#program) {
      this.#program.uniforms.uResolution.value = new Vec2(w, h)
    }

    this.#isTouch = isTouch();
  }

  // 要素がビューポートに入ったら発火 intersectionObserverで発火
  show = () => {
    let delay = 0;

    this.tlHide?.kill(); // 停止
    this.tlShow = gsap.timeline();

    // gsap.delayedCall → 指定した delay 秒後にコールバックを実行
    gsap.delayedCall(delay, () => {
      this.#el.parentNode.parentNode.classList.add('is-visible'); // .cardにクラス付与
    });

    this.tlShow.fromTo(this.#program.uniforms.uBulge, // bulge 膨らみ、隆起
      { value: 1 },
      {
        value: 0,
        duration: 1.8,
        ease: 'power3.out',
        delay,
      }
    );

    this.tlShow.to(this.#program.uniforms.uIntro, { // デフォルト 0
      value: 1, 
      duration: 5, 
      delay 
    }, 0); // タイムラインの先頭から発火する

    this.#visible = true;
  }

  // 要素がビューポートから外れたら発火
  hide = () => {
    let delay = 0;

    this.tlShow?.kill();
    this.tlHide = gsap.timeline();

    gsap.delayedCall(delay, () => {
      this.#el.parentNode.parentNode.classList.remove('is-visible');
    });

    this.tlHide.to(this.#program.uniforms.uBulge, {
      value: 1,
      duration: 1.8,
      ease: 'power3.out',
      delay,
    });

    this.tlHide.to(this.#program.uniforms.uIntro, { 
      value: 0, 
      duration: 1, 
      delay 
    }, 0);

    this.#visible = false;
  }

  events() {
    this.#el.addEventListener('pointerenter', this.handlePointerEnter, false)
    this.#el.addEventListener('pointerleave', this.handlePointerLeave, false)
  }

  render = (t) => {
    if (!this.#program) return
    // this.#program.uniforms.uTime.value = t * 0.001

    this.#mouseTarget.x = gsap.utils.interpolate(this.#mouseTarget.x, this.#mouse.x, 0.1)
    this.#mouseTarget.y = gsap.utils.interpolate(this.#mouseTarget.y, this.#mouse.y, 0.1)
    // console.log(`x: ${this.#mouseTarget.x}, y: ${this.#mouseTarget.y}`);

    this.#program.uniforms.uMouse.value = this.#mouseTarget

    this.#renderer.render({ scene: this.#mesh })
  }

  // マウスムーブ App.jsで発火
  // canvas内で、左下を(0, 0)、右上を(1, 1)の座標にして値を取得している
  pointerMove = ({ touches, clientX, clientY }) => {
    if (!this.#canMove || !this.#program || !this.#visible) return;

    // console.log(this.#el); // canvasタグ
    this.#elRect = this.#el.getBoundingClientRect(); // canvas
    
    let eventX = this.#isTouch ? touches[0].pageX : clientX;
    let eventY = this.#isTouch ? touches[0].pageY : clientY;
    // console.log(`x: ${eventX}, y: ${eventY}`);
    // console.log(`top: ${this.#elRect.top}px, left: ${this.#elRect.left}px`); // top: 163px, left: 400px
    // console.log(this.#el.offsetWidth, this.#el.offsetHeight); // 240 600

    // canvas内のカーソルの地点 - 要素の左側までの距離 / 幅 = 0 から 1の値が取得できる
    const x = (eventX - this.#elRect.left) / this.#el.offsetWidth;
    const y = 1 - (eventY - this.#elRect.top) / this.#el.offsetHeight;
    // console.log(`x: ${x}px, y: ${y}px`)

    this.#mouse.x = gsap.utils.clamp(0, 1, x); // ブラウザの画面すべてで発火するので、0から1に値を収める
    this.#mouse.y = gsap.utils.clamp(0, 1, y);
    // console.log(`x: ${this.#mouse.x}, y: ${this.#mouse.y}px`)
  }

  // マウスエンター 
  handlePointerEnter = () => {
    if (!this.#canMove) return;

    this.tlHide?.kill();
    this.tlShow?.kill();
    // this.tlLeave?.kill()

    this.tlForceIntro = new gsap.timeline();
    this.tlForceIntro.to(this.#program.uniforms.uIntro, { value: 1, duration: 5, ease: 'expo.out' });
    gsap.to(this.#program.uniforms.uBulge, { value: 1, duration: 1, ease: 'expo.out' });
  }

  // マウススリーブ
  handlePointerLeave = () => {
    if (!this.#canMove) return;
    this.tlForceIntro?.kill();

    this.tlLeave = new gsap.timeline();
    this.tlLeave.to(this.#program.uniforms.uBulge, { value: 0, duration: 1, ease: 'expo.out' });
  }

  
}
