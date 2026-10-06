import { describe, expect, it } from 'vitest';

import type { Decision } from '../src/ai/decide';
import { screenResponse, screenVerdict } from '../src/ai/screen-input';

const calm = 0.01;

describe('the care screen thresholds', () => {
  it.each([
    // An ordinary note.
    [{ pass: 1, serious: 0, crisis: 0 }, 'pass'],
    [{ pass: 0.95, serious: 0.04, crisis: 0.01 }, 'pass'],
    // The pass boundary: 0.90 passes, anything under does not.
    [{ pass: 0.9, serious: 0.05, crisis: 0.05 }, 'pass'],
    [{ pass: 0.899, serious: 0.051, crisis: 0.05 }, 'serious'],
    // The serious boundary.
    [{ pass: 0.9, serious: 0.199, crisis: 0 }, 'pass'],
    [{ pass: 0.8, serious: 0.2, crisis: 0 }, 'serious'],
    [{ pass: 0.03, serious: 0.97, crisis: 0 }, 'serious'],
    // The crisis boundary: 0.10 is a crisis even when pass is by far the likeliest.
    [{ pass: 0.9, serious: 0.001, crisis: 0.099 }, 'pass'],
    [{ pass: 0.9, serious: 0, crisis: 0.1 }, 'crisis'],
    [{ pass: 0.16, serious: 0.05, crisis: 0.79 }, 'crisis'],
    // Crisis wins over serious.
    [{ pass: 0, serious: 0.85, crisis: 0.15 }, 'crisis'],
    // Probabilities that do not add up still never pass by accident.
    [{ pass: 0.5, serious: 0, crisis: 0 }, 'serious'],
    [{ pass: 0, serious: 0, crisis: 0 }, 'serious'],
    [{ pass: Number.NaN, serious: 0, crisis: 0 }, 'serious'],
    [{ pass: 1, serious: Number.NaN, crisis: 0 }, 'serious'],
    [{ pass: 1, serious: 0, crisis: Number.NaN }, 'serious'],
  ] as const)('care %o with no sign of preparing is %s', (care, verdict) => {
    expect(screenVerdict({ care, preparing: calm })).toBe(verdict);
  });

  it.each([
    // The preparation boundary: 0.50 is a crisis whatever the care question said.
    [{ pass: 1, serious: 0, crisis: 0 }, 0.499, 'pass'],
    [{ pass: 1, serious: 0, crisis: 0 }, 0.5, 'crisis'],
    [{ pass: 0.86, serious: 0.11, crisis: 0.03 }, 0.72, 'crisis'],
    [{ pass: 0.02, serious: 0.98, crisis: 0 }, 0.5, 'crisis'],
    // It only ever adds a crisis: a calm answer lifts nothing the care question found.
    [{ pass: 0.02, serious: 0.98, crisis: 0 }, 0, 'serious'],
    [{ pass: 0.5, serious: 0.1, crisis: 0.4 }, 0, 'crisis'],
    // A number that is not a number never passes.
    [{ pass: 1, serious: 0, crisis: 0 }, Number.NaN, 'serious'],
  ] as const)('care %o with preparing %d is %s', (care, preparing, verdict) => {
    expect(screenVerdict({ care, preparing })).toBe(verdict);
  });

  it.each([
    // The preparation question went unanswered: a crisis stands, a pass is not earned.
    [{ pass: 1, serious: 0, crisis: 0 }, null, 'serious'],
    [{ pass: 0.03, serious: 0.97, crisis: 0 }, null, 'serious'],
    [{ pass: 0.5, serious: 0.1, crisis: 0.4 }, null, 'crisis'],
    // The care question went unanswered: the preparation question can still call a crisis.
    [null, 0, 'serious'],
    [null, 0.499, 'serious'],
    [null, 0.5, 'crisis'],
    // Neither answered.
    [null, null, 'serious'],
  ] as const)('care %o with preparing %o is %s, never pass', (care, preparing, verdict) => {
    expect(screenVerdict({ care, preparing })).toBe(verdict);
  });
});

describe('the care screen response', () => {
  const care = (
    probabilities: { pass: number; serious: number; crisis: number },
    answeredBy: 'jev' | 'fallback' = 'jev',
  ): Decision<'pass' | 'serious' | 'crisis'> => ({
    answer: {
      choice: (Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'pass') as
        'pass' | 'serious' | 'crisis',
      probabilities,
      confidence: 0.7,
    },
    answeredBy,
    model: answeredBy === 'jev' ? 'jev-1.13.0' : 'deepseek-flash',
  });
  const preparation = (
    yes: number,
    answeredBy: 'jev' | 'fallback' = 'jev',
  ): Decision<'no' | 'yes'> => ({
    answer: {
      choice: yes >= 0.5 ? 'yes' : 'no',
      probabilities: { no: 1 - yes, yes },
      confidence: 0.7,
    },
    answeredBy,
    model: answeredBy === 'jev' ? 'jev-1.13.0' : 'deepseek-flash',
  });

  it('flags low confidence when caution, not likelihood, chose the verdict', () => {
    expect(
      screenResponse(care({ pass: 0.85, serious: 0.03, crisis: 0.12 }), preparation(0)),
    ).toEqual({ verdict: 'crisis', confidence: 0.85, lowConfidence: true, answeredBy: 'jev' });
    expect(
      screenResponse(care({ pass: 0.99, serious: 0.01, crisis: 0 }, 'fallback'), preparation(0)),
    ).toEqual({ verdict: 'pass', confidence: 0.99, lowConfidence: false, answeredBy: 'fallback' });
  });

  it('answers crisis when only the preparation question sees one', () => {
    expect(
      screenResponse(care({ pass: 0.86, serious: 0.11, crisis: 0.03 }), preparation(0.72)),
    ).toEqual({ verdict: 'crisis', confidence: 0.86, lowConfidence: true, answeredBy: 'jev' });
  });

  it('holds back a pass the preparation question could not confirm', () => {
    expect(screenResponse(care({ pass: 0.99, serious: 0.01, crisis: 0 }), null)).toEqual({
      verdict: 'serious',
      confidence: 0.99,
      lowConfidence: true,
      answeredBy: 'jev',
    });
  });

  it('answers from the preparation question alone when the care question is silent', () => {
    expect(screenResponse(null, preparation(0.9, 'fallback'))).toEqual({
      verdict: 'crisis',
      confidence: 0.9,
      lowConfidence: false,
      answeredBy: 'fallback',
    });
    expect(screenResponse(null, preparation(0.02))).toEqual({
      verdict: 'serious',
      confidence: 0.98,
      lowConfidence: true,
      answeredBy: 'jev',
    });
  });

  it('answers the unscreened default when neither question was answered', () => {
    expect(screenResponse(null, null)).toEqual({
      verdict: 'serious',
      confidence: 0,
      lowConfidence: true,
      answeredBy: 'default',
      reason: 'unscreened',
    });
  });
});
