import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { home } from "./pages/home.js";
import { inner } from "./pages/inner.js";
import { index as indexPage, IndexFloat } from "./pages/index-page.js";
import { Carousel } from "./carousel.js";
import { MAIN_COUNT, SATELLITES_PER_IMAGE, mainIdx, satIdx } from "./gpu.js";

import { IndexToInnerTransition } from "./transitions/indexToInner.js";
import { IndexToMainTransition } from "./transitions/indexToMain.js";
import { InnerToMainTransition } from "./transitions/innerToMain.js";
import { InnerToIndexTransition } from "./transitions/innerToIndex.js";
import { MainToIndexTransition } from "./transitions/mainToIndex.js";
import { MainToInnerTransition } from "./transitions/mainToInner.js";

gsap.registerPlugin(SplitText);

// Carousel scroll tilt: the harder you scroll the "Selected" page, the more the
// planes rotate about their Y axis (perspective lean). Tilt is derived from the
// carousel's per-frame velocity (px), clamped, and eased toward so it springs
// back to flat when scrolling stops.
const TILT_RAD_PER_PX = 0.005;
const TILT_MAX_RAD = 0.05; // ~11 degrees
const TILT_LERP = 0.09;

// Inner-page scroll tilt: scrolling the detail stack tilts its planes about the
// X axis (a forward/back lean), driven by Lenis's per-frame velocity, clamped,
// and eased so it springs back to flat when scrolling stops.
const INNER_TILT_RAD_PER_PX = 0.003;
const INNER_TILT_MAX_RAD = 0.05; // ~7 degrees
const INNER_TILT_LERP = 0.09;

const TITLE_IN_DURATION = 0.7;
const TITLE_IN_STAGGER = 0.04;
const TITLE_OUT_DURATION = 0.45;
const TITLE_OUT_STAGGER = 0.025;

function animateTitleIn(sec) {
  if (!sec) return null;
  const h1 = sec.querySelector(".page-title");
  if (!h1) return null;
  const split = SplitText.create(h1, { type: "words", mask: "words" });
  sec._titleSplit = split;
  return gsap.from(split.words, {
    yPercent: 102,
    duration: TITLE_IN_DURATION,
    stagger: TITLE_IN_STAGGER,
    ease: "power3.out",
  });
}

function animateTitleOut(sec) {
  if (!sec) return null;
  const split = sec._titleSplit;
  if (!split) return null;
  return gsap.to(split.words, {
    yPercent: -102,
    duration: TITLE_OUT_DURATION,
    stagger: TITLE_OUT_STAGGER,
    ease: "power3.out",
  });
}

const FACT_IN_DURATION = 0.8;
const FACT_IN_STAGGER = 0.08;
const FACT_OUT_DURATION = 0.5;
const FACT_OUT_STAGGER = 0.05;

function animateFactIn(sec) {
  if (!sec) return null;
  const p = sec.querySelector(".inner-fact");
  if (!p) return null;
  const split = SplitText.create(p, { type: "lines", mask: "lines" });
  sec._factSplit = split;
  return gsap.from(split.lines, {
    yPercent: 102,
    duration: FACT_IN_DURATION,
    stagger: FACT_IN_STAGGER,
    ease: "power3.out",
    delay: 0.1,
  });
}

function animateFactOut(sec) {
  if (!sec) return null;
  const split = sec._factSplit;
  if (!split) return null;
  return gsap.to(split.lines, {
    yPercent: -102,
    duration: FACT_OUT_DURATION,
    stagger: FACT_OUT_STAGGER,
    ease: "power3.out",
  });
}

const CAPTION_IN_DURATION = 0.7;
const CAPTION_IN_STAGGER = 0.06;
const CAPTION_OUT_DURATION = 0.45;
const CAPTION_OUT_STAGGER = 0.04;

function animateCaptionsIn(sec) {
  if (!sec) return null;
  const captions = sec.querySelectorAll(".slot-caption");
  if (!captions.length) return null;
  const allLines = [];
  const splits = [];
  for (const cap of captions) {
    const split = SplitText.create(cap, { type: "lines", mask: "lines" });
    splits.push(split);
    allLines.push(...split.lines);
  }
  sec._captionSplits = splits;
  return gsap.from(allLines, {
    yPercent: 102,
    duration: CAPTION_IN_DURATION,
    stagger: CAPTION_IN_STAGGER,
    ease: "power3.out",
    delay: 0.15,
  });
}

function animateCaptionsOut(sec) {
  if (!sec) return null;
  const splits = sec._captionSplits;
  if (!splits || !splits.length) return null;
  const allLines = [];
  for (const split of splits) allLines.push(...split.lines);
  return gsap.to(allLines, {
    yPercent: -102,
    duration: CAPTION_OUT_DURATION,
    stagger: CAPTION_OUT_STAGGER,
    ease: "power3.out",
  });
}

// ---------------------------------------------------------------------------
// Intro: played once on the first page load (never on SPA transitions). The
// active planes fade up while the persistent chrome — the left nav and the
// footer links — rises in with the same masked split-text reveal the page
// title (top-right indicator) uses.
// ---------------------------------------------------------------------------

const INTRO_TEXT_DURATION = 0.7;
const INTRO_TEXT_STAGGER = 0.06;
const INTRO_NAV_DELAY = 0.1;
const INTRO_FOOTER_DELAY = 0.2;
const INTRO_PLANE_DURATION = 1.0;
const INTRO_PLANE_STAGGER = 0.08;

// Masked word reveal for a group of persistent chrome links (#nav / #footer),
// matching animateTitleIn. The split is reverted on completion so hover
// underlines and layout return to their original markup.
function animateChromeIn(selector, delay) {
  const els = document.querySelectorAll(selector);
  if (!els.length) return null;
  const splits = [];
  const words = [];
  for (const el of els) {
    const split = SplitText.create(el, { type: "words", mask: "words" });
    splits.push(split);
    words.push(...split.words);
  }
  // Links are hidden via CSS until now (avoids a flash while textures load);
  // reveal them in the same tick the words are masked and offset below.
  gsap.set(els, { opacity: 1 });
  return gsap.from(words, {
    yPercent: 102,
    duration: INTRO_TEXT_DURATION,
    stagger: INTRO_TEXT_STAGGER,
    ease: "power3.out",
    delay,
    onComplete: () => splits.forEach((s) => s.revert()),
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const ROUTES = {
  "/": { page: "main", view: home, image: null },
  "/index": { page: "index", view: indexPage, image: null },
  "/1": { page: "inner", view: inner(0), image: 0 },
  "/2": { page: "inner", view: inner(1), image: 1 },
  "/3": { page: "inner", view: inner(2), image: 2 },
  "/4": { page: "inner", view: inner(3), image: 3 },
  "/5": { page: "inner", view: inner(4), image: 4 },
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class Controller {
  constructor({ app, gpu, lenis }) {
    this.app = app;
    this.gpu = gpu;
    this.lenis = lenis;
    this.routes = ROUTES;

    // Registry: from-page -> to-page -> Transition
    this.transitions = {
      "main->inner": new MainToInnerTransition(),
      "inner->main": new InnerToMainTransition(),
      "main->index": new MainToIndexTransition(),
      "index->main": new IndexToMainTransition(),
      "index->inner": new IndexToInnerTransition(),
      "inner->index": new InnerToIndexTransition(),
    };

    this.current = null;
    this.mutating = false;
    this.carousel = null;
    this.indexFloat = null;

    this.onClick = this.onClick.bind(this);
    this.onPopState = this.onPopState.bind(this);
  }

  async start() {
    document.addEventListener("click", this.onClick);
    window.addEventListener("popstate", this.onPopState);
    this.gpu.onResizeLayout = () => this._reapplyLayout();
    await this._renderInitial(window.location.pathname);
  }

  tick() {
    if (this.carousel) {
      this.carousel.tick();
      this._applyCarouselTilt(this.carousel.velocity);
    }
    if (this.indexFloat) this.indexFloat.tick();
    if (this.current?.page === "inner" && !this.mutating) {
      this._applyInnerTilt(this.current.image, this.lenis.velocity ?? 0);
    }
  }

  _applyCarouselTilt(velocity) {
    let target = velocity * TILT_RAD_PER_PX;
    if (target > TILT_MAX_RAD) target = TILT_MAX_RAD;
    else if (target < -TILT_MAX_RAD) target = -TILT_MAX_RAD;
    for (let i = 0; i < MAIN_COUNT; i++) {
      const plane = this.gpu.planes[mainIdx(i)];
      plane.tilt += (target - plane.tilt) * TILT_LERP;
    }
  }

  _innerTiltPlanes(image) {
    const planes = [this.gpu.planes[mainIdx(image)]];
    for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
      planes.push(this.gpu.planes[satIdx(image, j)]);
    }
    return planes;
  }

  _applyInnerTilt(image, velocity) {
    let target = velocity * INNER_TILT_RAD_PER_PX;
    if (target > INNER_TILT_MAX_RAD) target = INNER_TILT_MAX_RAD;
    else if (target < -INNER_TILT_MAX_RAD) target = -INNER_TILT_MAX_RAD;
    for (const plane of this._innerTiltPlanes(image)) {
      plane.tiltX += (target - plane.tiltX) * INNER_TILT_LERP;
    }
  }

  _routeFor(path) {
    return this.routes[path] ?? this.routes["/"];
  }

  async _renderInitial(path) {
    const route = this._routeFor(path);
    this.current = { path, ...route };
    this.app.innerHTML = route.view();
    this._snapLayout(this.current);
    this._setActiveNav(this.current.page);
    this._enterPage(this.current);
    // Prime the intro: the page is built but everything stays hidden behind the
    // preloader. _snapLayout lit the active planes, so remember which ones and
    // drop them to zero; playIntro fades them back up once the preloader clears.
    for (const p of this.gpu.planes) {
      p.introVisible = p.opacity > 0.001;
      p.opacity = 0;
    }
  }

  // First-load intro, played once after the preloader fades away (never on SPA
  // transitions). Reveals the page text, the left nav and footer links, and
  // fades the active planes up from transparent.
  playIntro() {
    const sec = this.app.querySelector(`[data-page="${this.current.page}"]`);
    animateTitleIn(sec);
    animateFactIn(sec);
    animateCaptionsIn(sec);

    const planes = this.gpu.planes.filter((p) => p.introVisible);
    if (planes.length) {
      gsap.to(planes, {
        opacity: 1,
        duration: INTRO_PLANE_DURATION,
        stagger: INTRO_PLANE_STAGGER,
        ease: "power2.out",
      });
    }
    animateChromeIn("#nav a", INTRO_NAV_DELAY);
    animateChromeIn("#footer a", INTRO_FOOTER_DELAY);
  }

  _syncPlaneToEl(plane, el) {
    plane.trackedEl = el;
    const rect = el.getBoundingClientRect();
    plane.bounds.x = rect.left;
    plane.bounds.y = rect.top;
    plane.bounds.w = rect.width;
    plane.bounds.h = rect.height;
  }

  _enterPage(state) {
    const sec = this.app.querySelector(`[data-page="${state.page}"]`);
    if (!sec) return;

    if (state.page === "main") {
      document.body.style.height = "100vh";
      this.lenis.stop();
      this.lenis.scrollTo(0, { immediate: true, force: true });
      if (!this.carousel) this.carousel = new Carousel(sec);
      this.carousel.start();
      const slots = sec.querySelectorAll(".slot");
      for (let i = 0; i < slots.length && i < MAIN_COUNT; i++) {
        this._syncPlaneToEl(this.gpu.planes[mainIdx(i)], slots[i]);
      }
      return;
    }

    if (state.page === "inner") {
      const stack = sec.querySelector(".stack");
      const slots = stack.querySelectorAll(".slot");
      document.body.style.height = `${stack.offsetHeight}px`;
      this.lenis.start();
      this.lenis.resize();
      this.lenis.scrollTo(0, { immediate: true, force: true });
      this._syncPlaneToEl(this.gpu.planes[mainIdx(state.image)], slots[0]);
      for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
        const slot = slots[j + 1];
        if (!slot) continue;
        this._syncPlaneToEl(this.gpu.planes[satIdx(state.image, j)], slot);
      }
      return;
    }

    if (state.page === "index") {
      document.body.style.height = "100vh";
      this.lenis.stop();
      this.lenis.scrollTo(0, { immediate: true, force: true });
      if (!this.indexFloat) {
        this.indexFloat = new IndexFloat(this.gpu);
        this.indexFloat.prepare();
      }
      this.indexFloat.start();
      return;
    }
  }

  _leavePage(state) {
    if (!state) return;
    if (state.page === "main" && this.carousel) {
      this.carousel.stop();
      this.carousel = null;
      // Clear any leftover scroll tilt so the main planes don't carry a lean
      // into the inner/index pages, where they're reused as the hero image.
      for (let i = 0; i < MAIN_COUNT; i++) this.gpu.planes[mainIdx(i)].tilt = 0;
    }
    if (state.page === "index" && this.indexFloat) {
      this.indexFloat.stop();
      this.indexFloat = null;
    }
    if (state.page === "inner") {
      // Clear the scroll lean so the reused hero/satellite planes don't carry
      // it onto the next page.
      for (const plane of this._innerTiltPlanes(state.image)) plane.tiltX = 0;
    }
    for (const plane of this.gpu.planes) {
      plane.trackedEl = null;
    }
  }

  _setActiveNav(pageKey) {
    // Only the main and index pages have a corresponding nav link; inner
    // pages leave the nav with nothing active.
    const activeKey =
      pageKey === "main" ? "main" : pageKey === "index" ? "index" : null;
    const links = document.querySelectorAll("#nav a[data-nav-key]");
    for (const a of links) {
      if (activeKey && a.getAttribute("data-nav-key") === activeKey) {
        a.classList.add("is-active");
      } else {
        a.classList.remove("is-active");
      }
    }
  }

  _snapLayout(state) {
    if (state.page === "main") this.gpu.applyMainLayout();
    else if (state.page === "index") this.gpu.applyIndexLayout();
    else if (state.page === "inner") this.gpu.applyInnerLayout(state.image);
  }

  _reapplyLayout() {
    if (!this.current || this.mutating) return;
    if (this.current.page === "main" && this.carousel) {
      this.carousel.measure();
      return;
    }
    if (this.current.page === "index" && this.indexFloat) {
      this.indexFloat.measure();
      return;
    }
    this._snapLayout(this.current);
  }

  _resolveTransition(from, to) {
    return this.transitions[`${from}->${to}`];
  }

  async navigate(path, target = null) {
    if (this.mutating) return;
    if (path === this.current?.path) return;
    const next = this.routes[path];
    if (!next) return;

    const fromState = this.current;
    const toState = { path, ...next };
    const transition = this._resolveTransition(fromState.page, next.page);

    this.mutating = true;
    if (target !== "back") history.pushState({ path }, "", path);
    this._setActiveNav(next.page);

    const fromElNow = this.app.children[0];
    const titleOut = animateTitleOut(fromElNow);
    const factOut = animateFactOut(fromElNow);
    const captionsOut = animateCaptionsOut(fromElNow);

    this._leavePage(fromState);

    this.app.insertAdjacentHTML("beforeend", next.view());
    const fromEl = this.app.children[0];
    const toEl = this.app.lastElementChild;
    if (fromEl) fromEl.style.pointerEvents = "none";

    if (window.scrollY !== 0 || window.scrollX !== 0) {
      this.lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    }

    if (next.page === "main") {
      this.carousel = new Carousel(toEl);
      this.carousel.prepare();
    }

    if (next.page === "index") {
      this.indexFloat = new IndexFloat(this.gpu);
      this.indexFloat.prepare();
    }

    const titleIn = animateTitleIn(toEl);
    const factIn = animateFactIn(toEl);
    const captionsIn = animateCaptionsIn(toEl);

    const ctx = {
      gpu: this.gpu,
      fromImage: fromState.image,
      toImage: next.image,
      indexFloat: this.indexFloat,
    };
    const txOut = transition.out(fromEl, toEl, ctx);
    const txIn = transition.in(fromEl, toEl, ctx);

    await Promise.all([
      titleOut,
      titleIn,
      factOut,
      factIn,
      captionsOut,
      captionsIn,
      txOut,
      txIn,
    ]);

    fromEl.remove();
    this.current = toState;
    this._snapLayout(toState);
    this._enterPage(toState);
    this.mutating = false;
  }

  onClick(e) {
    const a = e.target.closest("a[data-link]");
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute("href");
    this.navigate(href);
  }

  onPopState() {
    this.navigate(window.location.pathname, "back");
  }
}
