import {
  taskCreateStartResponseSchema,
  type TaskCreateRequest,
  type TaskCreateStartPass,
} from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asksForAFit, minutesBeforeGetReady } from '../src/ai/task-create/fit-the-gap';
import { pickSystem } from '../src/ai/task-create/prompt';

import type { Reply } from './ai-providers';
import {
  createTask,
  jevDecides,
  pickAnswers,
  toolCalls,
  writerAnswers,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.1, serious: 0.88, crisis: 0.02 };

/** A ramble with a time today, a long thing and a short one, as each fast pick answered it. */
const rambles = {
  en: {
    text: 'dentist at 3:30, before that I should write the essay intro and reply to Sam about the flat',
    long: 'Write the essay intro.',
    short: 'Reply to Sam about the flat.',
    time: { heardAs: 'at 3:30', thing: 'dentist' },
    timeZone: 'Europe/London',
  },
  vi: {
    text: '3 rưỡi chiều khám răng, trước đó phải viết phần mở bài luận và nhắn chị Hạnh vụ họp lớp',
    long: 'Viết phần mở bài luận.',
    short: 'Nhắn chị Hạnh vụ họp lớp.',
    time: { heardAs: '3 rưỡi chiều', thing: 'khám răng' },
    timeZone: 'Asia/Ho_Chi_Minh',
  },
} as const;
type Language = keyof typeof rambles;

function pickOf(language: Language, oneThing: 'long' | 'short', withTime = true) {
  const ramble = rambles[language];
  return {
    oneThing: ramble[oneThing],
    oneThingDue: null,
    parked: [ramble[oneThing === 'long' ? 'short' : 'long']],
    dated: [],
    timeToday: withTime ? ramble.time : null,
  };
}

/** Jev as recorded, with the essay judged too big for ten minutes and everything else fitting. */
function jevSizes(screen = ordinary): Reply {
  const decides = jevDecides(screen);
  return (request) => {
    const state = request.body['state'];
    const questions = request.body['questions'] as { answer: { criteria: object } };
    if (
      !('too_big' in questions.answer.criteria) ||
      typeof state !== 'string' ||
      !/essay|bài luận/.test(state)
    ) {
      return decides(request);
    }
    const probabilities = { fits: 0.06, too_big: 0.94 };
    return Response.json({
      model: 'jev-1.13.0',
      answers: { answer: { type: 'choice', choice: 'too_big', confidence: 0.95, probabilities } },
      usage: { input_tokens: 498, output_tokens: 40 },
    });
  };
}

function request(language: Language, more: Partial<TaskCreateRequest> = {}): TaskCreateRequest {
  return {
    language,
    attitude: 'cheeky',
    energy: 'medium',
    text: rambles[language].text,
    source: 'ramble',
    localDate: '2026-10-06',
    timeZone: rambles[language].timeZone,
    overrideSerious: false,
    staged: true,
    ...more,
  };
}

async function start(picks: readonly unknown[], body: TaskCreateRequest, jev = jevSizes()) {
  const sent = await createTask({ jev, deepseek: pickAnswers(picks, writerAnswers([])) }, body);
  const answer = taskCreateStartResponseSchema.parse(JSON.parse(sent.raw)) as TaskCreateStartPass;
  return { answer, picks: toolCalls(sent.doubles, 'pick_') };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the minutes before getting ready', () => {
  it('are the heard time less the lead, from the phone clock', () => {
    const heard = { at: '15:30', heardAs: 'dentist at 3:30' };
    const clock = { localTime: '14:20', timeZone: 'Europe/London' };

    expect(minutesBeforeGetReady(heard, clock)).toBe(35);
    expect(minutesBeforeGetReady(heard, { ...clock, getReadyLeadMinutes: 60 })).toBe(10);
  });

  it.each([
    [null, false],
    [5, false],
    [10, true],
    [59, true],
    [60, false],
    [240, false],
  ])('steer the pick for a gap of %s minutes: %s', (gap, steers) => {
    expect(asksForAFit(gap)).toBe(steers);
  });
});

describe('a time heard today, with little left before getting ready', () => {
  it.each(['en', 'vi'] as const)(
    'offers the %s thing that fits ten minutes, and keeps the long one in the drawer',
    async (language) => {
      const ramble = rambles[language];
      const { answer, picks } = await start(
        [pickOf(language, 'long'), pickOf(language, 'short')],
        request(language, { localTime: '14:20' }),
      );

      expect(answer.oneThing.text).toBe(ramble.short);
      expect(answer.labels.fitsTenMinutes).toBe(true);
      expect(answer.parked).toEqual([{ text: ramble.long }]);
      expect(answer.heardTime?.at).toBe('15:30');
      // Asked once more, told the minutes left and with the long one turned down.
      expect(picks).toHaveLength(2);
      const again = JSON.stringify(picks[1]);
      expect(again).toContain(language === 'en' ? '35 minutes' : '35 phút');
      expect(again).toContain(ramble.long);
    },
  );

  it('reads the lead from the request', async () => {
    const steered = await start(
      [pickOf('en', 'long'), pickOf('en', 'short')],
      request('en', { localTime: '13:10', getReadyLeadMinutes: 90 }),
    );
    const asIs = await start(
      [pickOf('en', 'long'), pickOf('en', 'short')],
      request('en', { localTime: '13:10' }),
    );

    expect(steered.answer.oneThing.text).toBe(rambles.en.short);
    expect(asIs.answer.oneThing.text).toBe(rambles.en.long);
    expect(asIs.picks).toHaveLength(1);
  });

  it.each([
    ['an hour or more is left', '13:30'],
    ['under ten minutes are left, where nothing fits', '14:50'],
  ])('picks as on any day when %s', async (_, localTime) => {
    const { answer, picks } = await start(
      [pickOf('en', 'long'), pickOf('en', 'short')],
      request('en', { localTime }),
    );

    expect(answer.oneThing.text).toBe(rambles.en.long);
    expect(answer.labels.fitsTenMinutes).toBe(false);
    expect(picks).toHaveLength(1);
  });

  it('keeps the first pick when no time was heard', async () => {
    const { answer, picks } = await start(
      [pickOf('en', 'long', false), pickOf('en', 'short', false)],
      request('en', { localTime: '14:20' }),
    );

    expect(answer.oneThing.text).toBe(rambles.en.long);
    expect(answer.heardTime).toBeUndefined();
    expect(picks).toHaveLength(1);
  });

  it('keeps the first pick when the one asked for again does not fit either', async () => {
    const { answer, picks } = await start(
      [pickOf('en', 'long'), { ...pickOf('en', 'long'), oneThing: 'Write the essay outline.' }],
      request('en', { localTime: '14:20' }),
    );

    expect(picks).toHaveLength(2);
    expect(answer.oneThing.text).toBe(rambles.en.long);
    expect(answer.parked).toEqual([{ text: rambles.en.short }]);
  });

  it('keeps the first pick when the pick answers with the turned-down thing again', async () => {
    const { answer, picks } = await start(
      [pickOf('en', 'long'), pickOf('en', 'long')],
      request('en', { localTime: '14:20' }),
    );

    expect(picks).toHaveLength(2);
    expect(answer.oneThing.text).toBe(rambles.en.long);
  });

  it('keeps the first pick, and answers within the contract, when the second strays off the note', async () => {
    // Recorded from the fast pick on an English note about an essay: it wrote the essay in Vietnamese.
    const strayed = {
      ...pickOf('en', 'short'),
      oneThing: 'Viết bài luận intro before the dentist.',
    };
    const { answer, picks } = await start(
      [pickOf('en', 'long'), strayed],
      request('en', { localTime: '14:20' }),
    );

    expect(picks).toHaveLength(2);
    expect(answer.oneThing.text).toBe(rambles.en.long);
  });

  it('puts the long thing in the drawer once, however the second pick worded it', async () => {
    const reworded = {
      ...pickOf('en', 'short'),
      parked: ['Write the essay intro before the dentist.'],
    };
    const { answer } = await start(
      [pickOf('en', 'long'), reworded],
      request('en', { localTime: '14:20' }),
    );

    expect(answer.oneThing.text).toBe(rambles.en.short);
    expect(answer.parked).toEqual([{ text: rambles.en.long }]);
  });

  it('never shows the English pick a Vietnamese wording to copy', () => {
    // An English note about an essay was once picked as "Viết bài luận …", off the note, after
    // the prompt's spelling example turned "viet bai luan" into it.
    expect(pickSystem('en')).not.toMatch(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i);
    expect(pickSystem('en')).toMatch(/note's own language/);
  });

  it('never asks again about a heavy note', async () => {
    const plain = { ...pickOf('en', 'long'), tinyNextStep: 'Open the essay document.' };
    const sent = await createTask(
      {
        jev: jevSizes(heavy),
        deepseek: pickAnswers([pickOf('en', 'long')], writerAnswers([plain])),
      },
      request('en', { localTime: '14:20' }),
    );

    const answer = taskCreateStartResponseSchema.parse(JSON.parse(sent.raw));
    expect(answer.verdict).toBe('serious');
    expect(toolCalls(sent.doubles, 'pick_')).toHaveLength(1);
  });
});
