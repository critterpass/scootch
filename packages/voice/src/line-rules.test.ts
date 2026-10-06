import { describe, expect, it } from 'vitest';

import { checkLine, checkWrittenLine } from './check';
import { isSentenceCased, repeatedSteps, sentenceCased } from './line-rules';
import { checkTaskCopy, type TaskCopy } from './task-lines';

describe('a title that copies the prompt example', () => {
  it.each([
    ['en', 'Cupboard lurker'],
    ['en', 'cupboard lurker.'],
    ['vi', 'Cư dân gầm giường'],
    ['vi', 'CƯ DÂN GẦM GIƯỜNG'],
  ] as const)('%s: "%s" is rejected', (language, text) => {
    const check = checkLine({ text, kind: 'monsterTitle', language, attitude: 'cheeky' });

    expect(check.reasons).toContain('copied_example');
  });

  it.each([
    ['en', 'Boiler grumbler'],
    ['en', 'Cupboard lurker of note'],
    ['vi', 'Cư dân bồn rửa'],
    ['vi', 'Thợ rình máy giặt'],
  ] as const)('%s: "%s" passes', (language, text) => {
    expect(checkLine({ text, kind: 'monsterTitle', language, attitude: 'cheeky' }).ok).toBe(true);
  });
});

describe('sentence case in Soft lines', () => {
  const soft = (text: string, language: 'en' | 'vi') =>
    checkWrittenLine({ text, kind: 'start', language, attitude: 'soft' });

  it.each([
    ['en', 'I am right here. We can go slowly.'],
    ['en', '"Ready" is a big word. Let us open the file.'],
    ['en', 'Meet me at 3 p.m. by the sink.'],
    ['vi', 'Mình ở đây nè. Cứ từ từ thôi.'],
    ['vi', 'Đi thôi, mình ngồi cạnh bạn.'],
    ['vi', 'iCloud đang tắt. Mình vẫn ở đây.'],
  ] as const)('%s: "%s" passes', (language, text) => {
    expect(soft(text, language).ok).toBe(true);
  });

  it.each([
    ['en', 'i am right here. we can go slowly.'],
    ['en', 'I am right here. we can go slowly.'],
    ['vi', 'mình ở đây nè. cứ từ từ thôi.'],
    ['vi', 'Mình ở đây nè! đi thôi.'],
    ['vi', 'đi thôi, mình ngồi cạnh bạn.'],
  ] as const)('%s: "%s" fails', (language, text) => {
    expect(soft(text, language).reasons).toEqual(['sentence_case']);
  });

  it('is a rule of the Soft attitude only, and never of a name or a title', () => {
    const line = { text: 'right here. go slowly.', kind: 'start', language: 'en' } as const;

    expect(checkWrittenLine({ ...line, attitude: 'unhinged' }).ok).toBe(true);
    expect(
      checkWrittenLine({
        text: 'desk lurker',
        kind: 'monsterTitle',
        language: 'en',
        attitude: 'soft',
      }).ok,
    ).toBe(true);
  });

  it.each([
    ['i am right here. we can go slowly.', 'I am right here. We can go slowly.'],
    ['mình ở đây nè. cứ từ từ thôi!  đi nào.', 'Mình ở đây nè. Cứ từ từ thôi!  Đi nào.'],
    ['đi thôi, mình ngồi cạnh bạn.', 'Đi thôi, mình ngồi cạnh bạn.'],
    ['"ready" is a big word.', '"Ready" is a big word.'],
    // Nothing but the opening letters changes.
    ['Already Fine. it Is.', 'Already Fine. It Is.'],
    ['{treat} is yours now. enjoy it.', '{treat} is yours now. Enjoy it.'],
    ['meet me at 3 p.m. by the sink.', 'Meet me at 3 p.m. by the sink.'],
  ])('repairs "%s" by capitalising and nothing else', (text, repaired) => {
    expect(sentenceCased(text)).toBe(repaired);
    expect(isSentenceCased(repaired)).toBe(true);
    expect(sentenceCased(text).toLowerCase()).toBe(text.trim().toLowerCase());
  });
});

describe('tiny steps that repeat', () => {
  it.each([
    [['Open the laptop.', 'Find the file.', 'Look at the file.'], []],
    [['Open the laptop.', 'Open the laptop.', 'Look at it.'], [1]],
    [['Open the laptop.', 'Find the file.', 'find the file'], [2]],
    [['Open the laptop.', 'Look at it.', 'open the laptop!'], [2]],
    [['Mở máy tính lên.', 'Tìm cái tệp.', 'Mở máy tính lên'], [2]],
    [['Mở máy tính lên.', 'Tìm cái tệp.', 'Nhìn cái tệp.'], []],
  ])('%j repeats at %j', (steps, repeated) => {
    expect(repeatedSteps(steps)).toEqual(repeated);
  });

  it('fails the repeated step in a whole answer', () => {
    const copy: TaskCopy = {
      monster: { name: 'Grumbles', title: 'Boiler grumbler', flavourText: 'It hums at night.' },
      lines: {
        hatch: 'Grumbles is here.',
        start: 'Off we go.',
        working: ['Still here.', 'Typing along.', 'Humming quietly.'],
        pickedUp: 'Hello up here.',
        checkIn: 'How is it going?',
        tinyNextStep: 'Open the email app.',
        tinierNextSteps: ['Find the landlord in your contacts.', 'Open the email app.'],
        twoMinutesLeft: 'Two minutes left.',
        timeUp: 'Time is up.',
        caught: 'Caught it.',
        notFinished: 'You started. What now?',
      },
      notifications: [],
      deadlines: [],
    };

    expect(checkTaskCopy(copy, 'en', 'cheeky')).toEqual([
      { slot: 'lines.tinierNextSteps.1', kind: 'tiniestNextStep', reasons: ['repeated_step'] },
    ]);
  });
});
