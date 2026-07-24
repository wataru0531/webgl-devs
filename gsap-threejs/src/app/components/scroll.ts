
// scroll.ts

import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"


export default class Scroll {
  scroll: number
  s: globalThis.ScrollSmoother | null

  constructor() {
    window.scrollTo(0, 0); // → 全ページのスクロール位置が残り、ブラウザのscrollがズレるのでリセット
    this.init();
  }

  // ✅ 初期化
  init() {
    this.scroll = 0;

    // ✅ ScrollSmoother
    this.s = ScrollSmoother.create({
      smooth: 1,
      normalizeScroll: true, // マウス、トラックパッド、タッチなど、デバイス差を吸収して、スクロール量を標準化
      wrapper: document.getElementById("app") as HTMLElement, // ラッパー。ここを基準に制御する
      content: document.getElementById("smooth-content") as HTMLElement, // コンテンツ部分で、スクロールさせる部分
      
      onUpdate: (self) => {
        // console.log(self.scrollTop()); // スクロール量を取得
        this.scroll = self.scrollTop() // 常に現在位置を取得する
        // console.log(this.scroll);
      },
    })

    ScrollTrigger.refresh(); // ScrollTriggerに「レイアウト再計算を通知。
                            // → triggerの位置、startの位置などを再度把握する
  }

  // スクロールをトップに戻す
  reset(immediate?: boolean) {
    // scrollTo(どこに, スムーズかどうか, "要素の位置 画面の位置"(ScrollTriggerと同じ))
    if(immediate) this.s?.scrollTo(0, false, "top top") // 即時に戻す
    else this.s?.scrollTop(0) // スムーズに戻る
  }

  // ScrollSmoother を完全削除
  destroy() {
    this.s?.kill()
    this.s = null
  }

  // 現在のスクロール位置を返す
  getScroll() {
    return this.scroll
  }
}
