import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  attitudeSchema,
  MONSTER_BODY_TYPE_IDS,
  scootchMoodSchema,
  WORK_MODE_IDS,
} from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { hash } from '../core/rng';
import { specFromSeed } from '../core/spec-from-seed';
import { buildScootch } from '../scootch/build-scootch';
import { WORK_MODE_ATTACHMENTS } from '../scootch/work-mode-attachment';
import {
  EGG_WOBBLE_DEGREES,
  EGG_WOBBLE_SECONDS,
  eggWobble,
  HATCH_POP_SECONDS,
  hatchPop,
  SHRINK_REACTION_SECONDS,
  SHRINK_SECONDS,
  shrinkStep,
} from './entrances';
import { MONSTER_SWAY_RADIANS, monsterIdle } from './monster-idle';
import { MOOD_LOOP_SECONDS, moodBeat } from './mood-loops';
import { MONSTER_REST_PINS, MOOD_REST_PINS, WORK_MODE_REST_PINS } from './rest-frame-pins';
import { scootchBreath, scootchIdle } from './scootch-idle';
import { WORK_LOOPS, workLoop, workLoopAt } from './work-loop';

const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

const moods = scootchMoodSchema.options;
const working = { mood: 'working', attitude: 'cheeky', reducedMotion: false } as const;

/** Seeded samples: times across a fifty-minute session and a handful of seeds. */
const SAMPLES = 400;
const timeAt = (i: number): number => hash(i * 17 + 3) * 3000;
const seedAt = (i: number): string => `seed-${Math.floor(hash(i * 29 + 5) * 40)}`;
const between = (value: number, low: number, high: number): boolean =>
  Number.isFinite(value) && value >= low && value <= high;

describe('rest frames', () => {
  it('leaves the still of every mood as it was', () => {
    for (const mood of moods) {
      for (const attitude of attitudeSchema.options) {
        const props = { mood, attitude, workMode: null, reducedMotion: false } as const;
        expect(digest(buildScootch(props)), `${mood}/${attitude}`).toBe(
          MOOD_REST_PINS[`${mood}/${attitude}`],
        );
        // The loop at time zero is the same drawing.
        const idle = scootchIdle(0, 'scootch');
        expect(buildScootch(props, { ...idle, beat: moodBeat(mood, 0) })).toEqual(
          buildScootch(props),
        );
      }
    }
  });

  it('leaves the still of every work mode as it was, and starts each loop on it', () => {
    for (const workMode of WORK_MODE_IDS) {
      const still = buildScootch({ ...working, workMode });
      expect(digest(still), workMode).toBe(WORK_MODE_REST_PINS[workMode]);
      expect(buildScootch({ ...working, workMode }, { work: workLoop(workMode, 0) })).toEqual(
        still,
      );
    }
  });

  it('leaves the still of every monster body as it was', () => {
    for (const bodyType of MONSTER_BODY_TYPE_IDS) {
      const drawing = buildMonster(specFromSeed(bodyType, `rest-${bodyType}`));
      expect(digest(drawing), bodyType).toBe(MONSTER_REST_PINS[bodyType]);
    }
  });
});

describe('motion loops over time and seeds', { timeout: 60_000 }, () => {
  it("rests Scootch's idle at zero, keeps it in range and repeats it for a seed", () => {
    expect(scootchIdle(0, 'any')).toEqual({ bob: 0, blink: 0, gazeX: 0, gazeY: -0 });
    expect(scootchBreath(0)).toBe(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = timeAt(i);
      const seed = seedAt(i);
      const idle = scootchIdle(t, seed);
      expect(scootchIdle(t, seed)).toEqual(idle);
      expect(between(idle.bob, -1, 1), `bob at ${t}`).toBe(true);
      expect(between(idle.blink, 0, 1), `blink at ${t}`).toBe(true);
      expect(between(idle.gazeX, -1, 1) && between(idle.gazeY, -1, 1), `gaze at ${t}`).toBe(true);
      expect(scootchBreath(t)).toBe(idle.bob);
    }
  });

  it('blinks at uneven intervals, differently for each seed, and never holds the eyes shut', () => {
    const starts = (seed: string): number[] => {
      const found: number[] = [];
      let shut = false;
      for (let t = 0; t < 120; t += 0.01) {
        const now = scootchIdle(t, seed).blink > 0;
        if (now && !shut) found.push(Math.round(t * 100) / 100);
        shut = now;
      }
      return found;
    };
    const first = starts('one');
    expect(first.length).toBeGreaterThan(20);
    expect(first.length).toBeLessThan(50);
    const gaps = first.slice(1).map((start, i) => start - first[i]!);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(0.5);
    expect(starts('two')).not.toEqual(first);
    // A glance happens, and not all the time.
    const glancing = Array.from({ length: 6000 }, (_, i) => scootchIdle(i / 10, 'one').gazeX !== 0);
    const share = glancing.filter(Boolean).length / glancing.length;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(0.25);
  });

  it('runs every mood loop from zero, within 0 to 1, repeating on its own length', () => {
    for (const mood of moods) {
      expect(moodBeat(mood, 0), mood).toBe(0);
      const seconds = MOOD_LOOP_SECONDS[mood];
      for (let i = 0; i < SAMPLES; i++) {
        const t = timeAt(i);
        const beat = moodBeat(mood, t);
        expect(beat >= 0 && beat < 1, `${mood} at ${t}`).toBe(true);
        if (seconds === undefined) expect(beat).toBe(0);
        else expect(moodBeat(mood, t + seconds)).toBeCloseTo(beat, 6);
      }
    }
    // The serious mood has no loop of its own.
    expect(MOOD_LOOP_SECONDS.serious).toBeUndefined();
  });

  it('drives exactly the values each work mode names, from rest, in range and periodic', () => {
    for (const mode of WORK_MODE_IDS) {
      const rest = WORK_MODE_ATTACHMENTS[mode].rest;
      const loop = WORK_LOOPS[mode];
      expect(Object.keys(loop.tracks).sort(), mode).toEqual(Object.keys(rest).sort());
      const start = workLoop(mode, 0);
      for (const [name, value] of Object.entries(rest)) {
        expect(start[name], `${mode}.${name}`).toBeCloseTo(value, 12);
      }
      for (let i = 0; i < SAMPLES; i++) {
        const t = timeAt(i);
        const values = workLoop(mode, t);
        expect(workLoop(mode, t)).toEqual(values);
        const again = workLoop(mode, t + loop.seconds);
        for (const [name, track] of Object.entries(loop.tracks)) {
          const value = values[name]!;
          const low = track.kind === 'swing' ? -1 : 0;
          expect(between(value, low, 1), `${mode}.${name} at ${t}`).toBe(true);
          // A value that wraps from 1 to 0 is the same place in its loop.
          const apart = Math.abs(again[name]! - value);
          expect(Math.min(apart, 1 - apart), `${mode}.${name} period`).toBeLessThan(1e-6);
        }
        // Every frame of the loop is a drawing the builder accepts.
        expect(
          buildScootch({ ...working, workMode: mode }, { work: values }).length,
        ).toBeGreaterThan(20);
      }
    }
  });

  it('closes every swinging and lifting value: the end of a loop meets its start', () => {
    for (const mode of WORK_MODE_IDS) {
      const start = workLoopAt(mode, 0);
      const end = workLoopAt(mode, 1 - 1e-9);
      for (const [name, track] of Object.entries(WORK_LOOPS[mode].tracks)) {
        if (track.kind === 'cycle' || track.kind === 'fill') continue;
        expect(end[name], `${mode}.${name}`).toBeCloseTo(start[name]!, 5);
      }
    }
  });

  it("rests a monster's idle at zero, keeps it small and repeats it for a seed", () => {
    expect(monsterIdle(0, 'any')).toEqual({ bob: 0, sway: 0, blink: 0 });
    expect(monsterIdle(0, 'any', true)).toEqual({ bob: 0, sway: 0, blink: 0 });
    for (let i = 0; i < SAMPLES; i++) {
      const t = timeAt(i);
      const seed = seedAt(i);
      const hover = i % 2 === 0;
      const idle = monsterIdle(t, seed, hover);
      expect(monsterIdle(t, seed, hover)).toEqual(idle);
      expect(between(idle.bob, hover ? -4 : -2, hover ? 4 : 2), `bob at ${t}`).toBe(true);
      expect(between(idle.sway, -MONSTER_SWAY_RADIANS, MONSTER_SWAY_RADIANS)).toBe(true);
      expect(between(idle.blink, 0, 1)).toBe(true);
    }
    expect(monsterIdle(7, 'one')).not.toEqual(monsterIdle(7, 'two'));
  });

  it('wobbles the egg from upright, within its tilt, once per wobble', () => {
    expect(eggWobble(0)).toBe(0);
    for (let i = 0; i < SAMPLES; i++) {
      const t = timeAt(i);
      expect(between(eggWobble(t), -EGG_WOBBLE_DEGREES, EGG_WOBBLE_DEGREES)).toBe(true);
      expect(eggWobble(t + EGG_WOBBLE_SECONDS)).toBeCloseTo(eggWobble(t), 6);
    }
  });

  it('pops a hatched monster in from nothing and settles at full size', () => {
    expect(hatchPop(0).scale).toBeCloseTo(0, 12);
    expect(hatchPop(0).opacity).toBe(0);
    expect(hatchPop(HATCH_POP_SECONDS)).toEqual({ scale: 1, opacity: 1 });
    expect(hatchPop(60)).toEqual({ scale: 1, opacity: 1 });
    let top = 0;
    for (let t = 0; t <= HATCH_POP_SECONDS; t += 0.005) {
      const pop = hatchPop(t);
      expect(between(pop.scale, -1e-9, 1.12) && between(pop.opacity, 0, 1)).toBe(true);
      top = Math.max(top, pop.scale);
    }
    // It goes a little past full size before it settles.
    expect(top).toBeGreaterThan(1.05);
  });

  it('shrinks a monster to its new size, reacts once and settles', () => {
    expect(shrinkStep(0)).toEqual({ progress: 0, squashX: 1, squashY: 1 });
    const settled = shrinkStep(SHRINK_SECONDS + SHRINK_REACTION_SECONDS);
    expect(settled.progress).toBe(1);
    expect(settled.squashX).toBeCloseTo(1, 12);
    expect(settled.squashY).toBeCloseTo(1, 12);
    let last = 0;
    let squashed = 1;
    for (let t = 0; t <= 1.2; t += 0.01) {
      const step = shrinkStep(t);
      expect(step.progress).toBeGreaterThanOrEqual(last);
      expect(between(step.squashX, 0.9, 1.1) && between(step.squashY, 0.85, 1.15)).toBe(true);
      last = step.progress;
      squashed = Math.min(squashed, step.squashY);
    }
    expect(squashed).toBeLessThan(0.95);
  });
});
