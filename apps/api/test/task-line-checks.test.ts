import { lineLimits } from '@scootch/voice';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
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
