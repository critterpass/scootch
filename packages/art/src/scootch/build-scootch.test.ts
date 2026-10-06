import { describe, expect, it } from 'vitest';

import { attitudeSchema, scootchMoodSchema, scootchPropsSchema } from '@scootch/domain';

import { buildScootch, SCOOTCH_MOODS } from './build-scootch';

const moods = scootchMoodSchema.options;
const attitudes = attitudeSchema.options;

describe('buildScootch', () => {
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

  it('draws the plain working pose for every work mode until one attaches', () => {
    const props = { mood: 'working', attitude: 'cheeky', reducedMotion: false } as const;
    expect(buildScootch({ ...props, workMode: 'email' })).toEqual(
      buildScootch({ ...props, workMode: null }),
    );
  });

  it('has the contract reject an unknown mood', () => {
    const props = { mood: 'waiting', attitude: 'soft', workMode: null, reducedMotion: false };
    expect(scootchPropsSchema.safeParse(props).success).toBe(true);
    expect(scootchPropsSchema.safeParse({ ...props, mood: 'furious' }).success).toBe(false);
  });
});
