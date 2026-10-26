import { describe, expect, it } from 'vitest';

import { chooseIndex, createChooser, fillLine, linePacks, shoutName } from './choose';
import { moments } from './types';

describe('choosing a variant', () => {
  it('gives the same index for the same seed', () => {
    expect(chooseIndex(8, 'pressure0', 'seed-1')).toBe(chooseIndex(8, 'pressure0', 'seed-1'));
    expect(chooseIndex(8, 'pressure0', 42, 3)).toBe(chooseIndex(8, 'pressure0', 42, 3));
  });

  it('never gives the last index again when there is another', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      for (const count of [2, 3, 8]) {
        const last = seed % count;
        const index = chooseIndex(count, 'looksUp', seed, last);
        expect(index).not.toBe(last);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(count);
      }
    }
  });

  it('reaches every variant across seeds', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 200; seed += 1) seen.add(chooseIndex(8, 'looksUp', seed));
    expect(seen.size).toBe(8);
  });

  it('gives the one line of a fixed moment every time, and nothing for a silent one', () => {
    expect(chooseIndex(1, 'comingBack', 'x', 0)).toBe(0);
    expect(chooseIndex(0, 'commentTen', 'x')).toBe(-1);
  });

  it('never says the same line twice in a row for any moment', () => {
    for (const language of ['en', 'vi'] as const) {
      const chooser = createChooser(language);
      for (const moment of moments) {
        const count = linePacks[language][moment].length;
        let previous: number | undefined;
        for (let seed = 0; seed < 30; seed += 1) {
          const chosen = chooser.say(moment, `day-${seed}`);
          if (count === 0) {
            expect(chosen).toBeUndefined();
            continue;
          }
          if (count > 1 && previous !== undefined) expect(chosen?.index).not.toBe(previous);
          previous = chosen?.index;
        }
      }
    }
  });

  it('carries its memory over', () => {
    const first = createChooser('en');
    const said = first.say('looksUp', 'a');
    const again = createChooser('en', first.memory()).say('looksUp', 'a');
    expect(again?.index).not.toBe(said?.index);
  });
});

describe('filling a line', () => {
  it('shouts the full name with a stop between each word', () => {
    expect(shoutName('Trần Minh Anh')).toBe('TRẦN. MINH. ANH');
    expect(fillLine('{NAME}.', { NAME: 'Trần  Minh Anh' })).toBe('TRẦN. MINH. ANH.');
  });

  it('fills the task, the minutes and the date, and leaves an unknown value as written', () => {
    expect(fillLine('{task}. {minutes} minutes.', { task: 'Email the dentist', minutes: 10 })).toBe(
      'Email the dentist. 10 minutes.',
    );
    expect(fillLine('Due {date}.', {})).toBe('Due {date}.');
  });
});
