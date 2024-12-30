

import '../../styles/index.scss'
import '../../styles/pages/index.scss'

import Lenis from 'lenis';

import GL from '../components/GL.js';



window.addEventListener('load', () => {
  new Index();
});

export default class Index {
  constructor() {
    this.lenis = new Lenis();

    // Lenisの更新と、ブラウザのアニメーションフレーム更新を同期させる
    const raf = (time) => {
      // ライブラリ内部でのアニメーションフレーム更新を行い、スムーズスクロールのフレームレートを管理
      this.lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf); // rafがループして実行され、Lenisのフレームレート更新が行われる

    this.gl = new GL();

    // Lenisでスクロールが発生するたびに、this.gl.onScrollを発火させ同期させる
    this.lenis.on('scroll', (e) => {
      this.gl.onScroll(e)
    });


    // IntersectionObserverの設定 → liにblurエフェクトを適用
    const items = [...document.querySelectorAll('#list-section li')];
    // console.log(items); // (15) [li, li, li, li, li, li, li, li, li, li, li, li, li, li, li]

    const options = {
      root: null, // ビューポートを基準
      rootMargin: "0px 0px -10% 0px",
      threshold: 0
    }

    const observer = new IntersectionObserver((entries, observer) => {
      // console.log(entries); // (15) [IntersectionObserverEntry, IntersectionObserverEntry, ...]
      
      entries.forEach(entry => {
        // console.log(entry); // IntersectionObserverEntry {time: 315.90000000596046, rootBounds: DOMRectReadOnly, boundingClientRect: DOMRectReadOnly, intersectionRect: DOMRectReadOnly, isIntersecting: false, …}
        
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // observer.unobserve(entry.target);
        } else {
          entry.target.classList.remove("is-visible")
        }
      });
    }, options);

    items.forEach(item => {
      observer.observe(item); // 監視対象を指定。entryに
    });
  }
}
