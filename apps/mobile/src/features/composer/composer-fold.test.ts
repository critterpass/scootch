import { describe, expect, it } from '@jest/globals';

import { capsuleEdge, DOCK_PADDING, liveRowShift } from './composer-fold';

const SLOT = 54 + DOCK_PADDING;

describe('how wide the talk capsule is drawn', () => {
  it('stands clear of the round button at rest and fills the dock when held', () => {
    expect(capsuleEdge(0, SLOT)).toBe(SLOT);
    expect(capsuleEdge(1, SLOT)).toBe(0);
  });

  it('only ever moves between those two edges, one way, as the hold goes on', () => {
    let last = capsuleEdge(0, SLOT);
    for (let step = 1; step <= 20; step += 1) {
      const edge = capsuleEdge(step / 20, SLOT);
      expect(edge).toBeLessThanOrEqual(last);
      last = edge;
    }
  });

  it('never uncovers the dock when the animation runs past either end', () => {
    expect(capsuleEdge(1.08, SLOT)).toBe(0);
    expect(capsuleEdge(-0.05, SLOT)).toBe(SLOT);
  });
});

describe('how the live row follows the finger', () => {
  it('follows a slide to the left at about a third and ignores one to the right', () => {
    expect(liveRowShift(-80)).toBeCloseTo(-28);
    expect(liveRowShift(40)).toBe(0);
  });
});
