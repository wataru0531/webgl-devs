
// 3Dシーンの初期化。WebGLのレンダリング環境をセットアップなど

// ogl
// → 軽量でパフォーマンス重視のWebGLライブラリで、シンプルなシェーダーや3Dオブジェクトの作成、
// レンダリング操作を簡単に扱うために開発された。
// 基本的な3Dシーン構築に必要なクラスや機能(Renderer、Camera、Transform、Plane など)が含まれており、
// 一般的な3Dライブラリよりもコード量を少なくできるのが特徴

import { Renderer, Camera, Transform, Plane } from 'ogl'
import Media from './Media.js';

export default class GL {
  constructor () {
    this.images = [...document.querySelectorAll('.media')];
    
    this.createRenderer(); // renderer、this.gl(コンテキストの取得)
    this.createCamera();
    this.createScene();

    this.onResize(); // 

    this.createGeometry();
    this.createMedias();

    this.update();

    this.addEventListeners();
  }

  createRenderer () {
    this.renderer = new Renderer({
      canvas: document.querySelector('#gl'),
      alpha: true
    });
    // console.log(this.renderer); // Renderer {dpr: 1, alpha: true, color: true, depth: true, stencil: false, …}
    // console.log(this.renderer.gl); // WebGL2RenderingContext {renderer: Renderer, canvas: canvas#gl, drawingBufferWidth: 300, drawingBufferHeight: 150, drawingBufferColorSpace: 'srgb', …}
    // → Three.jsでいう、WebGLRenderer.context のこと

    // WebGLのコンテキストを取得
    // → WebGL APIを使って3D描画を行うために必要な「設定・状態管理の枠組み」。
    //   このコンテキストが作られることで、ブラウザ内でWebGL描画ができるようになり、
    //   その描画の管理や設定を行うための「操作の基盤」が整う
    // OGLではThree.jsとは違い、コンテキストに
    this.gl = this.renderer.gl;
    console.log(this.gl); // WebGL2RenderingContext {renderer: Renderer, canvas: canvas#gl, drawingBufferWidth: 300, drawingBufferHeight: 150, drawingBufferColorSpace: 'srgb', …}
  }

  createCamera () {
    this.camera = new Camera(this.gl)
    this.camera.fov = 45
    this.camera.position.z = 20
  }

  createScene () {
    this.scene = new Transform()
  }

  onResize () {
    // console.log("onResize")
    this.screen = { width: window.innerWidth, height: window.innerHeight }

    // setSize ... canvasのサイズを決定している。
    this.renderer.setSize(this.screen.width, this.screen.height)

    this.camera.perspective({ aspect: this.gl.canvas.width / this.gl.canvas.height })

    // cameraのfov、cameraの位置から、cameraの描画領域のwidth, heightを算出
    // → HTMLのpxサイズとWebGLのpxサイズが一致する
    const fov = this.camera.fov * (Math.PI / 180); // 弧度法に
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z; // 高さを取得
    const width = height * this.camera.aspect

    // カメラから見える範囲（視野の幅と高さ）
    // → 3D空間内での「相対的なスケール」であり、画面幅や解像度に関係なく、カメラの視野内でのサイズを示す
    //   値が小さくても気にしなくていい。
    this.viewport = { width, height } 
    // console.log(this.viewport); // { width: 14.977213554733378, height: 16.5685424949238 }

    // this.mediasが生成されていないため初回は発火しない。リサイズ時に発火
    // console.log(this.medias)
    if (this.medias) {
      // console.log("forEach running!!");
      // ここでmediaの位置を決定させる。
      this.medias.forEach(media => media.onResize({
        screen: this.screen,
        viewport: this.viewport
      }));

      this.onScroll({ scroll: window.scrollY })
    }
  }

  createGeometry () {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
    // console.log(this.planeGeometry)
  }

  createMedias () {
    this.medias = this.images.map(item => {
      // console.log(item); // <figure class="media"></figure>

      // Media初期化
      // this.gl → テクスチャやmeshを生成する際にコンテキストを渡す必要がある。
      return new Media({
        gl: this.gl, // WebGL2RenderingContext {renderer: Renderer, ... }
        geometry: this.planeGeometry,
        scene: this.scene,
        renderer: this.renderer,
        screen: this.screen, // { width: window.innerWidth, height: window.innerHeight }
        viewport: this.viewport, // cameraから見た幅と高さ
        $el: item,
        img: item.querySelector('img')
      })
    })
  }

  // 引数t(0〜1の範囲のパラメータ)に応じて、進行度に非線形な変化を加え、
  // アニメーションの進行が「ゆっくり開始し、加速し、またゆっくりと終了する」ように制御する
  easeInOut(t) {
    return t < 0.5 ? 2 * t * t  // .5以下
                   : -1 + (4 - 2 * t) * t // .5以上
  }

  onScroll({ scroll }) { // index.jsで発火。window.scrollYのスクロール量
    // console.log(scroll);
    if (this.medias) {
      this.medias.forEach(media => media.onScroll(scroll)); // テクスチャの位置調整
      this.checkHeroProgress(scroll); // heroのアニメーション
    }
  }

  // heroのアニメーション
  checkHeroProgress(_scroll) { // window.scrollYのスクロール量
    // this.screen.height → window.innerHeight
    // console.log(_scroll / (this.screen.height));
    // console.log(_scroll / (this.screen.height) * .57);
    // ※ 0 〜 1に限定して、easeInOutの挙動にする
    const p = this.easeInOut(Math.min(_scroll / (this.screen.height * 0.57), 1));
    // console.log(p);

    // console.log(this.medias[0]); // Media {gl: WebGL2RenderingContext, geometry: _Plane, scene: Transform, renderer: Renderer, screen: {…}, …}
    let height = this.medias[0].$el.offsetHeight;
    // console.log(height); // 626
    
    const scale = 1 + (0.075 * p); 

    this.medias[0].setScale(null, height * scale);

    // スクロールするたびにblurStrengthは減っていく
    // console.log(1 - p); // 減少
    // console.log(- .8 * (1 - p)); // 減少　8, 4, 
    // console.log(this.medias[0].blurStrength); // 徐々に増える。反転する
    this.medias[0].blurStrength = 1 - 0.8 * (1 - p);
  }
  
  update() {
    if (this.medias) { this.medias.forEach(media => media.update()); }

    this.renderer.render({ scene: this.scene, camera: this.camera});

    // console.log(this); // GL {images: Array(10), renderer: Renderer, gl: WebGL2RenderingContext, camera: Camera, scene: Transform, …}
    requestAnimationFrame(this.update.bind(this));
  }

  addEventListeners () {
    // console.log("resize")
    window.addEventListener('resize', this.onResize.bind(this))
  }
}