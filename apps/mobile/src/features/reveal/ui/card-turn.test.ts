import { describe, expect, it } from '@jest/globals';

import { facesFront, liveliness, turnedBy } from './card-turn';

describe('turning a card over', () => {
  it('shows the back after one turn and the front again after the next, from the first press', () => {
    const once = turnedBy(0, 1);
    expect(once).toEqual({ side: 1, degrees: 180 });
    expect(facesFront(once.degrees)).toBe(false);
    const twice = turnedBy(once.side, 1);
    expect(twice.degrees).toBe(360);
    expect(facesFront(twice.degrees)).toBe(true);
  });

  it('unwinds when it is flicked back the way it came', () => {
    const left = turnedBy(0, -1);
    expect(left.degrees).toBe(-180);
    expect(facesFront(left.degrees)).toBe(false);
    expect(turnedBy(left.side, 1)).toEqual({ side: 0, degrees: 0 });
  });

  it("keeps the face towards the reader through the lean and the flip's overshoot", () => {
    for (const degrees of [0, 13, -14, 6, 89]) expect(facesFront(degrees)).toBe(true);
    for (const degrees of [91, 180, 194, -166]) expect(facesFront(degrees)).toBe(false);
  });
});

describe('a card left alone', () => {
  it('is lively for six seconds, fades over the next two, and then rests', () => {
    expect(liveliness(0, 6, 2)).toBe(1);
    expect(liveliness(6, 6, 2)).toBe(1);
    expect(liveliness(7, 6, 2)).toBeCloseTo(0.5);
    expect(liveliness(8, 6, 2)).toBe(0);
    expect(liveliness(60, 6, 2)).toBe(0);
  });
});
