import { MAIN_COUNT, mainIdx } from '../gpu.js';
import { tweenBounds } from './constants.js';

export class MainToIndexTransition {
  async out(_from, _to, ctx) {
    const { gpu, indexFloat } = ctx;
    const targets = indexFloat.getTargets();
    const tweens = [];
    for (let i = 0; i < MAIN_COUNT; i++) {
      tweens.push(tweenBounds(gpu.planes[mainIdx(i)], targets[mainIdx(i)]));
    }
    await Promise.all(tweens);
  }

  async in(_from, _to, _ctx) {
    // Mains morph in via out(); sats are hidden on /index.
  }
}
