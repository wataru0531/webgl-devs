
// index.js

import Lenis from "lenis";
import { GPU } from "./gpu.js";
import { Controller } from "./controller.js";
import { Cursor } from "./cursor.js";
import { Preloader } from "./preloader.js";

async function start() {
  // const lenis = new Lenis();

  const lenis = new Lenis({
    smoothWheel: true, // マウスホイールの動きをなめらかに
    syncTouch: true, // スマホなどのタッチスクロールもLenisが管理
    lerp: 0.09,
  });


  const preloader = new Preloader(); // プレローダー初期化
  const counting =  await preloader.count();
  // console.log(counting); // undefined

  const gpu = new GPU();
  await gpu.init();

  const controller = new Controller({
    app: document.getElementById("app"),
    gpu,
    lenis,
  });
  await controller.start();

  function raf(time) {
    lenis.raf(time);
    controller.tick();
    gpu.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  await counting;
  controller.playIntro();
  preloader.reveal(); // .preloaderを消す

  const cursor = new Cursor(); // カーソル初期化
  cursor.start();
}

start();
