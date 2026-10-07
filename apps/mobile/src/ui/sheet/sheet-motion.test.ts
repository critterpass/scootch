import { describe, expect, it } from '@jest/globals';

import { removesOnRelease, ROW } from '../motion/swipe-motion';

import { closesOnRelease, rubberBand, SHEET } from './sheet-motion';

describe('letting go of the sheet', () => {
  it('closes past a third of its height or on a flick down, and springs back otherwise', () => {
    expect(closesOnRelease(210, 0, 600)).toBe(true);
    expect(closesOnRelease(190, 0, 600)).toBe(false);
    expect(closesOnRelease(20, SHEET.flick + 1, 600)).toBe(true);
    // Pulled up, or not moved, it never closes, however fast the finger was.
    expect(closesOnRelease(0, 5000, 600)).toBe(false);
    expect(closesOnRelease(-30, 5000, 600)).toBe(false);
  });

  it('follows a finger down exactly and gives only a little to a pull up', () => {
    expect(rubberBand(120)).toBe(120);
    expect(rubberBand(-100)).toBeCloseTo(-100 * SHEET.give);
  });
});

describe('letting go of a drawer row', () => {
  it('removes it past the mark or on a flick to the left, and never for a drag to the right', () => {
    expect(removesOnRelease(-200, 0, 340)).toBe(true);
    expect(removesOnRelease(-100, 0, 340)).toBe(false);
    expect(removesOnRelease(-20, -(ROW.flick + 1), 340)).toBe(true);
    expect(removesOnRelease(0, -5000, 340)).toBe(false);
    expect(removesOnRelease(40, -5000, 340)).toBe(false);
  });
});
