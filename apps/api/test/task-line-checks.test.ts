import { lineLimits } from '@scootch/voice';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  bitesAt,
  checkWritten,
  failuresIn,
  packFields,
  schemaFor,
  slotsOf,
  textsFrom,
  tidied,
} from '../src/ai/task-create/voice-check';

const [firstHalf = [], secondHalf = []] = packFields('cheeky');

describe('the treat line, checked as the person will read it', () => {
  // Fifteen words with the placeholder: inside the limit of twenty until the treat is named.
  const en = 'Here it comes, held high with both paws and great ceremony: {treat}, all yours now.';
  const vi =
    'Nó tới rồi đây, mình nâng bằng hai tay thật trang trọng: {treat}, của bạn hết đó nha.';

  it.each([
    ['en', en, 'a flat white'],
    ['vi', vi, 'ly trà sữa'],
  ] as const)('%s: passes with a short treat', (language, text, treat) => {
    const line = { text, kind: 'treatHandOver', language, attitude: 'cheeky' } as const;

    expect(checkWritten(line, treat).ok).toBe(true);
  });

  it.each([
    ['en', en, 'a very large slice of warm sticky toffee pudding'],
    ['vi', vi, 'một ly trà sữa trân châu đường đen thật to'],
  ] as const)('%s: is too long once a long treat is in it', (language, text, treat) => {
    const line = { text, kind: 'treatHandOver', language, attitude: 'cheeky' } as const;

    // The placeholder alone hides the real length.
    expect(checkWritten(line).ok).toBe(true);
    expect(checkWritten(line, treat).reasons).toEqual(['too_long']);
  });

  it('judges a Soft treat line by its own letters, not by how the treat is spelt', () => {
    const soft = { kind: 'treatHandOver', language: 'en', attitude: 'soft' } as const;

    expect(checkWritten({ ...soft, text: '{treat} is all yours now.' }, 'a flat white').ok).toBe(
      true,
    );
    expect(
      checkWritten({ ...soft, text: 'here it is. {treat} is yours.' }, 'a flat white').reasons,
    ).toEqual(['sentence_case']);
  });

  it('still wants the treat named when it is known', () => {
    const line = {
      text: 'Here it comes, all yours now.',
      kind: 'treatHandOver',
      language: 'en',
      attitude: 'cheeky',
    } as const;

    expect(checkWritten(line, 'a flat white').reasons).toEqual(['treat_not_named']);
  });
});

describe("the writer's answer as it really arrives", () => {
  const whole = {
    start: 'Off we go, sink first.',
    working: ['Still here.', 'Scrubbing along.', 'One pan down.', 'Bubbles everywhere.'],
    pickedUp: 'Oh, hello up here.',
    checkIn: 'How is it going? A smaller step is fine.',
    tinyNextStep: 'Run the hot tap.',
    tinierNextSteps: ['Put one pan in the sink.', 'Look at the sink.'],
  };

  it('reads a list that came as one string holding the list', () => {
    const answer = {
      ...whole,
      working: JSON.stringify(whole.working),
      tinierNextSteps: JSON.stringify(whole.tinierNextSteps),
    };

    const parsed = schemaFor(firstHalf, 'en').parse(answer);
    const texts = textsFrom(firstHalf, parsed);

    expect(texts.get('lines.working.3')).toBe('Bubbles everywhere.');
    expect(texts.get('lines.tinierNextSteps.1')).toBe('Look at the sink.');
    expect(failuresIn(slotsOf(firstHalf), texts, 'en', 'cheeky')).toEqual([]);
  });

  it('keeps the rest when one line is missing or misshapen', () => {
    const parsed = schemaFor(firstHalf, 'en').parse({ ...whole, start: 7, pickedUp: undefined });
    const texts = textsFrom(firstHalf, parsed);

    expect(texts.get('lines.start')).toBe('');
    expect(texts.get('lines.checkIn')).toBe(whole.checkIn);
  });

  it.each([
    ['an empty object', {}],
    ['nothing', undefined],
    ['only blanks', { start: ' ', working: [], tinierNextSteps: '[]' }],
  ])('refuses %s as no answer, so the call is made once more', (_, answer) => {
    expect(schemaFor(firstHalf, 'en').safeParse(answer).success).toBe(false);
  });

  it.each(['en', 'vi'] as const)(
    'tells the %s writer each field its own limit, under what the check allows',
    (language) => {
      const schema = z.toJSONSchema(schemaFor([...firstHalf, ...secondHalf], language)) as {
        properties: Record<string, { description?: string; default?: unknown; type: string }>;
      };
      const { properties } = schema;

      expect(Object.values(properties).every((field) => !('default' in field))).toBe(true);
      expect(properties['working']?.type).toBe('array');
      for (const [key, kind] of [
        ['start', 'start'],
        ['treatHandOver', 'treatHandOver'],
        ['notifications', 'notification'],
      ] as const) {
        const [words = ''] = /\d+/.exec(properties[key]?.description ?? '') ?? [];
        expect(Number(words)).toBeGreaterThan(0);
        expect(Number(words)).toBeLessThan(lineLimits[kind].words);
      }
      // The two smaller steps have different limits, and each is told its own.
      const steps = (properties['tinierNextSteps']?.description ?? '').match(/\d+/g) ?? [];
      expect(steps.map(Number)).toContain(Math.floor(lineLimits.tinierNextStep.words * 0.8));
      expect(steps.map(Number)).toContain(Math.floor(lineLimits.tiniestNextStep.words * 0.8));
    },
  );
});

describe('lines checked together', () => {
  const texts = (steps: readonly [string, string, string]) =>
    new Map([
      ['lines.tinyNextStep', steps[0]],
      ['lines.tinierNextSteps.0', steps[1]],
      ['lines.tinierNextSteps.1', steps[2]],
    ]);
  const slots = slotsOf(firstHalf).filter(({ slot }) => slot.includes('NextStep'));

  it.each([
    ['en', ['Open the laptop.', 'Find the file.', 'Look at the file.'], []],
    ['en', ['Open the laptop.', 'Open the laptop.', 'Look at it.'], ['lines.tinierNextSteps.0']],
    ['en', ['Open the laptop.', 'Find the file.', 'open the laptop'], ['lines.tinierNextSteps.1']],
    ['vi', ['Mở máy tính lên.', 'Tìm cái tệp.', 'Nhìn cái tệp.'], []],
    ['vi', ['Mở máy tính lên.', 'Tìm cái tệp.', 'Tìm cái tệp.'], ['lines.tinierNextSteps.1']],
  ] as const)('%s steps %j fail at %j', (language, steps, failing) => {
    const failures = failuresIn(slots, texts(steps), language, 'cheeky');

    expect(failures.map(({ slot }) => slot)).toEqual(failing);
    expect(failures.every(({ reasons }) => reasons.includes('repeated_step'))).toBe(true);
  });

  it('capitalises a Soft line in code and leaves every other attitude and every name alone', () => {
    expect(tidied(' mình ở đây nè. cứ từ từ thôi. ', 'start', 'soft')).toBe(
      'Mình ở đây nè. Cứ từ từ thôi.',
    );
    expect(tidied('right here. go slowly.', 'start', 'unhinged')).toBe('right here. go slowly.');
    expect(tidied('desk lurker', 'monsterTitle', 'soft')).toBe('desk lurker');
  });
});

describe('the three bites', () => {
  const bites = ["Find the dentist's email.", 'Write two lines about Thursday.', 'Hit send.'];
  const answer = {
    start: 'Off we go.',
    working: ['Still here.', 'Typing along.', 'One line down.'],
    pickedUp: 'Oh, hello up here.',
    checkIn: 'How is it going? A smaller step is fine.',
    tinyNextStep: 'Open the email app.',
    tinierNextSteps: ['Find the last email from them.', 'Look at the inbox.'],
    bites,
    biteMinutes: [1, 4, 1],
  };
  const read = (given: Record<string, unknown>, language: 'en' | 'vi' = 'en') => {
    const texts = textsFrom(firstHalf, schemaFor(firstHalf, language).parse(given));
    return { texts, failures: failuresIn(slotsOf(firstHalf), texts, language, 'cheeky') };
  };

  it('are kept with their minutes when all three are there', () => {
    const { texts, failures } = read(answer);

    expect(failures).toEqual([]);
    expect(bitesAt(texts)).toEqual([
      { text: bites[0], minutes: 1 },
      { text: bites[1], minutes: 4 },
      { text: bites[2], minutes: 1 },
    ]);
  });

  it('reads minutes that came as text, or as one string holding the list', () => {
    expect(
      bitesAt(read({ ...answer, biteMinutes: ['2', 3, '1'] }).texts)?.map((b) => b.minutes),
    ).toEqual([2, 3, 1]);
    expect(
      bitesAt(read({ ...answer, biteMinutes: '[1, 2, 3]' }).texts)?.map((b) => b.minutes),
    ).toEqual([1, 2, 3]);
  });

  it.each([
    ['a bite of five minutes', { biteMinutes: [1, 5, 1] }],
    ['a bite of no minutes', { biteMinutes: [1, 0, 1] }],
    ['half a minute', { biteMinutes: [1, 0.5, 1] }],
    ['two minutes for three bites', { biteMinutes: [1, 4] }],
    ['no minutes at all', { biteMinutes: undefined }],
    ['words where the minutes go', { biteMinutes: ['one', 'two', 'three'] }],
    ['two bites', { bites: bites.slice(0, 2) }],
    ['no bites', { bites: undefined }],
  ])('are left out whole with %s', (_, change) => {
    expect(bitesAt(read({ ...answer, ...change }).texts)).toBeUndefined();
  });

  it('are not needed for the answer to be whole', () => {
    const { failures } = read({ ...answer, bites: undefined, biteMinutes: undefined });

    expect(failures).toEqual([]);
  });

  it('fail the check when one is too long or says what another said', () => {
    const long =
      'Find the email from the dentist that came some time last spring and read all of it slowly.';
    expect(
      read({ ...answer, bites: [long, bites[1], bites[2]] }).failures.map((f) => f.slot),
    ).toEqual(['lines.bites.0']);
    expect(read({ ...answer, bites: [bites[0], 'Hit send.', 'hit send'] }).failures).toEqual([
      { slot: 'lines.bites.2', kind: 'bite', reasons: ['repeated_step'] },
    ]);
  });

  it('are never an answer on their own', () => {
    expect(schemaFor(firstHalf, 'en').safeParse({ biteMinutes: [1, 2, 3] }).success).toBe(false);
  });

  it.each(['en', 'vi'] as const)('tells the %s writer what the minutes are', (language) => {
    const schema = z.toJSONSchema(schemaFor(firstHalf, language)) as {
      properties: Record<string, { description?: string; type: string; items?: { type: string } }>;
    };

    expect(schema.properties['biteMinutes']?.items?.type).toBe('number');
    expect(schema.properties['biteMinutes']?.description).toMatch(/1 .* 4/);
    const [words = ''] = /\d+/.exec(schema.properties['bites']?.description ?? '') ?? [];
    expect(Number(words)).toBe(3);
  });
});
