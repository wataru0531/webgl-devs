
// ✅ text-animation.ts

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

interface BaseAnimationProps {
  element: HTMLElement;
  inDuration: number;
  outDuration: number;
  inDelay: number;
}

interface SplitAnimationProps extends BaseAnimationProps {
  split: globalThis.SplitText;
  inStagger?: number;
  outStagger?: number;
}
// console.log(SplitText);

export default class TextAnimation {
  elements: HTMLElement[];
  splitAnimations: SplitAnimationProps[] = [];
  fadeAnimations: BaseAnimationProps[] = [];
  splitTweens: gsap.core.Tween[] = []; // テキスト分割に関するアニメーション
  fadeTweens: gsap.core.Tween[] = []; // デフォルトのfadeアニメーション

  constructor() {}

  // ✅ 初期化
  init() {
    this.splitAnimations = []; 
    this.fadeAnimations = [];

    // ✅ 一度unknown(型不明)にキャスト → そのunknownをHTMLElement[]として扱う
    //    querySelectorAll('div')の型は、NodeListOf<HTMLDivElement>。
    //    NodeListOf<HTMLDivElement>を直接、HTMLElement[]にキャストできないので、
    //    unknownを経由して無理やり変換。
    //    → 一度「型不明」にする → そこから好きな型に変換
    this.elements = document.querySelectorAll('[data-text-animation]') as unknown as HTMLElement[];

    this.elements.forEach((el) => {
      // console.log(el);
      const inDuration = parseFloat(el.getAttribute('data-text-animation-in-duration') || '0.6');
      const outDuration = parseFloat(el.getAttribute('data-text-animation-out-duration') || '0.3');
      const inDelay = parseFloat(el.getAttribute('data-text-animation-in-delay') || '0');

      // 👉 テキスト分割する場合はラインに分割
      if(el.hasAttribute('data-text-animation-split')) {
        // console.log("data-text-animation-split");

        const split = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
        });

        const inStagger = parseFloat(el.getAttribute('data-text-animation-in-stagger') || '0.06');
        // console.log(inStagger); // 全て0.06
        const outStagger = parseFloat(el.getAttribute('data-text-animation-out-stagger') || '0.06');

        split.lines.forEach((line) => {
          gsap.set(line, { yPercent: 100 });
        });

        gsap.set(el, { autoAlpha: 1 }); // opacity: 1; + visibility: hidden;

        this.splitAnimations.push({
          element: el, // [data-text-animation]をもつ
          split, // SplitText.create()で作ったインスタンス
          inDuration,
          outDuration,
          inStagger,
          outStagger,
          inDelay,
        });
        // console.log(this.splitAnimations.length);
      } else {
        // テキスト分割させない場合
        // console.log("テキスト分割させない場合");
        gsap.set(el, { autoAlpha: 0 }); // → 後から表示させる

        this.fadeAnimations.push({
          element: el,
          inDuration,
          outDuration,
          inDelay,
        });
      }
    });
  }

  // ✅ 分割したテキストをアニメーションさせる場合 → スクロールにより表示
  animateIn({ delay = 0 } = {}) {
    this.splitAnimations.forEach(({ element, split, inDuration, inStagger, inDelay }) => {
      // console.log(element); // [data-text-animation] を持つ要素
      const tweenWithScroll = gsap.to(split.lines, {
        yPercent: 0,
        stagger: inStagger,
        scrollTrigger: {
          trigger: element, // 👉 [data-text-animation]の要素
          start: 'top bottom',
          end: 'bottom top',
          toggleActions: 'play reset restart reset',
          // → enter leave enterback leaveback の時の挙動を1つづつ記述
          //   ... leaveback: 一度抜けて画面に入り、さらに上に抜けた時
          // play ... 入ると発火
          // reset ... 最初の状態に戻す
          // restart ... 最初から再生

          // scrub: true, // アニメーションとスクロールを同期
          // onUpdate: ({ progress }) => {
          //   console.log(progress);
          // }
        },
        ease: 'expo',
        duration: inDuration,
        delay: inDelay + delay,
      });

      this.splitTweens.push(tweenWithScroll);
    });

    // ✅ テキスト分割しなかった要素を対象にしたアニメーション
    this.fadeAnimations.forEach(({ element, inDuration, inDelay }) => {
      const fadeTween = gsap.to(element, {
        // onStart: () => console.log("onStart"),
        autoAlpha: 1, // opacity: 1; + visibility: hidden;
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          toggleActions: 'play reset restart reset',
        },
        ease: 'power2.out',
        duration: inDuration,
        delay: inDelay + delay,
      });

      this.fadeTweens.push(fadeTween);
    });
    
    return gsap.timeline();
  }

  // ✅ 画面からテキストを消すためのアニメーション → 画像クリック時に発火
  animateOut() {
    const tl = gsap.timeline();

    // ✅ 分割したテキスト
    this.splitAnimations.forEach(({ split, outDuration, outStagger }) => {
      tl.to(split.lines, {
        yPercent: 100,
        stagger: outStagger,
        ease: 'power2.out',
        duration: outDuration,
      }, 0);
    });

    // ✅ 分割しなかったテキスト
    this.fadeAnimations.forEach(({ element, outDuration }) => {
      tl.to(element, {
        autoAlpha: 0,
        ease: 'power2.out',
        duration: outDuration,
      }, 0);
    });

    return tl;
  }

  // ✅ テキストアニメーションの解除
  destroy() {
    this.splitTweens.forEach((tween) => {
      tween.scrollTrigger?.kill();
      // 👉 tweenに紐づいているScrollTriggerのイベント(スクロール監視)は残ったままになるので破棄する
      tween.kill();
    });

    this.fadeTweens.forEach((tween) => {
      tween.scrollTrigger?.kill();
      tween.kill();
    });

    this.splitAnimations.forEach(({ split }) => {
      split.revert(); // 👉 分割したテキストを元に戻し、DOMも元の状態に戻す
    });

    this.splitTweens = [];
    this.fadeTweens = [];
  }
}
