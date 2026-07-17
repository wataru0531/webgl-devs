const LERP = 0.1;
const GAP_PX = 48;

export class Carousel {
  constructor(rootEl) {
    this.slots = Array.from(rootEl.querySelectorAll('.slot'));
    this.scrollX = 0;
    this.targetScrollX = 0;
    this.cellW = 0;
    this.stepX = 0;
    this.periodX = 0;
    this.velocity = 0; // signed px/frame the carousel moved this tick
    this.onWheel = this.onWheel.bind(this);
  }

  prepare() {
    this.measure();
    void this.slots[0]?.offsetHeight;
    this.applyTransforms();
  }

  start() {
    this.prepare();
    window.addEventListener('wheel', this.onWheel, {
      capture: true,
      passive: false,
    });
  }

  stop() {
    window.removeEventListener('wheel', this.onWheel, { capture: true });
  }

  measure() {
    this.cellW = this.slots[0]?.offsetWidth ?? 0;
    this.stepX = this.cellW + GAP_PX;
    this.periodX = this.slots.length * this.stepX;
  }

  onWheel(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const delta =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.targetScrollX += delta;
  }

  applyTransforms() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const half = this.periodX / 2;
    const c = Math.floor(this.slots.length / 2);
    for (let i = 0; i < this.slots.length; i++) {
      let relX = (i - c) * this.stepX - this.scrollX;
      relX = ((relX % this.periodX) + this.periodX) % this.periodX;
      if (relX >= half) relX -= this.periodX;
      const cellH = this.slots[i].offsetHeight;
      const x = vw / 2 + relX - this.cellW / 2;
      const y = vh / 2 - cellH / 2;
      this.slots[i].style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  tick() {
    const prev = this.scrollX;
    this.scrollX += (this.targetScrollX - this.scrollX) * LERP;
    this.velocity = this.scrollX - prev;
    this.applyTransforms();
  }
}
