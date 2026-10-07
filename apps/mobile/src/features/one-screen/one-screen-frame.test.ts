import { describe, expect, it } from '@jest/globals';

import { frameFor, FRAMES, segmentOffset } from './one-screen-frame';

describe('how big Scootch is on each state of the one screen', () => {
  it('follows the board for each state, not one size for all', () => {
    expect(frameFor({ kind: 'composer' }).figure).toBe(300);
    expect(frameFor({ kind: 'composer', warmUp: true }).figure).toBe(270);
    expect(frameFor({ kind: 'composer', recording: true, warmUp: true })).toBe(FRAMES.listening);
    expect(frameFor({ kind: 'task_set' }).figure).toBe(200);
    expect(frameFor({ kind: 'done' }).figure).toBe(260);
    expect(frameFor({ kind: 'panel', name: 'one-thing', choosing: true }).figure).toBe(230);
    expect(frameFor({ kind: 'panel', name: 'one-thing' }).figure).toBe(250);
  });

  it('never stands him in a space smaller than he is', () => {
    for (const frame of Object.values(FRAMES))
      expect(frame.box).toBeGreaterThanOrEqual(frame.figure);
  });
});

describe('where the chosen pill of the minutes control sits', () => {
  it('slides by one segment at a time, inside the 2 point padding', () => {
    expect(segmentOffset(0, 353, 3, 2)).toBe(0);
    expect(segmentOffset(1, 353, 3, 2)).toBeCloseTo(116.33, 1);
    expect(segmentOffset(2, 353, 3, 2)).toBeCloseTo(232.67, 1);
  });

  it('stays put until the control has been measured', () => {
    expect(segmentOffset(2, 0, 3, 2)).toBe(0);
  });
});
