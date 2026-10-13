import { describe, expect, it } from '@jest/globals';

import { TRAIL_IDS } from '../../studio/catalogue';

import { markFrame } from './burst-motion';
import { BURST_HOLD_MS, BURST_MS, burstSources, stillMarks, type BurstInks } from './burst-shapes';

const INKS: BurstInks = { ink: '#1C1A17', tomato: '#F0562E', page: '#F6F3EE', dark: false };
const KINDS = ['start', 'confetti', 'catch'] as const;

describe('a burst', () => {
  it('is over before the start screen goes quiet, in every kind and trail', () => {
    expect(BURST_MS).toBeLessThanOrEqual(BURST_HOLD_MS);
    for (const kind of KINDS) {
      for (const trail of TRAIL_IDS) {
        for (const source of burstSources(kind, INKS, trail)) {
          for (const mark of source.marks) {
            expect(mark.delay + mark.life).toBeLessThanOrEqual(BURST_MS);
            expect(markFrame(mark, mark.life)).toEqual({ opacity: 0 });
          }
        }
      }
    }
  });

  it('moves no more than 130 views at once, so it stays smooth on an older phone', () => {
    for (const kind of KINDS) {
      for (const trail of TRAIL_IDS) {
        const moving = burstSources(kind, INKS, trail).reduce(
          (sum, source) => sum + source.marks.length + (source.bloom ? 1 : 0),
          0,
        );
        expect(moving).toBeLessThanOrEqual(130);
      }
    }
  });

  it('is the same drawing every time', () => {
    expect(burstSources('catch', INKS, 'stardust')).toEqual(
      burstSources('catch', INKS, 'stardust'),
    );
  });

  it('starts a session in paper whatever trail is worn', () => {
    for (const trail of TRAIL_IDS) {
      expect(burstSources('start', INKS, trail)).toEqual(burstSources('start', INKS, 'confetti'));
    }
  });

  it('flashes once, softly, and never draws an outline ring', () => {
    for (const kind of KINDS) {
      const blooms = burstSources(kind, INKS).flatMap((source) =>
        source.bloom ? [source.bloom] : [],
      );
      expect(blooms).toHaveLength(1);
      expect(blooms[0]?.life).toBeLessThanOrEqual(350);
    }
  });

  it('keeps a still mark or two for each trail when nothing may move', () => {
    for (const trail of TRAIL_IDS) {
      expect(stillMarks(INKS, trail).length).toBeGreaterThan(0);
    }
  });
});
