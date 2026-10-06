import { describe, expect, it } from 'vitest';

import type { Decision } from '../src/ai/decide';
import { screenOutcome, stricterVerdict, type ScreenView } from '../src/ai/screen-input';

type Judge = 'jev' | 'fallback';

function decision<Option extends string>(
  answeredBy: Judge,
  probabilities: Record<Option, number>,
): Decision<Option> {
  const options = Object.keys(probabilities) as Option[];
  const choice = options.reduce((best, option) =>
    probabilities[option] > probabilities[best] ? option : best,
  );
  return {
    answer: { choice, probabilities, confidence: probabilities[choice] },
    answeredBy,
    model: answeredBy === 'jev' ? 'jev-1.13.0' : 'deepseek-flash',
  };
}

const calm = { pass: 0.97, serious: 0.02, crisis: 0.01 };
const heavy = { pass: 0.05, serious: 0.93, crisis: 0.02 };
const danger = { pass: 0.3, serious: 0.1, crisis: 0.6 };

function view(
  care: Judge,
  careSays: typeof calm,
  preparation: Judge,
  preparing = 0.02,
): ScreenView {
  return {
    care: decision(care, careSays),
    preparation: decision(preparation, { no: 1 - preparing, yes: preparing }),
  };
}

describe('the screen verdict by who judged', () => {
  it('lets Jev alone clear a text', () => {
    expect(screenOutcome([view('jev', calm, 'jev')])).toEqual({
      verdict: 'pass',
      confidence: 0.97,
      lowConfidence: false,
      answeredBy: 'jev',
    });
  });

  it('never clears a text the fallback alone judged: its pass is serious and unscreened', () => {
    expect(screenOutcome([view('fallback', calm, 'fallback')])).toEqual({
      verdict: 'serious',
      confidence: 0.97,
      lowConfidence: true,
      answeredBy: 'fallback',
      reason: 'unscreened',
    });
  });

  it.each([
    ['the care question', 'fallback', 'jev'],
    ['the preparation question', 'jev', 'fallback'],
  ] as const)('holds a pass back when the fallback answered only %s', (_, care, preparation) => {
    expect(screenOutcome([view(care, calm, preparation)])).toMatchObject({
      verdict: 'serious',
      answeredBy: 'fallback',
      reason: 'unscreened',
    });
  });

  it('honours a crisis the fallback found, from either question', () => {
    const byCare = screenOutcome([view('fallback', danger, 'fallback')]);
    const byPreparation = screenOutcome([view('fallback', calm, 'fallback', 0.8)]);

    expect(byCare).toMatchObject({ verdict: 'crisis', answeredBy: 'fallback' });
    expect(byPreparation).toMatchObject({ verdict: 'crisis', answeredBy: 'fallback' });
    expect(byCare.reason).toBeUndefined();
  });

  it('honours a serious the fallback found, as a judged text', () => {
    const outcome = screenOutcome([view('fallback', heavy, 'fallback')]);

    expect(outcome).toMatchObject({ verdict: 'serious', answeredBy: 'fallback' });
    expect(outcome.reason).toBeUndefined();
  });

  it('says nothing was judged when no model answered', () => {
    expect(screenOutcome([{ care: null, preparation: null }])).toEqual({
      verdict: 'serious',
      confidence: 0,
      lowConfidence: true,
      answeredBy: 'default',
      reason: 'unscreened',
    });
  });
});

describe('the stricter of two readings', () => {
  it.each([
    ['pass', 'pass', 'pass'],
    ['pass', 'serious', 'serious'],
    ['serious', 'pass', 'serious'],
    ['pass', 'crisis', 'crisis'],
    ['crisis', 'pass', 'crisis'],
    ['serious', 'crisis', 'crisis'],
    ['crisis', 'serious', 'crisis'],
    ['crisis', 'crisis', 'crisis'],
  ] as const)('%s and %s is %s', (first, second, verdict) => {
    expect(stricterVerdict(first, second)).toBe(verdict);
  });

  it.each([
    ['as typed', [view('jev', danger, 'jev'), view('jev', calm, 'jev')]],
    ['with marks restored', [view('jev', calm, 'jev'), view('jev', danger, 'jev')]],
    [
      'restored, by the preparation question',
      [view('jev', calm, 'jev'), view('jev', calm, 'jev', 0.7)],
    ],
  ] as const)('is a crisis when only the reading %s is one', (_, views) => {
    expect(screenOutcome(views).verdict).toBe('crisis');
  });

  it('is serious when one reading is heavy and the other ordinary', () => {
    expect(screenOutcome([view('jev', calm, 'jev'), view('jev', heavy, 'jev')]).verdict).toBe(
      'serious',
    );
  });

  it('passes only when every reading passes, each by Jev', () => {
    expect(screenOutcome([view('jev', calm, 'jev'), view('jev', calm, 'jev')]).verdict).toBe(
      'pass',
    );
    expect(
      screenOutcome([view('jev', calm, 'jev'), view('fallback', calm, 'fallback')]),
    ).toMatchObject({ verdict: 'serious', answeredBy: 'fallback', reason: 'unscreened' });
  });
});
