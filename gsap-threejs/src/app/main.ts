
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
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    this.scroll = new Scroll(); // ScrollSmoother初期化、スクロール量を取得
    this.canvas = new Canvas(); // Canvas、テクスチャ関係
    this.textAnimation = new TextAnimation();
    this.loadFont(() => { // フォント反映、レイアウト確定、ScrollTrigger確定などを持って発火
      this.textAnimation.init();
    });

    this.template = this.getCurrentTemplate(); // home detail

    // ✅ 
    this.loadImages(() => {
      this.canvas.createMedias(); // テクスチャ生成、ScrollTriggerで監視

      if(this.fontLoaded) {
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
    barba.init({
      prefetchIgnore: true,
      transitions: [
        {
          name: 'default-transition', // 通常のページ遷移 ... 特別な条件がない通常の遷移
          before: () => {
            this.scrollBlocked = true; // スクロールを止める
            this.scroll.s?.paused(true); // ScrollSmoother 停止
          },
          leave: () => { // 👉 戻る時に発火
            const medias = this.canvas.medias && this.canvas.medias; // ⭐️ 文法
            // console.log(medias)

            medias?.forEach((media) => {
              if (!media) return;
              media.onResize(this.canvas.sizes); // リサイズ処理

              gsap.set(media.element, { // 
                visibility: 'hidden',
                opacity: 0,
              });
            });

            return new Promise<void>((resolve) => {
              // 画面からテキストを消すtl
              const tl = this.textAnimation.animateOut();

              // 👉 テクスチャのuniform.uProgress 更新
              this.canvas.medias?.forEach((media) => {
                if (!media) return;
                tl.fromTo(media.material.uniforms.uProgress,
                  { value: 1 },
                  {
                    duration: 1,
                    ease: 'linear',
                    value: 0,
                  }, 0);
              });

              tl.call(() => {
                this.textAnimation.destroy();
                resolve();
              });
            });
          },
          // ✅ 
          beforeEnter: () => {
            this.canvas.medias?.forEach((media) => {
              media?.destroy();
              media = null;
            });

            this.scrollBlocked = false;

            this.scroll.reset();
            this.scroll.destroy();
          },
          // ✅ 新しいページのDOMに合わせて再構築
          after: () => {
            this.scroll.init();
            this.textAnimation.init();

            const template = this.getCurrentTemplate();
            this.setTemplate(template);

            this.loadImages(() => {
              this.canvas.medias = [];
              this.canvas.createMedias();
              this.textAnimation.animateIn({ delay: 0.3 });
            });
          },
        },

        // ⭐️ Barbaの挙動
        // クリック
        //   ↓
        // before        ← 遷移開始直前（まだ旧ページ）
        //   ↓
        // leave         ← 旧ページをアニメーションで消す
        //   ↓
        // Barbaが新HTMLを取得・差し替え
        //   ↓
        // beforeEnter   ← 新ページがDOMに入った直後
        //   ↓
        // after         ← 遷移完了（新ページ確定）
        {
          name: 'home-detail', // ⭐️ homeページ - detailページ に遷移する時の挙動
          from: {
            custom: () => {
              const activeLink = document.querySelector('a[data-home-link-active="true"]');
              // console.log(activeLink); // クリックしたaタグ
              if (!activeLink) return false;

              return true;
            },
          },
          // ✅ 遷移開始前
          before: () => {
            this.scrollBlocked = true;
            this.scroll.s?.paused(true);

            const tl = this.textAnimation.animateOut();

            activeLinkImage = document.querySelector('a[data-home-link-active="true"] img') as HTMLImageElement;

            this.canvas.medias?.forEach((media) => {
              if(!media) return;
              media.scrollTrigger.kill();

              const currentProgress = media.material.uniforms.uProgress.value;
              const totalDuration = 1.2;

              if(media.element !== activeLinkImage) {
                const remainingDuration = totalDuration * currentProgress;

                tl.to(media.material.uniforms.uProgress, {
                  duration: remainingDuration,
                  value: 0,
                  ease: 'linear',
                }, 0);
              } else {
                const remainingDuration = totalDuration * (1 - currentProgress);

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

            return new Promise<void>((resolve) => {
              tl.call(() => {
                resolve();
              });
            });
          },
          leave: () => { // ✅ 旧ページをアニメーションで消す
            scrollTop = this.scroll.getScroll();

            const container = document.querySelector('.container') as HTMLElement;
            container.style.position = 'fixed';
            container.style.top = `-${scrollTop}px`;
            container.style.width = '100%';
            container.style.zIndex = '1000';

            this.mediaHomeState = Flip.getState(activeLinkImage);
            this.textAnimation.destroy();
          },
          // ⭐️ ここで、Barbaが新しいHTMLに差し替える
          beforeEnter: () => { // ✅ 新ページがDOMに入った直後
            this.scroll.reset();
            this.scroll.destroy();
          },
          after: () => { // ✅ 遷移完了(新ページ確定)
            this.scroll.init();
            this.textAnimation.init();

            const detailContainer = document.querySelector('.details-container') as HTMLElement;

            detailContainer.innerHTML = '';
            detailContainer.append(activeLinkImage);

            const template = this.getCurrentTemplate();
            this.setTemplate(template);

            return new Promise<void>((resolve) => {
              let activeMedia: Media | null = null;

              this.textAnimation.animateIn({ delay: 0.3 });

              Flip.from(this.mediaHomeState, {
                absolute: true,

                duration: 1,
                ease: 'power3.inOut',

                onComplete: () => {
                  this.scrollBlocked = false;
                  this.canvas.medias?.forEach((media) => {
                    if (!media) return;
                    if (media.element !== activeLinkImage) {
                      media.destroy();
                      media = null;
                    } else {
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

    satoshi.load().then(() => {
      onLoaded(); // this.textAnimation.init()のコールバック
      this.fontLoaded = true;
      window.dispatchEvent(new Event('fontLoaded'));
      // → windowに対して「fontLoaded」というイベントを作り、発生させる。
      // new Event() ... カスタムイベント(自分で作ったオリジナルのイベント)
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
