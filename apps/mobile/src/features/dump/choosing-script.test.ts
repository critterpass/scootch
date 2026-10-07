import { describe, expect, it } from '@jest/globals';

import { choosingScript, choosingTimeline, MOST_WORDS, wordFall } from './choosing-script';

const chosen = (script: ReturnType<typeof choosingScript>) =>
  script === null ? null : script.words.slice(script.from, script.to).join(' ');

describe('what the choosing reveal plays', () => {
  it('finds the one thing among the words that were spoken', () => {
    const script = choosingScript({
      sent: 'ok so taxes are due and I need to email the dentist about Thursday and the car thing',
      heard: null,
      oneThing: 'Email the dentist about Thursday.',
    });
    expect(chosen(script)).toBe('email the dentist about Thursday');
    expect(script?.words).toHaveLength(18);
  });

  it('plays a typed thing whole, as there is nothing else to fall away', () => {
    const script = choosingScript({ sent: 'gọi cho mẹ', heard: null, oneThing: 'Gọi cho mẹ' });
    expect(script).toEqual({ words: ['gọi', 'cho', 'mẹ'], from: 0, to: 3 });
  });

  it('plays a short typed thing whole when it comes back reworded', () => {
    const script = choosingScript({
      sent: 'reply sam asap',
      heard: null,
      oneThing: 'Reply to Sam',
    });
    expect(chosen(script)).toBe('reply sam asap');
  });

  it('plays what was heard when the one thing was reworded out of a ramble', () => {
    const script = choosingScript({
      sent: 'taxes ugh and mum and that tooth appointment thing',
      heard: { phrases: ['Do the taxes', 'Email the dentist', 'Call mum'], chosen: 1 },
      oneThing: 'Email the dentist',
    });
    expect(script?.words.join(' ')).toBe('Do the taxes, Email the dentist Call mum');
    expect(chosen(script)).toBe('Email the dentist');
  });

  it('plays nothing over a task that has none of the last words in it', () => {
    expect(
      choosingScript({ sent: 'water the plants', heard: null, oneThing: 'File the tax return' }),
    ).toBeNull();
    expect(choosingScript({ sent: null, heard: null, oneThing: 'Anything' })).toBeNull();
  });

  it('keeps a long ramble to what fits, with the one thing still in it', () => {
    const before = Array.from({ length: 80 }, (_, index) => `b${index}`).join(' ');
    const after = Array.from({ length: 80 }, (_, index) => `a${index}`).join(' ');
    const script = choosingScript({
      sent: `${before} call the bank ${after}`,
      heard: null,
      oneThing: 'call the bank',
    });
    expect(script?.words).toHaveLength(MOST_WORDS);
    expect(chosen(script)).toBe('call the bank');
  });
});

describe('when each beat of the reveal happens', () => {
  it('follows the board: a word every 100 ms, then the light, the fall and the answer', () => {
    expect(choosingTimeline(44)).toEqual({
      step: 100,
      lightAt: 4900,
      fallAt: 5800,
      answerAt: 7300,
      endAt: 8000,
    });
  });

  it('never spends more than four and a half seconds on the words arriving', () => {
    const { step, lightAt } = choosingTimeline(60);
    expect(step * 60).toBeCloseTo(4500);
    expect(lightAt).toBeCloseTo(5000);
  });

  it('sends each word its own way, inside the board’s limits, the same on every draw', () => {
    for (let index = 0; index < 60; index += 1) {
      const fall = wordFall(index);
      expect(fall).toEqual(wordFall(index));
      expect(Math.abs(fall.dx)).toBeLessThanOrEqual(20);
      expect(fall.dy).toBeGreaterThanOrEqual(120);
      expect(fall.dy).toBeLessThanOrEqual(280);
      expect(Math.abs(fall.turn)).toBeLessThanOrEqual(20);
      expect(fall.delay).toBeLessThanOrEqual(380);
    }
  });
});
