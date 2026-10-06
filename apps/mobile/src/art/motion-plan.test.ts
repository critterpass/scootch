import { describe, expect, it } from '@jest/globals';

import { buildScootch, WORK_LOOPS } from '@scootch/art';
import { scootchMoodSchema, WORK_MODE_IDS } from '@scootch/domain';

import {
  animatedValues,
  MAX_FRAMES,
  scootchFrameSet,
  scootchMotionPlan,
  scootchTick,
  uniqueLayers,
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

describe('what moves', () => {
  it('moves nothing under Reduce Motion, whatever the mood or the work mode', () => {
    for (const input of every) {
      const plan = scootchMotionPlan({ ...input, reducedMotion: true });
      expect(animatedValues(plan)).toEqual([]);
      const set = scootchFrameSet(input, plan);
      expect(set.motions).toEqual([{}]);
      expect(scootchTick(set, plan, input, 123.4, 'scootch')).toEqual({ frame: 0, bob: 0 });
    }
  });

  it('moves nothing on a crisis day', () => {
    for (const input of every) {
      const plan = scootchMotionPlan({ ...input, care: 'crisis' });
      expect(animatedValues(plan)).toEqual([]);
      expect(scootchFrameSet(input, plan).motions).toEqual([{}]);
    }
  });

  it('only breathes for a serious task, by its flag or by the serious mood', () => {
    for (const input of every) {
      const plan = scootchMotionPlan({ ...input, care: 'serious' });
      expect(animatedValues(plan)).toEqual(['breath']);
      const set = scootchFrameSet(input, plan);
      expect(set.motions).toEqual([{}]);
      // The breath runs; the frame never leaves the still.
      const ticks = [0.4, 3.9, 77].map((t) => scootchTick(set, plan, input, t, 'scootch'));
      expect(ticks.map((tick) => tick.frame)).toEqual([0, 0, 0]);
      expect(ticks.some((tick) => tick.bob !== 0)).toBe(true);
    }
    expect(animatedValues(scootchMotionPlan({ ...base, mood: 'serious' }))).toEqual(['breath']);
  });

  it('keeps a table seat to its idle: no loop of its own', () => {
    const seat = { ...base, mood: 'working' as const, workMode: 'cooking' as const };
    const plan = scootchMotionPlan({ ...seat, ownLoop: false });
    expect(animatedValues(plan)).toEqual(['breath', 'blink', 'glance']);
    expect(scootchFrameSet({ ...seat, ownLoop: false }, plan).loopFrames).toBe(1);
  });
});

describe('the frames a moving Scootch keeps', () => {
  it('starts every set on the still and never keeps more than the budget', () => {
    for (const input of every) {
      const plan = scootchMotionPlan(input);
      const set = scootchFrameSet(input, plan);
      expect(set.motions[0]).toEqual({});
      expect(set.motions.length).toBe(set.loopFrames * set.eyeStates);
      expect(set.motions.length).toBeLessThanOrEqual(MAX_FRAMES);
      expect(scootchTick(set, plan, input, 0, 'scootch')).toEqual({ frame: 0, bob: 0 });
    }
  });

  it('runs a work mode through its loop in order, once per loop, without a blink set', () => {
    const input = { ...base, mood: 'working' as const, workMode: 'cooking' as const };
    const plan = scootchMotionPlan(input);
    const set = scootchFrameSet(input, plan);
    expect(plan).toEqual({ breath: true, blink: false, glance: false, loop: 'work' });
    expect(set.loopSeconds).toBe(WORK_LOOPS.cooking.seconds);
    const frames: number[] = [];
    for (let t = 0; t < set.loopSeconds * 2; t += 1 / 12) {
      const { frame } = scootchTick(set, plan, input, t, 'scootch');
      expect(frame).toBeLessThan(set.motions.length);
      if (frames.at(-1) !== frame) frames.push(frame);
    }
    const once = Array.from({ length: set.loopFrames }, (_, i) => i);
    expect(frames).toEqual([...once, ...once]);
  });

  it('shows the shut frame during a blink and a glance frame during a glance', () => {
    const input = { ...base, mood: 'bargaining' as const };
    const plan = scootchMotionPlan(input);
    const set = scootchFrameSet(input, plan);
    expect(set.motions).toHaveLength(4);
    const seen = new Set<number>();
    for (let t = 0; t < 240; t += 1 / 12)
      seen.add(scootchTick(set, plan, input, t, 'scootch').frame);
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
    // Each frame is a different drawing: open, shut, looking left, looking right.
    const props = {
      mood: input.mood,
      attitude: 'cheeky',
      workMode: null,
      reducedMotion: false,
    } as const;
    const drawings = set.motions.map((motion) => buildScootch(props, motion));
    expect(uniqueLayers(drawings).layers).toHaveLength(4);
  });

  it('folds frames that draw the same into one layer', () => {
    const input = { ...base, mood: 'asleep' as const };
    const plan = scootchMotionPlan(input);
    const set = scootchFrameSet(input, plan);
    const props = {
      mood: input.mood,
      attitude: 'cheeky',
      workMode: null,
      reducedMotion: false,
    } as const;
    const { layers, layerOf } = uniqueLayers(set.motions.map((m) => buildScootch(props, m)));
    // Eyes already shut: the blink set is the loop itself.
    expect(layers).toHaveLength(set.loopFrames);
    expect(layerOf.slice(set.loopFrames, set.loopFrames * 2)).toEqual(
      layerOf.slice(0, set.loopFrames),
    );
  });
});
