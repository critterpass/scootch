import { describe, expect, it } from 'vitest';

import {
  easeGaze,
  GAZE_AT_REST,
  gazeTarget,
  monsterTapMood,
  MOOD_SQUASH_SECONDS,
  moodSquash,
  scootchTapMood,
  TAP_REACTION_SECONDS,
} from './reactions';

describe('reactions', () => {
  it('pops Scootch and scares a monster for 1.4 seconds after a tap, then lets them be', () => {
    expect(scootchTapMood('waiting', null)).toBe('waiting');
    expect(scootchTapMood('waiting', 0)).toBe('celebrating');
    expect(scootchTapMood('waiting', TAP_REACTION_SECONDS - 0.01)).toBe('celebrating');
    expect(scootchTapMood('waiting', TAP_REACTION_SECONDS)).toBe('waiting');
    expect(monsterTapMood('idle', 0.7)).toBe('nervous');
    expect(monsterTapMood('caught', TAP_REACTION_SECONDS + 1)).toBe('caught');
    expect(monsterTapMood('idle', -1)).toBe('idle');
  });

  it('squashes once on a change: shorter and wider, then taller, then settled', () => {
    expect(moodSquash(0)).toEqual({ scaleX: 1, scaleY: 1 });
    expect(moodSquash(-3)).toEqual({ scaleX: 1, scaleY: 1 });
    const settled = moodSquash(MOOD_SQUASH_SECONDS);
    expect(settled.scaleX).toBeCloseTo(1, 12);
    expect(settled.scaleY).toBeCloseTo(1, 12);
    expect(moodSquash(9)).toEqual(settled);
    let low = 1;
    let high = 1;
    let wide = 1;
    for (let t = 0; t <= MOOD_SQUASH_SECONDS; t += 0.005) {
      const { scaleX, scaleY } = moodSquash(t);
      low = Math.min(low, scaleY);
      high = Math.max(high, scaleY);
      wide = Math.max(wide, scaleX);
    }
    // The design's numbers are the size of the wave; its first dip is a little under them.
    expect(low).toBeGreaterThan(1 - 0.13);
    expect(low).toBeLessThan(0.91);
    expect(wide).toBeGreaterThan(1.06);
    expect(wide).toBeLessThan(1.09);
    expect(high).toBeGreaterThan(1.02);
  });

  it('looks towards a point, fully from 160 points away, and not at all beyond reach', () => {
    expect(gazeTarget(0, 0)).toEqual({ x: 0, y: 0 });
    expect(gazeTarget(80, 0)).toEqual({ x: 0.5, y: 0 });
    expect(gazeTarget(-400, 0)).toEqual({ x: -1, y: 0 });
    expect(gazeTarget(0, 320)?.y).toBeCloseTo(0.8, 12);
    expect(gazeTarget(700, 0)).toBeNull();
    expect(gazeTarget(Number.NaN, 0)).toBeNull();
  });

  it('eases the gaze in, lets it go smoothly and comes to rest exactly', () => {
    const target = { x: 1, y: -0.4 };
    let gaze = GAZE_AT_REST;
    let last = 0;
    for (let i = 0; i < 48; i++) {
      gaze = easeGaze(gaze, target, 1 / 24);
      expect(gaze.x).toBeGreaterThan(last);
      expect(gaze.x).toBeLessThanOrEqual(1);
      last = gaze.x;
    }
    expect(gaze.x).toBeGreaterThan(0.99);
    expect(gaze.hold).toBeGreaterThan(0.99);
    // The same two seconds in one step or many end in the same place.
    expect(easeGaze(GAZE_AT_REST, target, 2).x).toBeCloseTo(gaze.x, 9);
    let steps = 0;
    while (gaze !== GAZE_AT_REST && steps < 500) {
      const next = easeGaze(gaze, null, 1 / 24);
      expect(next.hold).toBeLessThan(gaze.hold);
      gaze = next;
      steps++;
    }
    expect(gaze).toBe(GAZE_AT_REST);
    // About a second and a half, as the design lets go.
    expect(steps / 24).toBeGreaterThan(0.8);
    expect(steps / 24).toBeLessThan(2.5);
    expect(easeGaze(GAZE_AT_REST, null, 1)).toBe(GAZE_AT_REST);
  });
});
