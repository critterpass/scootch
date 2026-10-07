import { describe, expect, it } from 'vitest';

import {
  attitudeSchema,
  MONSTER_BODY_TYPE_IDS,
  monsterMoodSchema,
  scootchMoodSchema,
} from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand, type Matrix } from '../core/commands';
import { BOIL_FRAMES, boilFrame, MAX_JITTER, type BoilFrame } from '../core/pen';
import { specFromSeed } from '../core/spec-from-seed';
import { buildScootch } from '../scootch/build-scootch';
import { GAZE_MOODS } from '../scootch/expression';
import { monsterIdle } from './monster-idle';
import { moodBeat } from './mood-loops';
import { WORK_LOOPS } from './work-loop';

const moods = scootchMoodSchema.options;
const attitudes = attitudeSchema.options;
const NEW_MOODS = ['scheming', 'dramatic', 'sulk', 'nudge', 'shocked'] as const;
const cheeky = { attitude: 'cheeky', workMode: null, reducedMotion: false } as const;
const TIMES = [0.05, 0.31, 0.9, 1.7, 2.6, 4.4, 9.3, 61.7, 1800.2];

/** Every number of every path, in order: two drawings of one pose differ only in these. */
function numbers(commands: readonly DrawCommand[]): number[] {
  return commands.flatMap((command) =>
    'path' in command ? command.path.flatMap((segment) => segment.slice(1) as number[]) : [],
  );
}
const shape = (commands: readonly DrawCommand[]): string =>
  commands
    .map((c) => ('path' in c ? `${c.op}:${c.path.map((segment) => segment[0]).join('')}` : c.op))
    .join('|');

/** The box everything painted falls in, with each drawing's own transforms applied. */
function painted(commands: readonly DrawCommand[]): { low: number; high: number } {
  const identity: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let m = identity;
  let low = Infinity;
  let high = -Infinity;
  const see = (x: number, y: number, r = 0): void => {
    const px = m[0] * x + m[2] * y + m[4];
    const py = m[1] * x + m[3] * y + m[5];
    low = Math.min(low, px - r, py - r);
    high = Math.max(high, px + r, py + r);
  };
  for (const command of commands) {
    if (command.op === 'save') stack.push(m);
    else if (command.op === 'restore') m = stack.pop() ?? identity;
    else if (command.op === 'transform') {
      const [a, b, c, d, e, f] = command.matrix;
      m = [
        m[0] * a + m[2] * b,
        m[1] * a + m[3] * b,
        m[0] * c + m[2] * d,
        m[1] * c + m[3] * d,
        m[0] * e + m[2] * f + m[4],
        m[1] * e + m[3] * f + m[5],
      ];
    } else if (command.op === 'fill' || command.op === 'stroke') {
      // The grain of a printed body is clipped to the body: it paints nothing outside it.
      if (command.path.every((segment) => segment[0] === 'O')) continue;
      const half = command.op === 'stroke' ? command.width / 2 : 0;
      for (const segment of command.path) {
        if (segment[0] === 'O') see(segment[1], segment[2], segment[3]);
        else if (segment[0] === 'Q') see(segment[3], segment[4], half);
        else if (segment[0] !== 'Z') see(segment[1], segment[2], half);
      }
    }
  }
  return { low, high };
}

/** The lids of a drawing: the straight-edged fills that close over an eye. */
function lidHeights(commands: readonly DrawCommand[]): number[] {
  return commands.flatMap((command) => {
    if (command.op !== 'fill' || command.path.length !== 5) return [];
    if (command.path.some((segment) => segment[0] === 'Q' || segment[0] === 'O')) return [];
    const ys = command.path.flatMap((segment) => (segment[0] === 'Z' ? [] : [segment[2]]));
    return [Math.max(...ys) - Math.min(...ys)];
  });
}

describe('line boil', () => {
  it('cycles three stroke sets four times a second, starting on the still', () => {
    expect(boilFrame(0)).toBe(0);
    expect([0.1, 0.26, 0.51, 0.76, 1.01].map(boilFrame)).toEqual([0, 1, 2, 0, 1]);
    for (let t = 0; t < 50; t += 0.137) expect(boilFrame(t)).toBeLessThan(BOIL_FRAMES);
  });

  it('keeps frame 0 as the still and moves the other two within the wobble of the pen', () => {
    const drawings: ((boil?: BoilFrame) => DrawCommand[])[] = [
      ...moods.map(
        (mood) => (boil?: BoilFrame) =>
          buildScootch({ ...cheeky, mood }, {}, boil === undefined ? {} : { boil }),
      ),
      ...MONSTER_BODY_TYPE_IDS.map(
        (bodyType) => (boil?: BoilFrame) =>
          buildMonster(specFromSeed(bodyType, 'boil'), 1, boil === undefined ? {} : { boil }),
      ),
    ];
    for (const draw of drawings) {
      const still = draw();
      expect(draw(0)).toEqual(still);
      const base = numbers(still);
      for (const boil of [1, 2] as const) {
        const boiled = draw(boil);
        expect(boiled).not.toEqual(still);
        // The same shapes in the same order: only where the pen wandered differs.
        expect(shape(boiled)).toBe(shape(still));
        const moved = numbers(boiled).map((value, i) => Math.abs(value - base[i]!));
        expect(Math.max(...moved)).toBeLessThanOrEqual(2 * MAX_JITTER + 1e-9);
      }
      expect(draw(1)).not.toEqual(draw(2));
    }
  });

  it('does not boil under Reduce Motion', () => {
    const props = { ...cheeky, mood: 'waiting', reducedMotion: true } as const;
    expect(buildScootch(props, {}, { boil: 2 })).toEqual(buildScootch(props));
  });
});

describe('poses that move', () => {
  it('rests every mood at zero seconds and draws the same thing for the same moment', () => {
    for (const mood of moods) {
      for (const attitude of attitudes) {
        const props = { ...cheeky, mood, attitude };
        expect(buildScootch(props, { time: 0, beat: 0 }), mood).toEqual(buildScootch(props));
        for (const t of TIMES) {
          const motion = { time: t, beat: moodBeat(mood, t) };
          const drawing = buildScootch(props, motion);
          expect(buildScootch(props, { ...motion })).toEqual(drawing);
          expect(numbers(drawing).every(Number.isFinite), `${mood} at ${t}`).toBe(true);
        }
      }
    }
  });

  it('moves the body of every mood that has motion of its own, and only breathes when serious', () => {
    const still = (mood: (typeof moods)[number]): boolean =>
      TIMES.every(
        (t) =>
          JSON.stringify(buildScootch({ ...cheeky, mood }, { time: t })) ===
          JSON.stringify(buildScootch({ ...cheeky, mood }, { time: TIMES[0]! })),
      );
    for (const mood of moods) {
      // The curl and the outline drift for everyone but the serious mood's caller, who sends no time.
      expect(still(mood), mood).toBe(false);
    }
    // Without a clock nothing moves, whatever the beat does to the effects around it.
    expect(buildScootch({ ...cheeky, mood: 'sulk' }, {})).toEqual(
      buildScootch({ ...cheeky, mood: 'sulk' }),
    );
  });

  it('squashes a celebrating landing only once it is jumping, never in the still', () => {
    const props = { ...cheeky, mood: 'celebrating' } as const;
    // The printed body is the one fill with a shade crescent cut out of it.
    const height = (commands: readonly DrawCommand[]): number => {
      const ys = commands.flatMap((c) =>
        c.op === 'fill' && c.rule === 'evenodd'
          ? c.path.flatMap((segment) => (segment[0] === 'Q' ? [segment[4]] : []))
          : [],
      );
      return Math.max(...ys) - Math.min(...ys);
    };
    const standing = height(buildScootch(props));
    // One whole jump later it is on the ground again, flat and wide.
    const landed = height(buildScootch(props, { time: Math.PI / 5.5, beat: 0 }));
    const up = height(buildScootch(props, { time: Math.PI / 11, beat: 0.5 }));
    expect(landed).toBeLessThan(standing * 0.99);
    expect(up).toBeGreaterThan(standing);
  });

  it('keeps the five added moods inside the canvas at every attitude and moment', () => {
    for (const mood of NEW_MOODS) {
      for (const attitude of attitudes) {
        for (const t of [0, ...TIMES]) {
          const motion = { time: t, beat: moodBeat(mood, t), bob: Math.sin(t * 2) };
          for (const hat of [null, 'beret'] as const) {
            const box = painted(buildScootch({ ...cheeky, mood, attitude, hat }, motion));
            expect(box.low, `${mood}/${attitude} at ${t}`).toBeGreaterThanOrEqual(0);
            expect(box.high, `${mood}/${attitude} at ${t}`).toBeLessThanOrEqual(VIEW_SIZE);
          }
        }
      }
    }
  });

  it('wears the beret in place of the curl and leaves the bare head as it was', () => {
    const bare = buildScootch({ ...cheeky, mood: 'pleased' });
    expect(buildScootch({ ...cheeky, mood: 'pleased', hat: null })).toEqual(bare);
    const hatted = buildScootch({ ...cheeky, mood: 'pleased', hat: 'beret' });
    const colours = (commands: readonly DrawCommand[]): Set<string> =>
      new Set(commands.flatMap((c) => (c.op === 'fill' ? [c.color] : [])));
    expect(colours(hatted).has('#2C2724')).toBe(true);
    expect(colours(bare).has('#2C2724')).toBe(false);
  });

  it('turns the eyes to a point only in the moods that watch, and never in a work mode', () => {
    const look = { x: -1, y: 0.5, hold: 1 };
    for (const mood of moods) {
      const props = { ...cheeky, mood };
      const follows =
        JSON.stringify(buildScootch(props, { look })) !== JSON.stringify(buildScootch(props));
      expect(follows, mood).toBe(GAZE_MOODS.has(mood));
      expect(buildScootch(props, { look: { ...look, hold: 0 } })).toEqual(buildScootch(props));
    }
    const desk = { ...cheeky, mood: 'working', workMode: 'email' } as const;
    expect(buildScootch(desk, { look })).toEqual(buildScootch(desk));
  });

  it('runs every work mode value at three times a second or slower, in a loop of four seconds or more', () => {
    for (const [mode, loop] of Object.entries(WORK_LOOPS)) {
      expect(loop.seconds, mode).toBeGreaterThanOrEqual(4);
      for (const track of Object.values(loop.tracks)) {
        if ('turns' in track) expect(track.turns / loop.seconds, mode).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('monsters alive', { timeout: 60_000 }, () => {
  const seeds = ['the tax return', 'call the dentist', 'reply to Sam', 'bins'];

  it('keeps the still at zero seconds, whatever the body', () => {
    for (const bodyType of MONSTER_BODY_TYPE_IDS) {
      const spec = specFromSeed(bodyType, 'rest');
      expect(buildMonster(spec, 1, { mood: 'idle', t: 0, boil: 0 })).toEqual(buildMonster(spec));
    }
  });

  it('builds every body in every mood at every moment, inside the canvas, the same each time', () => {
    for (const bodyType of MONSTER_BODY_TYPE_IDS) {
      for (const seed of seeds) {
        const spec = specFromSeed(bodyType, seed);
        for (const mood of monsterMoodSchema.options) {
          for (const t of [0, ...TIMES]) {
            const drawing = buildMonster(spec, 1, { mood, t });
            expect(buildMonster(spec, 1, { mood, t })).toEqual(drawing);
            const box = painted(drawing);
            expect(box.low, `${bodyType} ${mood} at ${t}`).toBeGreaterThanOrEqual(0);
            expect(box.high, `${bodyType} ${mood} at ${t}`).toBeLessThanOrEqual(VIEW_SIZE);
          }
        }
      }
    }
  });

  it('moves every body while it idles', () => {
    for (const bodyType of MONSTER_BODY_TYPE_IDS) {
      const spec = specFromSeed(bodyType, 'alive');
      expect(buildMonster(spec, 1, { t: 1.3 }), bodyType).not.toEqual(buildMonster(spec));
    }
  });

  it('shuts the lids when the idle blinks', () => {
    const spec = {
      ...specFromSeed('envelope', 'blink'),
      eyes: { count: 2, style: 'matched' },
    } as const;
    let shut = 0;
    for (let t = 0; t < 30 && shut === 0; t += 0.01) {
      if (monsterIdle(t, spec.seed).blink === 1) shut = t;
    }
    expect(shut).toBeGreaterThan(0);
    const open = Math.max(...lidHeights(buildMonster(spec)));
    const blinking = Math.max(...lidHeights(buildMonster(spec, 1, { t: shut })));
    expect(blinking).toBeGreaterThan(open * 1.5);
  });

  it('shakes, sweats and stares when nervous; sleeps without legs or lids when caught', () => {
    const spec = { ...specFromSeed('phone', 'moods'), legs: 'stick' } as const;
    const fills = (commands: readonly DrawCommand[], colour: string): number =>
      commands.filter((c) => c.op === 'fill' && c.color === colour).length;
    const idle = buildMonster(spec, 1, { t: 0.7 });
    const nervous = buildMonster(spec, 1, { mood: 'nervous', t: 0.7 });
    const caught = buildMonster(spec, 1, { mood: 'caught', t: 0.7 });
    expect(fills(nervous, '#9FC4DE')).toBe(1);
    expect(fills(idle, '#9FC4DE')).toBe(0);
    // Wide eyes have no lid over them; shut eyes have no white at all.
    expect(lidHeights(nervous)).toEqual([]);
    expect(fills(caught, '#FFFCF7')).toBeLessThan(fills(idle, '#FFFCF7'));
    expect(caught.length).toBeLessThan(idle.length);
    // The drifting letter can be left out in a crowd.
    const quiet = buildMonster(spec, 1, { mood: 'caught', t: 0.7, quiet: true });
    expect(quiet.length).toBe(caught.length - 1);
  });
});
