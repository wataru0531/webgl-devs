import {
  MAIN_COUNT,
  SATELLITES_PER_IMAGE,
  mainIdx,
  satIdx,
} from '../gpu.js';
import { getMainTargets } from '../pages/home.js';
import {
  tweenBounds,
  tweenOpacity,
  DUR_FADE,
  EASE_FADE_OUT,
} from './constants.js';

export class InnerToMainTransition {
  async out(_from, toEl, ctx) {
    const { gpu, fromImage } = ctx;
    const mainRects = getMainTargets(toEl);
    const target = mainRects[fromImage];
    const tweens = [];
    tweens.push(tweenBounds(gpu.planes[mainIdx(fromImage)], target));
    for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
      const sat = gpu.planes[satIdx(fromImage, j)];
      const reversedDelay = (SATELLITES_PER_IMAGE - 1 - j) * 0.05;
      tweens.push(
        tweenOpacity(sat, 0, {
          duration: DUR_FADE * 0.7,
          ease: EASE_FADE_OUT,
          delay: reversedDelay,
        }),
      );
    }
    await Promise.all(tweens);
  }

  // The other 4 main planes fade in at their horizontal carousel slots.
  async in(_from, toEl, ctx) {
    const { gpu, fromImage } = ctx;
    const mainRects = getMainTargets(toEl);
    const fades = [];
    for (let i = 0; i < MAIN_COUNT; i++) {
      if (i === fromImage) continue;
      const main = gpu.planes[mainIdx(i)];
      main.bounds = { ...mainRects[i] };
      main.opacity = 0;
      fades.push(tweenOpacity(main, 1, { delay: 0.25 }));
    }
    await Promise.all(fades);
  }
}
