import {
  taskCreateStartRequestSchema,
  taskCreateStartResponseSchema,
  type TaskCreateStartPass,
} from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import heardEn from '../../../packages/voice/fixtures/task.create_start.heard_time.en.json';
import heardVi from '../../../packages/voice/fixtures/task.create_start.heard_time.vi.json';
import {
  namesAnotherDay,
  resolveHeardTime,
  wallClockMinutes,
} from '../src/ai/task-create/heard-times';

import { createTask, jevDecides, pickAnswers, writerAnswers } from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.1, serious: 0.88, crisis: 0.02 };

/** Minutes since midnight for a clock time. */
function at(clock: string): number {
  const [hour = 0, minute = 0] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function heard(heardAs: string, now = '11:00', text = `so today ${heardAs} ok`) {
  return resolveHeardTime({ heardAs, text, nowMinutes: at(now) });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('resolveHeardTime', () => {
  it.each([
    ['at three', '15:00'],
    ['at 3', '15:00'],
    ['at 3pm', '15:00'],
    ['at 3:30', '15:30'],
    ['at half two', '14:30'],
    ['at half past 4', '16:30'],
    ['quarter to five', '16:45'],
    ['at 15:00', '15:00'],
    ['at noon', '12:00'],
    ['at eleven thirty', '11:30'],
    ['at 9 tonight', '21:00'],
    ["3 o'clock", '15:00'],
    ['by five this afternoon', '17:00'],
    ['ba giờ rưỡi', '15:30'],
    ['mười một giờ đêm', '23:00'],
    ['3g chiều', '15:00'],
    ['lúc 3 giờ chiều', '15:00'],
    ['3h', '15:00'],
    ['15h30', '15:30'],
    ['ba rưỡi chiều', '15:30'],
    ['3 giờ kém 15', '14:45'],
    ['luc 3 gio chieu', '15:00'],
    ['12 giờ trưa', '12:00'],
    ['1 giờ trưa', '13:00'],
    ['8 giờ tối', '20:00'],
    ['lúc 3', '15:00'],
  ])('works out "%s" in code, said at eleven in the morning', (heardAs, expected) => {
    expect(heard(heardAs)).toBe(expected);
  });

  it('reads an hour said without its half of the day as the next one still ahead today', () => {
    expect(heard('at 10', '08:00')).toBe('10:00');
    expect(heard('at 10', '11:00')).toBe('22:00');
    expect(heard('at 7', '06:00')).toBe('07:00');
    expect(heard('at 7', '07:00')).toBe('19:00');
    expect(heard('9h sáng', '08:00')).toBe('09:00');
    // After midnight the day has not turned yet, and its nine o'clocks are both behind it: the
    // coming morning belongs to the next day, which is not this one's to plan around.
    expect(heard('at 9', '01:30')).toBeNull();
    expect(heard('at 2am', '01:30')).toBe('02:00');
  });

  it.each([
    ['an hour whose both halves have gone by', 'at 3', '16:00', undefined],
    ['a bare hour that could only be the small hours', 'at 2', '23:00', undefined],
    ['a time that has gone by', 'at 3pm', '16:00', undefined],
    ['a morning that has gone by', '9h sáng', '11:00', undefined],
    ['a phrase that is not in the text', 'at 3', '11:00', 'call the plumber'],
    ['a phrase with no time in it', 'soon', '11:00', undefined],
    ['a length, not a time', 'for 3 hours', '11:00', undefined],
    ['an hour that does not exist', 'at 25', '11:00', undefined],
    ['an empty phrase', '', '11:00', undefined],
  ])('gives no time for %s', (_, heardAs, now, text) => {
    expect(heard(heardAs, now, text)).toBeNull();
  });
});

describe('a time said with a day', () => {
  // 8 October 2026 is a Thursday.
  const today = '2026-10-08';

  it.each([
    'dentist at 3 on Friday and then lunch',
    'tomorrow I have the dentist at 3',
    'khám răng lúc 3 giờ chiều mai',
    'thứ sáu khám răng lúc 3 giờ',
    'dentist at 3 on 12/10',
  ])('is another day in "%s"', (text) => {
    const heardAs = text.includes('giờ') ? 'lúc 3 giờ' : 'at 3';
    expect(namesAnotherDay(heardAs, text, today)).toBe(true);
  });

  it.each([
    'dentist at 3, and the report is due on Friday',
    'I have the dentist at 3 and the report is due Friday',
    'dentist at 3 this afternoon',
    'Thursday at 3 I have the dentist',
    'chiều nay khám răng lúc 3 giờ, thứ sáu nộp báo cáo',
  ])('is today in "%s"', (text) => {
    const heardAs = text.includes('giờ') ? 'lúc 3 giờ' : 'at 3';
    expect(namesAnotherDay(heardAs, text, today)).toBe(false);
  });
});

describe('the clock a heard time is read against', () => {
  it("is the phone's when it sent one, and the server's own in the user's zone when it did not", () => {
    const now = Date.parse('2026-10-08T06:12:00Z');

    expect(wallClockMinutes('13:12', 'Europe/London', now)).toBe(at('13:12'));
    expect(wallClockMinutes(undefined, 'Europe/London', now)).toBe(at('07:12'));
    expect(wallClockMinutes(undefined, 'Asia/Ho_Chi_Minh', now)).toBe(at('13:12'));
    expect(wallClockMinutes(undefined, 'Nowhere/At_All', now)).toBeNull();
  });
});

type Recorded = { request: Record<string, unknown>; response: TaskCreateStartPass };

/** Stage one for a recorded ramble, with the fast pick answering as it was recorded. */
async function stageOne(request: unknown, pick: unknown, screen = ordinary) {
  const sent = await createTask(
    {
      jev: jevDecides(screen),
      deepseek: pickAnswers([pick]),
    },
    request,
  );
  expect(sent.response.status).toBe(200);
  return { ...sent, body: taskCreateStartResponseSchema.parse(JSON.parse(sent.raw)) };
}

function pickOf({ response }: Recorded, timeToday: unknown, extra: object = {}) {
  return {
    oneThing: response.oneThing.text,
    oneThingDue: null,
    parked: response.parked.map(({ text }) => text),
    dated: [],
    timeToday,
    ...extra,
  };
}

describe('a clock time heard in the ramble', () => {
  it.each([
    ['en', heardEn as Recorded, { heardAs: 'at three', thing: 'dentist' }],
    ['vi', heardVi as Recorded, { heardAs: '3 giờ chiều nay', thing: 'khám răng' }],
  ] as const)(
    'is answered at stage one in %s, as the recorded answer has it',
    async (_language, fixture, said) => {
      expect(taskCreateStartRequestSchema.safeParse(fixture.request).success).toBe(true);
      expect(taskCreateStartResponseSchema.safeParse(fixture.response).success).toBe(true);

      const { body } = await stageOne(fixture.request, pickOf(fixture, said));

      // The continuation is sealed for the device that asked; everything else is as recorded.
      expect(body).toEqual({
        ...fixture.response,
        continuation: (body as TaskCreateStartPass).continuation,
      });
    },
  );

  it('keeps a time that came with no thing, in the words it was said in', async () => {
    const request = {
      ...heardEn.request,
      text: 'I have to leave at 3, and I still need to reply to Sam about the flat',
      localTime: '11:00',
    };
    const pick = {
      oneThing: 'Reply to Sam about the flat.',
      parked: [],
      dated: [],
      timeToday: { heardAs: 'at 3', thing: null },
    };

    const { body } = await stageOne(request, pick);

    expect(body).toMatchObject({ verdict: 'pass', heardTime: { at: '15:00', heardAs: 'at 3' } });
  });

  it('hears a time for another day as that day’s deadline and never as a time for today', async () => {
    const request = {
      ...heardEn.request,
      text: 'dentist at 3 on Friday, and I still need to reply to Sam about the flat',
      localTime: '11:00',
    };
    // The pick offers the time as today's all the same: code is what refuses it.
    const pick = {
      oneThing: 'Reply to Sam about the flat.',
      parked: [],
      dated: [{ text: 'Dentist', heardAs: 'on Friday', date: '2026-10-09' }],
      timeToday: { heardAs: 'at 3', thing: 'dentist' },
    };

    const { body } = await stageOne(request, pick);

    expect(body).toMatchObject({
      verdict: 'pass',
      deadlines: [{ text: 'Dentist', dueDate: '2026-10-09', heardAs: 'on Friday' }],
    });
    expect(body).not.toHaveProperty('heardTime');
  });

  it('gives none when the time has gone by, or was never in the text', async () => {
    const gone = await stageOne(
      { ...heardEn.request, localTime: '16:30' },
      pickOf(heardEn as Recorded, { heardAs: 'at three', thing: 'dentist' }),
    );
    const invented = await stageOne(
      heardEn.request,
      pickOf(heardEn as Recorded, { heardAs: 'at 5pm', thing: 'dentist' }),
    );

    expect(gone.body).not.toHaveProperty('heardTime');
    expect(invented.body).not.toHaveProperty('heardTime');
  });

  it('is not parked as a thing to do as well', async () => {
    const pick = pickOf(
      heardEn as Recorded,
      { heardAs: 'at three', thing: 'dentist' },
      { parked: ['Book the car in for its MOT', 'The dentist'] },
    );

    const { body } = await stageOne(heardEn.request, pick);

    expect(body).toMatchObject({ parked: [{ text: 'Book the car in for its MOT' }] });
  });

  it('is said back for a heavy task too, in plain words and with nothing else added', async () => {
    const plain = {
      ...pickOf(heardEn as Recorded, { heardAs: 'at three', thing: 'dentist' }),
      tinyNextStep: 'Open the message from Sam.',
    };
    const sent = await createTask(
      { jev: jevDecides(heavy), deepseek: pickAnswers([plain], writerAnswers([plain])) },
      heardEn.request,
    );

    const body = taskCreateStartResponseSchema.parse(JSON.parse(sent.raw));
    expect(body).toMatchObject({
      verdict: 'serious',
      heardTime: { at: '15:00', heardAs: 'dentist at three' },
    });
    expect(Object.keys(body)).not.toContain('monster');
    expect(Object.keys(body)).not.toContain('cueNotification');
  });
});
