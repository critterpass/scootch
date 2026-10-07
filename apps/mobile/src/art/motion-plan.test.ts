import { describe, expect, it } from '@jest/globals';

import { buildScootch } from '@scootch/art';
import { scootchMoodSchema, WORK_MODE_IDS } from '@scootch/domain';

import {
  animatedValues,
  FULL_HZ,
  scootchFrameAt,
  scootchMotionPlan,
  SMALL_HZ,
  tickHz,
  type ScootchMotionInput,
} from './motion-plan';

const moods = scootchMoodSchema.options;
const base: ScootchMotionInput = {
  mood: 'waiting',
  workMode: null,
  reducedMotion: false,
  care: 'none',
  ownLoop: true,
};
const every: ScootchMotionInput[] = [
  ...moods.map((mood) => ({ ...base, mood })),
  ...WORK_MODE_IDS.map((workMode) => ({ ...base, mood: 'working' as const, workMode })),
];
const at = (seconds: number, sinceChange = seconds) => ({ seconds, sinceChange, seed: 'scootch' });
const REST = { motion: {}, boil: 0, bob: 0, key: '' };

describe('what moves', () => {
  it('moves nothing under Reduce Motion, whatever the mood or the work mode', () => {
    for (const input of every) {
      const plan = scootchMotionPlan({ ...input, reducedMotion: true });
      expect(animatedValues(plan)).toEqual([]);
      expect(scootchFrameAt(input, plan, at(123.4))).toEqual(REST);
    }
  });

  it('moves nothing on a crisis day', () => {
    for (const input of every) {
      const plan = scootchMotionPlan({ ...input, care: 'crisis' });
      expect(animatedValues(plan)).toEqual([]);
      expect(scootchFrameAt(input, plan, at(42))).toEqual(REST);
    }
  });

  it('only breathes for a serious task, by its flag or by the serious mood', () => {
    for (const input of every) {
      const plan = scootchMotionPlan({ ...input, care: 'serious' });
      expect(animatedValues(plan)).toEqual(['breath']);
      // The breath runs; the drawing never leaves the still, not even to boil.
      const frames = [0.4, 3.9, 77].map((t) => scootchFrameAt(input, plan, at(t)));
      for (const frame of frames) expect({ ...frame, bob: 0 }).toEqual(REST);
      expect(frames.some((frame) => frame.bob !== 0)).toBe(true);
      expect(tickHz(plan, 200)).toBe(SMALL_HZ);
    }
    expect(animatedValues(scootchMotionPlan({ ...base, mood: 'serious' }))).toEqual(['breath']);
  });

  it('keeps a table seat to its idle: no motion of its own', () => {
    const seat = { ...base, mood: 'working' as const, workMode: 'cooking' as const };
    const plan = scootchMotionPlan({ ...seat, ownLoop: false });
    expect(animatedValues(plan)).toEqual(['breath', 'blink', 'glance', 'boil']);
    const { motion } = scootchFrameAt(seat, plan, at(5.2));
    expect(motion.work).toBeUndefined();
    expect(motion.time).toBeUndefined();
    expect(motion.beat).toBeUndefined();
  });
});

describe('what a moving Scootch shows at one moment', () => {
  it('shows everything at once: breath, blink, boil and its own motion, in every mood and mode', () => {
    for (const input of every) {
      if (input.mood === 'serious') continue;
      const plan = scootchMotionPlan(input);
      const working = input.workMode !== null;
      expect(animatedValues(plan)).toEqual(
        working
          ? ['breath', 'blink', 'boil', 'loop']
          : ['breath', 'blink', 'glance', 'boil', 'loop'],
      );
      expect(tickHz(plan, 200)).toBe(FULL_HZ);
      expect(tickHz(plan, 56)).toBe(SMALL_HZ);
      const frame = scootchFrameAt(input, plan, at(7.3, 1.1));
      expect(frame.motion.time).toBe(1.1);
      expect(frame.motion.blink).toBeDefined();
      expect(frame.boil).toBe(2);
      expect(frame.bob).not.toBe(0);
      expect(working ? frame.motion.work : frame.motion.beat).toBeDefined();
    }
  });

  it('starts every mood on its still, and blinks while a work mode runs', () => {
    for (const input of every) {
      const plan = scootchMotionPlan(input);
      const props = { ...input, attitude: 'cheeky' } as const;
      const first = scootchFrameAt(input, plan, at(0));
      expect(buildScootch(props, first.motion, { boil: first.boil })).toEqual(buildScootch(props));
    }
    const input = { ...base, mood: 'working' as const, workMode: 'email' as const };
    const plan = scootchMotionPlan(input);
    let blinked = false;
    for (let t = 0; t < 30 && !blinked; t += 1 / FULL_HZ) {
      blinked = (scootchFrameAt(input, plan, at(t)).motion.blink ?? 0) > 0.5;
    }
    expect(blinked).toBe(true);
  });

  it('gives the same key to the same drawing and another to the next', () => {
    const seat = { ...base, ownLoop: false };
    const plan = scootchMotionPlan(seat);
    // Between two boil frames an idling seat with open eyes and no glance does not change.
    const keys = new Set<string>();
    let same = 0;
    let last = '';
    for (let t = 0; t < 20; t += 1 / SMALL_HZ) {
      const { key } = scootchFrameAt(seat, plan, at(t));
      if (key === last) same++;
      last = key;
      keys.add(key);
    }
    expect(same).toBeGreaterThan(100);
    expect(keys.size).toBeGreaterThan(3);
    const moving = scootchMotionPlan(base);
    expect(scootchFrameAt(base, moving, at(1)).key).not.toBe(
      scootchFrameAt(base, moving, at(1.04)).key,
    );
  });

  it('carries a look only while some of it is held', () => {
    const plan = scootchMotionPlan(base);
    const held = scootchFrameAt(base, plan, { ...at(2), look: { x: 0.5, y: 0, hold: 0.6 } });
    expect(held.motion.look).toEqual({ x: 0.5, y: 0, hold: 0.6 });
    const gone = scootchFrameAt(base, plan, { ...at(2), look: { x: 0, y: 0, hold: 0 } });
    expect(gone.motion.look).toBeUndefined();
  });
});
