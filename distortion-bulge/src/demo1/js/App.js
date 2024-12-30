
//  App

import Card from '@/demo1/js/components/Card'
import Background from '@/demo1/js/components/Background'
import Lenis from '@studio-freight/lenis'
import { gsap } from 'gsap'
import { isTouch } from './utils/isTouch'
import GUI from 'lil-gui'

const ASSETS = ['image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpg', 'image-5.jpg', 'image-6.jpg']

export default class App {
  // #について
  // → ・スコープの制限
  //    #をつけたフィールドは、そのクラス内でのみアクセス可能
  //    クラスの外部からはアクセスできず、値を変更したり取得することができない
  //   ・データのカプセル化の意味がある
  //     データを隠蔽し、クラスの設計をより安全に保つことができます。
  //     例えば、不正な値の代入や直接的な操作を防ぐことができます。
  //   ・標準仕様 ... #はES2022(ES13)で正式に導入された構文

  #components
  #lenis
  #guiCard = { // Cardに渡すオブジェクト
    bulge: 0,
    strength: 1.1,
    radius: 0.95,
  }
  #debug

  constructor() {
    this.#components = this.createComponents(); // Card, Backgroundの初期化

    this.#lenis = this.createLenis();
    this.#debug = this.createDebugger()

    this.events();
  }

  // 
  createComponents() {
    const components = [];

    const cards = [...document.querySelectorAll('.card')];
    // console.log(cards); // (6) [div.card, div.card, div.card, div.card, div.card, div.card]

    // Cardの初期化
    cards.forEach((_el, _idx) => {
      const canvas = _el.querySelector('canvas');

      components.push(new Card({ 
        el: canvas, 
        src: ASSETS[_idx],  // 画像の配列
        index: _idx, 
        guiObj: this.#guiCard // { bulge: 0, strength: 1.1, radius: 0.95 }
      }));
    })

    // backgroundの初期化(1箇所のみ)
    const background = document.querySelector('.background__canvas');
    components.push(new Background({ el: background }));

    // console.log(components); // (7) [Card, Card, Card, Card, Card, Card, Background]
    return components
  }

  // Lenis初期化
  createLenis() {
    const lenis = new Lenis({ infinite: false, lerp: 0.08 })
    this.scrollEl = document.querySelector('.scroll'); // ↓scrollの目印

    lenis.on('scroll', this.handleScroll);

    return lenis;
  }

  events() {
    // Lenisと同期
    // GSAPのticker → アニメーションのフレームごとの更新処理を管理
    //                GSAP全体のアニメーションを動かす「フレームレート制御機構」のこと。
    //                → 更新処理として呼び出したい関数を登録
    //                  登録された関数は、毎フレーム(通常60FPSなら1秒間に60回)発火する
    gsap.ticker.add((_time) => {
      // console.log(_time) // 現在のアニメーションの経過時間, 秒単位
      this.handleRAF(_time)
    });

    window.addEventListener('resize', this.handleResize, false);

    // console.log(isTouch()); 
    if (isTouch()) { // タッチデバイスならtrueを返す
      window.addEventListener('touchmove', this.handleMouseMove, false)
    } else {
      window.addEventListener('pointermove', this.handleMouseMove, false)
    }
  }

  // gsap.のtikerと同期、WebGLのレンダリング
  // → ここではlenisと同期させる
  handleRAF = (_time) => {
    // console.log(_time)
    // console.log(_time * 1000);
    // _time → GSAPのtickerから渡される「現在のアニメーションの経過時間」で、秒単位
    //         _time * 1000 によって秒単位からミリ秒単位に変換して、Lenis に渡します
    this.#lenis.raf(_time * 1000);

    // 各WebGLのレンダリング
    for (let i = 0; i < this.#components.length; i++) {
      const comp = this.#components[i]

      if (typeof comp.render === 'function') {
        // console.log(_time);
        comp.render(_time); 
      }
    }
  }

  // 各WebGLのリサイズ
  handleResize = () => {
    for (let i = 0; i < this.#components.length; i++) {
      const comp = this.#components[i]

      if (typeof comp.resize === 'function') {
        comp.resize();
      }
    }
  }

  // Cardのみ発火
  handleMouseMove = (_e) => {
    for (let i = 0; i < this.#components.length; i++) {
      const comp = this.#components[0]

      if (typeof comp.pointerMove === 'function') {
        comp.pointerMove(_e);
      }
    }
  }

  // Lenisのスクロール処理時のコールバック
  handleScroll = (e) => {
    this.scrollEl.classList.remove('is-visible'); // ↓scrollの目印

    for (let i = 0; i < this.#components.length; i++) {
      const comp = this.#components[i]

      // Backgroundのみ発火
      if (typeof comp.scroll === 'function') {
        // console.log(e.progress); // 0 〜 1。body全体で1
        comp.scroll(e.progress);
      }
    }
  }

  createDebugger() {
    const gui = new GUI();
    // console.log(gui); // _GUI {parent: undefined, root: _GUI, children: Array(0), controllers: Array(0), folders: Array(0), …}

    const handleChange = () => {
      for (let i = 0; i < this.#components.length; i++) {
        const comp = this.#components[i]

        // Cardのみ
        if (comp.type === 'card') {
          // this.#guiCard = { bulge: 0, strength: 1.1, radius: 0.95 }
          comp.program.uniforms.uRadius.value = this.#guiCard.radius
          comp.program.uniforms.uStrength.value = this.#guiCard.strength
        }
      }
    }

    gui.add(this.#guiCard, 'radius', 0, 1).onChange(handleChange)
    gui.add(this.#guiCard, 'strength', 0, 3).onChange(handleChange)

    return gui
  }
}
