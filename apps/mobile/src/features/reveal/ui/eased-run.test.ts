import { describe, expect, it } from '@jest/globals';

import { easedRun } from './eased-run';

describe("the flip on the board's curve", () => {
  // cubic-bezier(.45, 0, .2, 1) over 6.4 seconds: the card starts to turn 1154 ms in, is past the
  // front at 1638 ms and has settled by 1926 ms.
  const run = easedRun(0.45, 0, 0.2, 1, 1, 400);
  const alongAt = (ms: number) => {
    const index = run.times.findIndex((time) => time >= ms / 6400);
    return run.along[index] ?? 1;
  };

  it("reaches each keyframe of the flip at the board's own moment", () => {
    expect(alongAt(1154)).toBeCloseTo(0.08, 2);
    expect(alongAt(1638)).toBeCloseTo(0.2, 2);
    expect(alongAt(1803)).toBeCloseTo(0.26, 2);
    expect(alongAt(1926)).toBeCloseTo(0.31, 2);
  });

  it('only ever moves forward', () => {
    for (let i = 1; i < run.along.length; i++) {
      expect(run.along[i] ?? 0).toBeGreaterThanOrEqual(run.along[i - 1] ?? 0);
    }
  });
});
