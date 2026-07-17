import {
  MAIN_COUNT,
  SATELLITES_PER_IMAGE,
  mainIdx,
  satIdx,
} from '../gpu.js';
import { getInnerTargets } from '../pages/inner.js';
import { tweenBounds, tweenOpacity } from './constants.js';

export class MainToInnerTransition {
  async out(_from, toEl, ctx) {
    const { gpu, toImage } = ctx;
    const innerRects = getInnerTargets(toEl);
    const target = innerRects[0];
    const tweens = [];
    for (let i = 0; i < MAIN_COUNT; i++) {
      const plane = gpu.planes[mainIdx(i)];
      if (i === toImage) {
        tweens.push(tweenBounds(plane, target));
        continue;
      }
      tweens.push(tweenOpacity(plane, 0));
    }
    await Promise.all(tweens);
  }

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
