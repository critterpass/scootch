import { cuePlaceholder, type Attitude, type InTheWay, type Language } from '@scootch/domain';
import { describe, expect, it } from 'vitest';

import { checkLine, type LineKind } from '../check';
import { checkCueLine } from '../task-lines';

import {
  getReadyLine,
  helperLine,
  helperSlots,
  inTheWayLine,
  offlinePacks,
  plainHelperSlots,
  timeSaidBackLine,
  type HelperSlot,
} from './index';

const languages: Language[] = ['en', 'vi'];
const attitudes: Attitude[] = ['soft', 'cheeky', 'unhinged'];

/** What the phone puts where a line leaves room: a count of bites ticked, and a monster's name. */
const filled: Readonly<Record<Language, (line: string) => string>> = {
  en: (line) => line.replaceAll('{count}', '2').replaceAll('{name}', 'Drip'),
  vi: (line) => line.replaceAll('{count}', '2').replaceAll('{name}', 'Lồng Lộn'),
};

/** The lines that go out as a notification or sit on a widget are held to a notification's length. */
const kindOf = (slot: HelperSlot): LineKind =>
  slot === 'widgetRest' || slot === 'widgetJoined' ? 'notification' : 'hatch';

const heard: Readonly<Record<Language, readonly string[]>> = {
  en: ['dentist at three', 'at 3', 'the school pick-up at half two.'],
  vi: ['khám răng 3 giờ chiều nay', 'lúc 3 giờ', 'đón con lúc 4 rưỡi chiều.'],
};

describe('the offline lines for the starting helpers', () => {
  it.each(languages)('pass the check on every %s line at all three attitudes', (language) => {
    const failures: string[] = [];
    for (const attitude of attitudes) {
      for (const slot of helperSlots) {
        const text = helperLine(language, attitude, slot);
        const { reasons } =
          slot === 'cue'
            ? checkCueLine({ text, language, attitude })
            : checkLine({ text: filled[language](text), kind: kindOf(slot), language, attitude });
        if (reasons.length > 0) failures.push(`${attitude} ${slot}: ${reasons.join(', ')}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it.each(languages)('pass it on every plain %s line a heavy task shows', (language) => {
    const failures: string[] = [];
    for (const slot of plainHelperSlots) {
      const text = helperLine(language, 'plain', slot);
      // A heavy task is spoken to as Soft speaks: whole sentences, and "mình" in Vietnamese.
      const { reasons } =
        slot === 'cue'
          ? checkCueLine({ text, language, attitude: 'soft' })
          : checkLine({ text, kind: 'plainStep', language, attitude: 'soft' });
      if (reasons.length > 0) failures.push(`${slot}: ${reasons.join(', ')}`);
      // Plain company has nobody else in it.
      expect(text).not.toMatch(/monster|quái|!/i);
    }

    expect(failures).toEqual([]);
  });

  it.each(languages)(
    'say a heard time back, and nudge once, in the %s words it was said in',
    (language) => {
      for (const heardAs of heard[language]) {
        const back = timeSaidBackLine(language, heardAs);
        const nudge = getReadyLine(language, heardAs);

        const words = heardAs.replace(/\.$/, '');
        expect(back.toLowerCase()).toBe(`${words.toLowerCase()}.`);
        expect(nudge.startsWith(back)).toBe(true);
        expect(nudge).not.toMatch(/leave|\bđi ngay\b|\.\./i);
        for (const attitude of attitudes) {
          expect(
            checkLine({ text: back, kind: 'notification', language, attitude }).reasons,
          ).toEqual([]);
          expect(
            checkLine({ text: nudge, kind: 'notification', language, attitude }).reasons,
          ).toEqual([]);
        }
      }
    },
  );

  it('opens every cue line on the placeholder, the plain one included', () => {
    for (const language of languages) {
      const lines = [
        ...attitudes.map((attitude) => helperLine(language, attitude, 'cue')),
        helperLine(language, 'plain', 'cue'),
      ];
      for (const line of lines) {
        expect(line.startsWith(cuePlaceholder)).toBe(true);
        expect(line.split(cuePlaceholder)).toHaveLength(2);
      }
    }
  });

  it('has a line for each answer to "Anything in the way?", in each language', () => {
    const answers: InTheWay[] = ['boring', 'scary', 'confusing', 'too_big'];
    for (const language of languages) {
      for (const attitude of attitudes) {
        const lines = answers.map((answer) => inTheWayLine(language, attitude, answer));
        expect(new Set(lines).size).toBe(answers.length);
      }
    }
    // Scary opens the thing and nothing more; confusing writes the one question.
    expect(inTheWayLine('en', 'cheeky', 'scary')).toMatch(/just open it/i);
    expect(inTheWayLine('en', 'cheeky', 'confusing')).toMatch(/question/i);
    expect(inTheWayLine('vi', 'cheeky', 'scary')).toMatch(/mở/i);
    expect(inTheWayLine('vi', 'cheeky', 'confusing')).toMatch(/câu hỏi/i);
  });

  it('leaves the two languages with the same slots filled', () => {
    for (const language of languages) {
      for (const attitude of attitudes) {
        expect(Object.keys(offlinePacks[language].helpers[attitude]).sort()).toEqual(
          [...helperSlots].sort(),
        );
      }
      expect(Object.keys(offlinePacks[language].plainHelpers).sort()).toEqual(
        [...plainHelperSlots].sort(),
      );
    }
  });
});
