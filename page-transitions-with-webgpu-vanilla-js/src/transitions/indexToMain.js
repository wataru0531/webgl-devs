import { MAIN_COUNT, mainIdx } from '../gpu.js';
import { getMainTargets } from '../pages/home.js';
import { tweenBounds } from './constants.js';

export class IndexToMainTransition {
  async out(_from, toEl, ctx) {
    const { gpu } = ctx;
    const mainRects = getMainTargets(toEl);
    const tweens = [];
    for (let i = 0; i < MAIN_COUNT; i++) {
      tweens.push(tweenBounds(gpu.planes[mainIdx(i)], mainRects[i]));
    }
    await Promise.all(tweens);
  }

  async in(_from, _to, _ctx) {
    // No fade-in needed; the 5 mains morph in via out().
  }
}
