
// cursor.js

const LERP = 0.2;
const HOVER_SELECTOR = '.page-main .slot';

export class Cursor {
  constructor() {
    this.el = document.getElementById('cursor');
    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;
    this.rafId = null;
    this.hovering = false;
    this.onMove = this.onMove.bind(this);
    this.tick = this.tick.bind(this);
  }

  start() {
    if(!this.el) return;

    window.addEventListener('pointermove', this.onMove);
    this.rafId = requestAnimationFrame(this.tick); // 次のフレームから実行させる
  }

  onMove(e) {
    this.tx = e.clientX;
    this.ty = e.clientY;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    // console.log(el); // カーソルがのっている要素を取得
    const isHot = !!el?.closest?.(HOVER_SELECTOR);
    console.log(isHot);

    if (isHot !== this.hovering) {
      this.hovering = isHot;
      this.el.classList.toggle('is-hover', isHot);
    }
  }

  tick() {
    this.x += (this.tx - this.x) * LERP;
    this.y += (this.ty - this.y) * LERP;
    this.el.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%)`;
    this.rafId = requestAnimationFrame(this.tick);
  }
}
