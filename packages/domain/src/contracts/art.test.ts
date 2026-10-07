import { describe, expect, it } from 'vitest';

import { CARD_FINISH_IDS, cardFinishSchema, RETIRED_CARD_FINISHES } from './art';

describe('the card finish contract', () => {
  it('reads every finish of today as itself', () => {
    for (const finish of CARD_FINISH_IDS) expect(cardFinishSchema.parse(finish)).toBe(finish);
  });

  it('reads a finish that is gone as its nearest material, and never refuses it', () => {
    expect(cardFinishSchema.parse('standard')).toBe('paper');
    expect(cardFinishSchema.parse('kraft')).toBe('paper');
    expect(cardFinishSchema.parse('gold')).toBe('holo');
    expect(cardFinishSchema.parse('night')).toBe('flock');
    for (const [retired, now] of Object.entries(RETIRED_CARD_FINISHES)) {
      expect(CARD_FINISH_IDS).not.toContain(retired);
      expect(CARD_FINISH_IDS).toContain(now);
    }
  });

  it('refuses a finish nobody ever made', () => {
    expect(cardFinishSchema.safeParse('velour').success).toBe(false);
    expect(cardFinishSchema.safeParse('constructor').success).toBe(false);
    expect(cardFinishSchema.safeParse(null).success).toBe(false);
  });
});
