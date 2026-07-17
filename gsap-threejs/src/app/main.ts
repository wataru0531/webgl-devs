
// @ts-ignore → TypeScript に「次の行のエラーを無視してね」と指示するコメント
// 本来 TypeScript は 型情報がないモジュールを import するとエラー を出す場合がある
// @ts-ignore を書くと、その行の型チェックをスキップしてコンパイルを通すことができる。

import Canvas from './components/canvas';
import Scroll from './components/scroll';
//@ts-ignore
import barba from '@barba/core';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
//@ts-ignore
import { Flip } from 'gsap/Flip';
import gsap from 'gsap';
import Media from './components/media';
import { SplitText } from 'gsap/SplitText';
import TextAnimation from './components/text-animation';
import FontFaceObserver from 'fontfaceobserver';
// → Webフォントが読み込まれたかどうかを検知するためのライブラリ
// → フォントが読み込まれていない状態で SplitText を実行すると、
//   行分割の計算がズレる可能性があるので使う。

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Flip, SplitText);


class App {
  canvas: Canvas;
  scroll: Scroll;
  template: 'home' | 'detail';

  mediaHomeState: Flip.FlipState;
  scrollBlocked: boolean = false; // スクロールするか、停止させるか
  scrollTop: number;
  textAnimation: TextAnimation;
  fontLoaded: boolean = false;

  constructor() {
    if(typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    this.scroll = new Scroll(); // ScrollSmoother初期化、スクロール量を取得
    this.canvas = new Canvas(); // Canvas、テクスチャ関係
    this.textAnimation = new TextAnimation();
    this.loadFont(() => { // フォント反映、レイアウト確定、ScrollTrigger確定などを持って発火
      this.textAnimation.init();
    });

    this.template = this.getCurrentTemplate(); // home detail

    // ✅ Media初期化、テクスチャ生成、
    this.loadImages(() => {
      this.canvas.createMedias(); // テクスチャ生成、ScrollTriggerで監視

      if(this.fontLoaded) { // → フォントが読み込まれている場合
        this.textAnimation.init();
        this.textAnimation.animateIn();
      } else {
        // 👉 フォント読み込み後に、new Eventでwindowに登録したイベントが発火
        //    → dispatchEventで通知を受けた時に発火
        // ✅ delayedCall → 指定した秒数後にコールバックを発火
        // → ここではフォント反映、レイアウト確定、ScrollTrigger確定などを持っている。
        window.addEventListener('fontLoaded', () => {
          gsap.delayedCall(0, () => {
            gsap.delayedCall(0, () => {
              this.textAnimation.init();
              this.textAnimation.animateIn({ delay: 0.3 });
            });
          });
        });
      }
    });

    let activeLinkImage: HTMLImageElement;
    let scrollTop: number;

    // ✅ Barba
    // → ページをリロードせずに、HTMLだけ差し替えてアニメーション付きで遷移させるライブラリ
    // ⭐️ Barbaの挙動
    // クリック
    //   ↓
    // before        ← ページ遷移開始直前のタイミング(まだ旧ページ）
    //   ↓
    // leave         ← 旧ページをアニメーションで消すタイミング
    //   ↓
    // BarbaがDOM取得・差し替え
    //   ↓
    // beforeEnter   ← 新ページがDOMに挿入された直後のタイミング
    //   ↓
    // after         ← ページ遷移が確定してユーザーが操作可能になったタイミング(新ページ確定)
    barba.init({
      prefetchIgnore: true, // リンクにマウスを乗せた時などに、遷移先ページのHTMLを事前取得しておく機能を無効化
      transitions: [
        {
          name: 'default-transition', // 通常のページ遷移 ... 戻る時。特別な条件がない通常の遷移
          before: () => { // ✅ ページ遷移開始直前
            // console.log("before")
            this.scrollBlocked = true; // スクロールを止める
            this.scroll.s?.paused(true); // ScrollSmoother 停止
          },
          leave: () => { // ✅ 旧ページをアニメーションで消すタイミング
            const medias = this.canvas.medias;
            // console.log(medias); // [Media]

            medias?.forEach((media) => {
              if(!media) return;
              media.onResize(this.canvas.sizes); // リサイズ処理。キャンバスのサイズ、画像の位置などを更新

              gsap.set(media.element, { // 
                visibility: 'hidden',
                opacity: 0,
              });
            });

            return new Promise<void>((resolve) => {
              // 画面からテキストを消すtl
              const tl = this.textAnimation.animateOut();

              // ⭐️ テクスチャのuniform.uProgress 1 → 0
              this.canvas.medias?.forEach((media) => {
                if(!media) return;
                tl.fromTo(media.material.uniforms.uProgress,
                  { value: 1 },
                  {
                    value: 0,
                    duration: 1,
                    ease: 'linear',
                  }, 0);
              });

              tl.call(() => { // tweenやScrollTriggerを解除
                this.textAnimation.destroy();
                resolve();
              });
            });
          },
          // ✅ 新ページがDOMに挿入された直後のタイミング
          //   → = まだ新ページの初期化はしていない段階
          //   → ここでは、旧ページの状態を完全に破棄する
          beforeEnter: () => {
            this.canvas.medias?.forEach((media) => {
              media?.destroy(); // sceneなどの削除、ScrollTriggerやイベントの解除
              media = null;
            });

            this.scrollBlocked = false; // スクロール開始

            this.scroll.reset(); // scrollToでトップに
            this.scroll.destroy(); // ScrollSmootherを完全削除
          },
          // ✅ 新しいページのDOMに合わせて再構築
          after: () => {
            this.scroll.init();
            this.textAnimation.init();

            const template = this.getCurrentTemplate();
            this.setTemplate(template);

            this.loadImages(() => {  // 画像のロードが完了したら発火
              this.canvas.medias = []; // Media を格納する配列
              this.canvas.createMedias(); // Media初期化、テクスチャ生成
              this.textAnimation.animateIn({ delay: 0.3 });
            });
          },
        },

        // ⭐️ homeページ - detailページ に遷移する時の挙動
        // ⭐️ Barbaの挙動
        // クリック
        //   ↓
        // from          ← 遷移を開始する前のタイミング。beforeよりも前
        //                 どんな状態のページから遷移する時に、この transition を使うか？
        //                 を定義するための設定
        //   ↓
        // before        ← ページ遷移開始直前のタイミング(まだ旧ページ）
        //   ↓
        // leave         ← 旧ページをアニメーションで消すタイミング
        //   ↓
        // BarbaがDOMを取得・差し替え
        //   ↓
        // beforeEnter   ← 新ページがDOMに挿入された直後のタイミング
        //   ↓
        // after         ← ページ遷移が確定してユーザーが操作可能になったタイミング(新ページ確定)
        {
          name: 'home-detail', 
          from: {
            // ✅ custom → 自分で条件を自由に書ける関数
            //             true → このtransitionを使う
            //             false → このtransitionは使わない 
            custom: () => { 
              const activeLink = document.querySelector('a[data-home-link-active="true"]');
              // console.log(activeLink); // クリックしたaタグ → クリックしたら付与される
              if(!activeLink) return false;

              return true;
            },
          },
          before: () => { // ✅ 遷移開始前
            this.scrollBlocked = true; // スクロール停止
            this.scroll.s?.paused(true); // ScrollSmoother停止

            const tl = this.textAnimation.animateOut(); // 👉 テキストを消す。これにアニメーションを連結させていく

            activeLinkImage = document.querySelector('a[data-home-link-active="true"] img') as HTMLImageElement;

            this.canvas.medias?.forEach((media) => {
              if(!media) return;
              media.scrollTrigger.kill(); // ScrollTriggerの監視を停止

              const currentProgress = media.material.uniforms.uProgress.value;
              // console.log(currentProgress);
              const totalDuration = 1.2;

              // console.log(media.element, activeLinkImage);
              if(media.element !== activeLinkImage) { // 👉 クリックした画像以外の画像
                // console.log("!==")
                const remainingDuration = totalDuration * currentProgress; // 0 〜 1.2

                tl.to(media.material.uniforms.uProgress, {
                  duration: remainingDuration,
                  value: 0,
                  ease: 'linear',
                }, 0);
              } else { // クリックした画像
                // console.log("===")
                const remainingDuration = totalDuration * (1 - currentProgress); // 1.2 → 0

                tl.to(media.material.uniforms.uProgress, {
                  value: 1,
                  duration: remainingDuration,
                  ease: 'linear',
                  onComplete: () => {
                    media.element.style.opacity = '1';
                    media.element.style.visibility = 'visible';
                    gsap.set(media.material.uniforms.uProgress, { value: 0 });
                  },
                }, 0);
              }
            });

            // ✅ Promiseを返せば、内部でBarbaが待ってくれる仕組み
            return new Promise<void>((resolve) => {
              tl.call(() => {
                resolve();
              });
            });
          },
          leave: () => { // ✅ 旧ページをアニメーションで消す
            // ↓ 旧ページの要素を固定していく
            scrollTop = this.scroll.getScroll(); // 現在のスクロール量を取得

            const container = document.querySelector('.container') as HTMLElement;
            // console.log(container)
            container.style.position = 'fixed';
            container.style.top = `-${scrollTop}px`;
            container.style.width = '100%';
            container.style.zIndex = '1000';

            // 👉 クリックした画像の位置などの状態を保存
            // ✅ FLIP
            // First → 旧ページでの位置を保存
            // Last → 新ページでの位置（append後）
            // Invert → 差分を計算
            // Play → アニメーション
            this.mediaHomeState = Flip.getState(activeLinkImage);
            this.textAnimation.destroy(); // tweenやScrollTriggerを解除
          },

          // ⭐️ ここで、Barbaが自動で新しいページのHTMLを読み込む。
          //    .containerを差し替える

          beforeEnter: () => { // ✅ 新ページがDOMに入った直後
            this.scroll.reset(); // トップに移動させる。scrollTop(0)
            this.scroll.destroy(); // ScrollSmoother を解除
          },
          after: () => { // ✅ 遷移完了(新ページ確定)
            this.scroll.init();
            this.textAnimation.init();

            const detailContainer = document.querySelector('.details-container') as HTMLElement;

            detailContainer.innerHTML = '';
            // ⭐️ detailページに移動させる
            detailContainer.append(activeLinkImage);

            const template = this.getCurrentTemplate();
            this.setTemplate(template);

            return new Promise<void>((resolve) => {
              let activeMedia: Media | null = null;

              this.textAnimation.animateIn({ delay: 0.3 });

              // ⭐️ さっき保存した位置(First)から、今の位置(Last)へアニメーションしてくれと命令
              Flip.from(this.mediaHomeState, {
                absolute: true,
                duration: 1,
                ease: 'power3.inOut',
                onComplete: () => {
                  this.scrollBlocked = false;
                  this.canvas.medias?.forEach((media) => {
                    if(!media) return;

                    if(media.element !== activeLinkImage) {
                      // クリックした画像以外
                      media.destroy();
                      media = null;
                    } else {
                      // クリックした画像をactiveに
                      activeMedia = media;
                    }
                  });

                  this.canvas.medias = [activeMedia];

                  resolve();
                },
              });
            });
          },
        },
      ],
    });

    // console.log(this); // App {canvas: Canvas, scroll: Scroll, template: 'home', ... }
    this.render = this.render.bind(this);
    gsap.ticker.add(this.render);
  }

  // ✅ 現在のページの種別を取得
  getCurrentTemplate() {
    return document.querySelector('[data-page-template]')?.getAttribute('data-page-template') as 'home' | 'detail';
  }

  setTemplate(template: string) {
    this.template = template as 'home' | 'detail';
  }

  // ✅ 画像を読み込み後に発火させる
  loadImages(callback?: () => void) {
    const medias = document.querySelectorAll('img');
    let loadedImages = 0;
    const totalImages = medias.length;

    medias.forEach((img) => {
      if(img.complete) { // 画像が読み込まれているかどうか。ブラウザ標準
        // console.log("img.complete!!")
        loadedImages++;
      } else {
        // console.log("読み込まれていません"); // 発火せず
        // completeがtrueの画像に対しては、loadが発火しない。
        // なのでloadさせる。
        img.addEventListener('load', () => {
          loadedImages++;
          if (loadedImages === totalImages) {
            this.onReady(callback);
          }
        });
      }
    });

    if(loadedImages === totalImages) {
      this.onReady(callback); // 
    }
  }

  // ✅ 
  onReady(callback?: () => void) {
    if(callback) callback();
    ScrollTrigger.refresh(); // スクロールや要素の位置を再計算
  }

  // ✅ フォントの読み込み後に発火
  // → webフォントの読み込み前にGSAPのテキスト分割をするとずれてしまう可能性があるため
  loadFont(onLoaded: () => void) {
    const satoshi = new FontFaceObserver('Satoshi');

    // フォントの読み込みを待つ。CSSでの読み込みも監視している。
    satoshi.load().then(() => {
      onLoaded(); // this.textAnimation.init()。コールバック
      this.fontLoaded = true;
      window.dispatchEvent(new Event('fontLoaded'));
      // → windowに対して「fontLoaded」というカスタムイベントを作る
      // new Event() ... カスタムイベント(自分で作ったオリジナルのイベント)
      // dispatchEvent() → 実行させる
    });
  }

  // ✅ スクロール量を取得、meshのy軸の動きを制御
  render() {
    // scrollTop =「スクロールによって、トップがどれだけ上に押し上げられたか」という意味
    // console.log(this.scroll.getScroll());
    this.scrollTop = this.scroll?.getScroll() || 0; // 👉 スクロール量を取得
    this.canvas.render(this.scrollTop, !this.scrollBlocked);
  }
}


export default new App();
