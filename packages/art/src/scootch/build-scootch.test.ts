import { describe, expect, it } from 'vitest';

import { attitudeSchema, scootchMoodSchema, scootchPropsSchema } from '@scootch/domain';

import { buildScootch, SCOOTCH_MOODS } from './build-scootch';

const moods = scootchMoodSchema.options;
const attitudes = attitudeSchema.options;

describe('buildScootch', () => {
  it('can draw the confetti behind Scootch instead of over him', () => {
    const props = {
      mood: 'celebrating',
      attitude: 'cheeky',
      workMode: null,
      reducedMotion: false,
    } as const;
    // A piece of confetti is the one stroke 3.2 wide.
    const pieces = (commands: ReturnType<typeof buildScootch>): number[] =>
      commands.flatMap((command, index) =>
        command.op === 'stroke' && command.width === 3.2 ? [index] : [],
      );
    const over = buildScootch(props);
    const behind = buildScootch(props, undefined, { confettiBehind: true });

    expect(pieces(over).length).toBeGreaterThan(0);
    expect(pieces(behind)).toHaveLength(pieces(over).length);
    expect(Math.max(...pieces(behind))).toBeLessThan(Math.min(...pieces(over)));
    // Nothing else about the drawing changes: the count and kinds of commands are the same.
    expect(behind.map((command) => command.op).sort()).toEqual(
      over.map((command) => command.op).sort(),
    );
  });

  it('can leave out what floats around him, and nothing else', () => {
    const asleep = {
      mood: 'asleep',
      attitude: 'cheeky',
      workMode: null,
      reducedMotion: true,
    } as const;
    // A sleep mark is a stroke 2.4 wide in the marks' ink.
    const marks = (commands: ReturnType<typeof buildScootch>) =>
      commands.filter((command) => command.op === 'stroke' && command.width === 2.4);
    const withMarks = buildScootch(asleep);
    const without = buildScootch(asleep, undefined, { withoutEffects: true });
    expect(marks(withMarks)).toHaveLength(3);
    expect(marks(without)).toHaveLength(0);
    expect(without).toEqual(withMarks.filter((command) => !marks(withMarks).includes(command)));
    // The desk is part of him, not something floating: it stays.
    const working = { ...asleep, mood: 'working' } as const;
    expect(buildScootch(working, undefined, { withoutEffects: true })).toEqual(
      buildScootch(working),
    );
  });

  it('draws every mood of the contract at every attitude, moving and still', () => {
    expect(Object.keys(SCOOTCH_MOODS).sort()).toEqual([...moods].sort());
    for (const mood of moods) {
      for (const attitude of attitudes) {
        for (const reducedMotion of [false, true]) {
          const props = { mood, attitude, workMode: null, reducedMotion };
          expect(buildScootch(props).length, `${mood} ${attitude}`).toBeGreaterThan(20);
        }
      }
    }
  });

  it('gives identical commands for the same props', () => {
    for (const mood of moods) {
      const props = { mood, attitude: 'unhinged', workMode: null, reducedMotion: false } as const;
      const motion = { blink: 0.4, bob: -0.5, gazeX: 0.3, beat: 0.25 };
      expect(buildScootch(props, motion)).toEqual(buildScootch({ ...props }, { ...motion }));
    }
  });

  it('acts differently at each attitude, except when serious', () => {
    const drawing = (mood: (typeof moods)[number], attitude: (typeof attitudes)[number]): string =>
      JSON.stringify(buildScootch({ mood, attitude, workMode: null, reducedMotion: false }));
    for (const mood of moods) {
      const distinct = new Set(attitudes.map((attitude) => drawing(mood, attitude))).size;
      expect(distinct, mood).toBe(mood === 'serious' ? 1 : 3);
    }
  });

  it('ignores the animation values under Reduce Motion', () => {
    const props = { mood: 'celebrating', attitude: 'cheeky', workMode: null } as const;
    const motion = { blink: 1, bob: 1, gazeX: 1, gazeY: 1, beat: 0.5 };
    const still = buildScootch({ ...props, reducedMotion: true }, motion);
    expect(still).toEqual(buildScootch({ ...props, reducedMotion: true }));
    expect(still).toEqual(buildScootch({ ...props, reducedMotion: false }));
    expect(buildScootch({ ...props, reducedMotion: false }, motion)).not.toEqual(still);
  });

  it('draws the paper tone as the same Scootch in other colours', () => {
    const colours = (commands: ReturnType<typeof buildScootch>): Set<string> =>
      new Set(commands.flatMap((c) => (c.op === 'fill' || c.op === 'stroke' ? [c.color] : [])));
    for (const mood of moods) {
      const props = { mood, attitude: 'cheeky', workMode: null, reducedMotion: false } as const;
      const tomato = buildScootch(props);
      const paper = buildScootch(props, undefined, { tone: 'paper' });
      // Naming the tomato tone changes nothing, so every pinned drawing stays as it was.
      expect(buildScootch(props, undefined, { tone: 'tomato', ground: 'light' })).toEqual(tomato);
      // Same shapes in the same order; only colours differ.
      expect(paper.map((c) => ('path' in c ? c.path : c.op))).toEqual(
        tomato.map((c) => ('path' in c ? c.path : c.op)),
      );
      expect(colours(paper).has('#FBF8F2'), mood).toBe(true);
      expect(colours(paper).has('#C63F22'), mood).toBe(false);
    }
    // The confetti stays tomato on a paper Scootch, and the desk line stays ink.
    const party = { attitude: 'cheeky', workMode: null, reducedMotion: false } as const;
    const pieces = buildScootch({ ...party, mood: 'celebrating' }, undefined, { tone: 'paper' });
    expect(pieces.some((c) => c.op === 'stroke' && c.width === 3.2 && c.color === '#F0562E')).toBe(
      true,
    );
    const desk = buildScootch({ ...party, mood: 'working' }, undefined, { tone: 'paper' });
    expect(desk.some((c) => c.op === 'stroke' && c.width === 2.6 && c.color === '#1C1A17')).toBe(
      true,
    );
  });

  it('turns the marks around a tomato Scootch light on a dark ground', () => {
    const props = { attitude: 'cheeky', workMode: null, reducedMotion: false } as const;
    const dark = buildScootch({ ...props, mood: 'asleep' }, undefined, { ground: 'dark' });
    expect(dark.some((c) => c.op === 'stroke' && c.color === '#F6F3EE')).toBe(true);
    expect(dark.some((c) => c.op === 'fill' && c.color === '#F0562E')).toBe(true);
  });

  it('has the contract reject an unknown mood', () => {
    const props = { mood: 'waiting', attitude: 'soft', workMode: null, reducedMotion: false };
    expect(scootchPropsSchema.safeParse(props).success).toBe(true);
    expect(scootchPropsSchema.safeParse({ ...props, mood: 'furious' }).success).toBe(false);
  });
});
