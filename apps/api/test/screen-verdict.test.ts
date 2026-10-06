import { describe, expect, it } from 'vitest';

import { screenResponse, screenVerdict } from '../src/ai/screen-input';

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
  ] as const)('%o is %s', (probabilities, verdict) => {
    expect(screenVerdict(probabilities)).toBe(verdict);
  });

  it('flags low confidence when caution, not likelihood, chose the verdict', () => {
    const cautious = screenResponse({
      answer: {
        choice: 'pass',
        probabilities: { pass: 0.85, serious: 0.03, crisis: 0.12 },
        confidence: 0.7,
      },
      answeredBy: 'jev',
      model: 'jev-1.13.0',
    });
    expect(cautious).toEqual({
      verdict: 'crisis',
      confidence: 0.85,
      lowConfidence: true,
      answeredBy: 'jev',
    });

    const plain = screenResponse({
      answer: {
        choice: 'pass',
        probabilities: { pass: 0.99, serious: 0.01, crisis: 0 },
        confidence: 0.98,
      },
      answeredBy: 'fallback',
      model: 'deepseek-flash',
    });
    expect(plain).toEqual({
      verdict: 'pass',
      confidence: 0.99,
      lowConfidence: false,
      answeredBy: 'fallback',
    });
  });
});
