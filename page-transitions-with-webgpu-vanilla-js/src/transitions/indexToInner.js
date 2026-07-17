import {
  MAIN_COUNT,
  SATELLITES_PER_IMAGE,
  mainIdx,
  satIdx,
} from '../gpu.js';
import { getInnerTargets } from '../pages/inner.js';
import {
  tweenBounds,
  tweenOpacity,
  DUR_FADE,
  EASE_FADE_OUT,
} from './constants.js';

export class IndexToInnerTransition {
  async out(_from, toEl, ctx) {
    const { gpu, toImage } = ctx;
    const innerRects = getInnerTargets(toEl);
    const tweens = [];
    tweens.push(tweenBounds(gpu.planes[mainIdx(toImage)], innerRects[0]));
    for (let i = 0; i < MAIN_COUNT; i++) {
      if (i === toImage) continue;
      tweens.push(
        tweenOpacity(gpu.planes[mainIdx(i)], 0, {
          duration: DUR_FADE * 0.7,
          ease: EASE_FADE_OUT,
        }),
      );
    }
    await Promise.all(tweens);
  }

  // 4 satellites for the target image stamp at slots 1..4 and fade in.
  async in(_from, toEl, ctx) {
    const { gpu, toImage } = ctx;
    const innerRects = getInnerTargets(toEl);
    const fades = [];
    for (let j = 0; j < SATELLITES_PER_IMAGE; j++) {
      const sat = gpu.planes[satIdx(toImage, j)];
      sat.bounds = { ...innerRects[j + 1] };
      sat.opacity = 0;
      fades.push(
        tweenOpacity(sat, 1, {
          delay: 0.25 + j * 0.08,
        }),
      );
    }
    await Promise.all(fades);
  }
}
