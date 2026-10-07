import { describe, expect, it } from '@jest/globals';

import { dockGap, figureIn, frameFor, FRAMES, lineOf, segmentOffset } from './one-screen-frame';

describe('how big Scootch is on each state of the one screen', () => {
  it('follows the board for each state, not one size for all', () => {
    expect(frameFor({ kind: 'composer' }).figure).toBe(300);
    expect(frameFor({ kind: 'composer', warmUp: true }).figure).toBe(270);
    expect(frameFor({ kind: 'composer', recording: true, warmUp: true })).toBe(FRAMES.listening);
    expect(frameFor({ kind: 'task_set' }).figure).toBe(200);
    // Home keeps one size at rest and held, so nothing jumps as Scootch is spoken to.
    expect(frameFor({ kind: 'composer', home: true }).figure).toBe(260);
    expect(frameFor({ kind: 'composer', home: true, recording: true }).figure).toBe(260);
    expect(frameFor({ kind: 'panel', name: 'one-thing', choosing: true }).figure).toBe(230);
    expect(frameFor({ kind: 'panel', name: 'one-thing' }).figure).toBe(250);
  });

  it('keeps the same space as the headline lands, so nothing jumps', () => {
    const { choosing, oneThing } = FRAMES;
    expect([choosing.box, choosing.top, choosing.textTop]).toEqual([
      oneThing.box,
      oneThing.top,
      oneThing.textTop,
    ]);
  });

  it('is the board’s size on the board’s phone and smaller on a short one', () => {
    expect(figureIn(300, 393, 852)).toBe(300);
    expect(figureIn(300, 375, 667)).toBe(240);
    expect(figureIn(300, 320, 568)).toBe(204);
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

describe('room for the words and the dock', () => {
  it('opens the line for Vietnamese and leaves the board’s line for English', () => {
    expect(lineOf(1.07, 'en')).toBe(1.07);
    expect(lineOf(1.07, 'vi')).toBe(1.2);
    expect(lineOf(1.36, 'vi')).toBe(1.36);
  });

  it('never pushes the dock into the home bar', () => {
    expect(dockGap(34)).toBe(0);
    expect(dockGap(0)).toBe(30);
    expect(dockGap(20)).toBe(10);
  });
});
