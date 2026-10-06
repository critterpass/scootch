import { describe, expect, it } from 'vitest';

import { WORK_MODE_IDS, type ScootchProps, type WorkMode } from '@scootch/domain';

import { buildScootch } from './build-scootch';
import { WORK_MODE_ATTACHMENTS } from './work-mode-attachment';

const working = { mood: 'working', attitude: 'cheeky', reducedMotion: false } as const;
const drawing = (workMode: WorkMode | null): string =>
  JSON.stringify(buildScootch({ ...working, workMode }));

describe('work modes', () => {
  it('has exactly one attachment per mode of the contract', () => {
    expect(Object.keys(WORK_MODE_ATTACHMENTS).sort()).toEqual([...WORK_MODE_IDS].sort());
  });

  it('draws every mode differently from the plain working pose and from every other mode', () => {
    const plain = drawing(null);
    const drawings = WORK_MODE_IDS.map((workMode) => {
      expect(buildScootch({ ...working, workMode }).length, workMode).toBeGreaterThan(20);
      return drawing(workMode);
    });
    expect(drawings).not.toContain(plain);
    expect(new Set(drawings).size).toBe(WORK_MODE_IDS.length);
  });

  it('gives identical commands for the same props', () => {
    for (const workMode of WORK_MODE_IDS) {
      const motion = { blink: 0.3, beat: 0.4, work: { ...WORK_MODE_ATTACHMENTS[workMode].rest } };
      expect(buildScootch({ ...working, workMode }, motion), workMode).toEqual(
        buildScootch({ ...working, workMode }, { ...motion }),
      );
    }
  });

  it('draws the plain working pose when the mode is missing or unknown', () => {
    const plain = buildScootch({ ...working, workMode: null });
    expect(plain.length).toBeGreaterThan(20);
    const unknown = { ...working, workMode: 'juggling' } as unknown as ScootchProps;
    expect(buildScootch(unknown)).toEqual(plain);
    const absent = { ...working } as unknown as ScootchProps;
    expect(buildScootch(absent)).toEqual(plain);
  });

  it('ignores a work mode outside the working mood', () => {
    const waiting = { mood: 'waiting', attitude: 'cheeky', reducedMotion: false } as const;
    expect(buildScootch({ ...waiting, workMode: 'laundry' })).toEqual(
      buildScootch({ ...waiting, workMode: null }),
    );
  });

  it('moves with its loop values and returns the still under Reduce Motion', () => {
    for (const workMode of WORK_MODE_IDS) {
      const rest = WORK_MODE_ATTACHMENTS[workMode].rest;
      const moved = Object.fromEntries(
        Object.entries(rest).map(([name, value]) => [
          name,
          value > 0.5 ? value - 0.35 : value + 0.35,
        ]),
      );
      const still = buildScootch({ ...working, workMode });
      expect(buildScootch({ ...working, workMode }, { work: rest }), workMode).toEqual(still);
      expect(buildScootch({ ...working, workMode }, { work: moved }), workMode).not.toEqual(still);
      expect(
        buildScootch({ ...working, workMode, reducedMotion: true }, { work: moved, beat: 0.5 }),
        workMode,
      ).toEqual(still);
    }
  });
});
