import { describe, expect, it } from '@jest/globals';

import { FOIL_LIGHT } from '@scootch/art';

import { cardCanvasSize, cardWidthIn } from './card-size';
import { gradientEnds, slidBox } from './foil-geometry';

const FACE = { x: 9, y: 9, w: 312, h: 444 };

describe('the card on screen', () => {
  it("is the board's 330 points on a 393 point phone, and never wider", () => {
    expect(cardWidthIn({ width: 393, height: 700 })).toBe(330);
    expect(cardWidthIn({ width: 430, height: 900 })).toBe(330);
  });

  it('shrinks to keep its whole canvas, stamp overhang included, inside a small space', () => {
    for (const space of [
      { width: 320, height: 700 },
      { width: 393, height: 380 },
    ]) {
      const canvas = cardCanvasSize(cardWidthIn(space));
      expect(canvas.width).toBeLessThanOrEqual(space.width + 0.001);
      expect(canvas.height).toBeLessThanOrEqual(space.height + 0.001);
    }
  });
});

describe('the foil band', () => {
  const middle = (px: number, py: number) => {
    const { start, end } = gradientEnds(slidBox(FACE, FOIL_LIGHT.size, px, py), FOIL_LIGHT.angle);
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  };

  it('rests across the middle of the face', () => {
    expect(middle(50, 50).x).toBeCloseTo(FACE.x + FACE.w / 2);
    expect(middle(50, 50).y).toBeCloseTo(FACE.y + FACE.h / 2);
  });

  it("slides 2.4% of its travel for each degree of lean, as the board's does", () => {
    const travel = FACE.w * (FOIL_LIGHT.size - 1);
    const leaned = middle(50 + 5 * FOIL_LIGHT.perDegree, 50);
    expect(middle(50, 50).x - leaned.x).toBeCloseTo((travel * 5 * 2.4) / 100);
    expect(leaned.y).toBeCloseTo(middle(50, 50).y);
  });

  it("runs at the board's 115 degrees", () => {
    const { start, end } = gradientEnds(FACE, 115);
    const degrees = (Math.atan2(end.x - start.x, -(end.y - start.y)) * 180) / Math.PI;
    expect(degrees).toBeCloseTo(115);
  });
});
