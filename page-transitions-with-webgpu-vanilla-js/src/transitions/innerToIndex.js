import {
  MAIN_COUNT,
  SATELLITES_PER_IMAGE,
  mainIdx,
  satIdx,
} from '../gpu.js';
import {
  tweenBounds,
  tweenOpacity,
  DUR_FADE,
  EASE_FADE_OUT,
} from './constants.js';

export class InnerToIndexTransition {
  async out(_from, _to, ctx) {
    const { gpu, fromImage, indexFloat } = ctx;
    const targets = indexFloat.getTargets();
    const tweens = [];
    tweens.push(
      tweenBounds(gpu.planes[mainIdx(fromImage)], targets[mainIdx(fromImage)]),
    );
    for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
      const sat = gpu.planes[satIdx(fromImage, j)];
      tweens.push(
        tweenOpacity(sat, 0, {
          duration: DUR_FADE * 0.7,
          ease: EASE_FADE_OUT,
          delay: (SATELLITES_PER_IMAGE - 1 - j) * 0.05,
        }),
      );
    }
    await Promise.all(tweens);
  }

  // Stamp the other 4 mains at their float positions and fade them in.
  async in(_from, _to, ctx) {
    const { gpu, fromImage, indexFloat } = ctx;
    const targets = indexFloat.getTargets();
    const fades = [];
    for (let i = 0; i < MAIN_COUNT; i++) {
      if (i === fromImage) continue;
      const main = gpu.planes[mainIdx(i)];
      main.bounds = { ...targets[mainIdx(i)] };
      main.opacity = 0;
      fades.push(tweenOpacity(main, 1, { delay: 0.2 + i * 0.04 }));
    }
    await Promise.all(fades);
  }
}
