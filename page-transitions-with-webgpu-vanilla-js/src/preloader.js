
// preloader.js

import gsap from "gsap";

const COUNT_DURATION = 1.6;
const FADE_DURATION = 0.6;

export class Preloader {
  constructor() {
    this.el = document.getElementById("preloader");
    this.countEl = this.el?.querySelector(".preloader-count") ?? null;
  }

  async count() {
    if (!this.countEl) return;

    const counter = { value: 0 };

    await new Promise((onComplete) => {
      gsap.to(counter, {
        value: 100,
        duration: COUNT_DURATION,
        ease: "power1.inOut",

        onUpdate: () => {
          this.countEl.textContent = `${Math.round(counter.value)}%`
        },
        onComplete,
      })
    })
  }

  async reveal() {
    if (!this.el) return;

    await new Promise((onComplete) => {
      gsap.to(this.el, { // .preloaderを消す
        autoAlpha: 0,
        duration: FADE_DURATION,
        ease: "power2.inOut",
        onComplete,
      })
    })

    this.el.style.display = "none";
  }
}
