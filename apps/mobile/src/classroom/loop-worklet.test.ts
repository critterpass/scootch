import { describe, expect, it } from '@jest/globals';

import { LOOPS, sampleLoop, type Loop } from '@phusclass/art/class';

import { sampleLoopWorklet } from './loop-worklet';

// The worklet copy must move every layer exactly as the art package's sampler does, or the phone
// and the node sheets would disagree.
describe('the UI-thread loop sampler', () => {
  const loops = Object.entries(LOOPS) as [string, Loop][];
  const moments = [0, 1, 77, 120, 160, 230, 460, 800, 1150, 1500, 3199, 4500, 7000, 9999, 61234];

  it.each(loops)('samples %s as the art package does', (_, loop) => {
    for (const ms of moments) {
      const want = sampleLoop(loop, ms);
      const got = sampleLoopWorklet(loop, ms);
      for (const key of Object.keys(want) as (keyof typeof want)[]) {
        expect(got[key]).toBeCloseTo(want[key], 6);
      }
    }
  });
});
