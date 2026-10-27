import { describe, expect, it } from 'vitest';

import { hear } from './hear';
import {
  acceptedShort,
  hearWithModel,
  type HeardPart,
  type ModelSplit,
  type OnlineSplit,
} from './hear-with-model';

// 27 October 2026 is a Tuesday; it is eleven in the morning.
const clock = { today: '2026-10-27', nowMinutes: 11 * 60 };

const RAMBLE =
  'Okay so I have to email the landlord by Friday and the dentist thing at three and then buy milk on the way home';

type Timers = { setTimeout(run: () => void, ms: number): unknown };
const later = (run: () => void, ms: number) =>
  (globalThis as unknown as Timers).setTimeout(run, ms);

/** A model that answers with these parts, after `ms`. */
const answering =
  (parts: readonly string[] | null, ms = 0): ModelSplit =>
  () =>
    new Promise((resolve) => later(() => resolve(parts), ms));

const brief = (heard: Awaited<ReturnType<typeof hearWithModel>>) =>
  heard.tasks.map(({ text, dueDate, heardTime }) => [text, dueDate, heardTime?.at ?? null]);

describe('hearing with the on-device model first', () => {
  it('is the rules alone when there is no model', async () => {
    expect(await hearWithModel(RAMBLE, clock)).toEqual(hear(RAMBLE, clock));
  });

  it("takes the model's split, and reads each part's day and time with the rules", async () => {
    const heard = await hearWithModel(RAMBLE, clock, {
      split: answering([
        'email the landlord by Friday',
        'the dentist thing at three',
        'buy milk on the way home',
      ]),
    });
    expect(heard.how).toBe('model');
    expect(brief(heard)).toEqual([
      ['Email the landlord', '2026-10-30', null],
      ['The dentist thing', null, '15:00'],
      ['Buy milk on the way home', null, null],
    ]);
  });

  it('works the same in Vietnamese, marks or none', async () => {
    const ramble =
      'Ừm mai phải nộp báo cáo cho sếp, 3 giờ chiều khám răng, rồi đi chợ mua đồ ăn nữa';
    const heard = await hearWithModel(ramble, clock, {
      split: answering(['nộp báo cáo cho sếp mai', 'khám răng 3 giờ chiều', 'đi chợ mua đồ ăn']),
    });
    expect(heard.how).toBe('model');
    expect(brief(heard)).toEqual([
      ['Nộp báo cáo cho sếp', '2026-10-28', null],
      ['Khám răng', null, '15:00'],
      ['Đi chợ mua đồ ăn', null, null],
    ]);
  });

  it('never takes a split that invents a task', async () => {
    const heard = await hearWithModel(RAMBLE, clock, {
      split: answering(['email the landlord by Friday', 'book a flight to Hanoi']),
    });
    expect(heard).toEqual(hear(RAMBLE, clock));
  });

  it('never takes a split that loses something the rules heard', async () => {
    const heard = await hearWithModel(RAMBLE, clock, {
      split: answering(['email the landlord by Friday']),
    });
    expect(heard).toEqual(hear(RAMBLE, clock));
  });

  it('waits no longer than it is allowed, then hears with the rules', async () => {
    const began = Date.now();
    const heard = await hearWithModel(RAMBLE, clock, {
      split: answering(['email the landlord by Friday'], 400),
      waitMs: 30,
    });
    expect(Date.now() - began).toBeLessThan(300);
    expect(heard).toEqual(hear(RAMBLE, clock));
  });

  it('hears with the rules when the model fails or has nothing', async () => {
    const failing: ModelSplit = () => Promise.reject(new Error('unavailable'));
    expect(await hearWithModel(RAMBLE, clock, { split: failing })).toEqual(hear(RAMBLE, clock));
    expect(await hearWithModel(RAMBLE, clock, { split: answering(null) })).toEqual(
      hear(RAMBLE, clock),
    );
    expect(await hearWithModel(RAMBLE, clock, { split: answering([]) })).toEqual(
      hear(RAMBLE, clock),
    );
  });

  it('does not ask the model about one short task', async () => {
    let asked = false;
    const heard = await hearWithModel('Buy milk', clock, {
      split: () => {
        asked = true;
        return Promise.resolve(['Buy milk']);
      },
    });
    expect(asked).toBe(false);
    expect(heard).toEqual(hear('Buy milk', clock));
  });
});

/** The server's model answering with these parts, after `ms`. */
const online =
  (parts: readonly HeardPart[] | null, ms = 0): OnlineSplit =>
  () =>
    new Promise((resolve) => later(() => resolve(parts), ms));

const named = (heard: Awaited<ReturnType<typeof hearWithModel>>) =>
  heard.tasks.map(({ text, short, dueDate }) => [text, short, dueDate]);

describe('hearing with the server’s model first, when there is a connection', () => {
  const founder = 'Uhm. We need... Evaluation for Gemini replacement.';

  it('takes its split and its chalk names', async () => {
    const heard = await hearWithModel(founder, clock, {
      online: online([
        { text: 'Evaluation for the Gemini replacement', short: 'Gemini replacement eval' },
      ]),
    });
    expect(heard.how).toBe('online');
    expect(named(heard)).toEqual([
      ['Evaluation for the Gemini replacement', 'Gemini replacement eval', null],
    ]);
  });

  it('reads each part’s day with the rules, in Vietnamese too', async () => {
    const said =
      'Ừm, mình phải gọi cho mẹ tối nay, với lại nộp báo cáo trước thứ Sáu. Rồi còn phải mua sữa nữa.';
    const heard = await hearWithModel(said, clock, {
      online: online([
        { text: 'gọi cho mẹ tối nay', short: 'Gọi mẹ' },
        { text: 'nộp báo cáo trước thứ Sáu', short: 'Nộp báo cáo' },
        { text: 'mua sữa', short: 'Mua sữa' },
      ]),
    });
    expect(named(heard)).toEqual([
      ['Gọi cho mẹ', 'Gọi mẹ', '2026-10-27'],
      ['Nộp báo cáo', 'Nộp báo cáo', '2026-10-30'],
      ['Mua sữa', 'Mua sữa', null],
    ]);
  });

  it('reads a part the model left with its pauses in as one thought', async () => {
    const said =
      'Okay so, uh, I need to finish the, the quarterly report. For Sarah. Before Friday.';
    // As Claude Haiku answered on 28 Oct 2026.
    const heard = await hearWithModel(said, clock, {
      online: online([
        {
          text: 'finish the quarterly report. For Sarah. Before Friday.',
          short: 'Quarterly report',
        },
      ]),
    });
    expect(named(heard)).toEqual([
      ['Finish the quarterly report for Sarah', 'Quarterly report', '2026-10-30'],
    ]);
  });

  it('works a chalk name out on the phone when the model’s is filler, a fragment or invented', async () => {
    for (const short of ['Uhm', 'We need', 'Mình cần', 'Gemini migration plan', '']) {
      const heard = await hearWithModel(founder, clock, {
        online: online([{ text: 'Evaluation for Gemini replacement', short }]),
      });
      expect(heard.tasks[0]?.short).toBeNull();
    }
  });

  it('never takes a split that invents or loses a task', async () => {
    const said = 'Um, I need to call the dentist, and also pay the electricity bill.';
    for (const parts of [
      [{ text: 'Call the dentist', short: 'Call dentist' }],
      [
        { text: 'Call the dentist', short: 'Call dentist' },
        { text: 'Book a flight to Hanoi', short: 'Book flight' },
      ],
    ]) {
      expect(await hearWithModel(said, clock, { online: online(parts) })).toEqual(
        hear(said, clock),
      );
    }
  });

  it('hears with the rules when there is no answer in time', async () => {
    const parts = [{ text: 'Evaluation for Gemini replacement', short: 'Gemini replacement eval' }];
    expect(await hearWithModel(founder, clock, { online: online(null) })).toEqual(
      hear(founder, clock),
    );
    expect(
      await hearWithModel(founder, clock, { online: online(parts, 400), onlineWaitMs: 30 }),
    ).toEqual(hear(founder, clock));
    const failing: OnlineSplit = () => Promise.reject(new Error('offline'));
    expect(await hearWithModel(founder, clock, { online: failing })).toEqual(hear(founder, clock));
  });
});

describe('a chalk name from the model', () => {
  const said = 'Uhm. We need... Evaluation for Gemini replacement.';

  it.each([
    ['Gemini replacement eval', 'Gemini replacement eval'],
    ['gemini replacement evaluation', null],
    ['Gemini eval', 'Gemini eval'],
    ['Uhm', null],
    ['We need', null],
    ['Evaluation for', null],
    ['Gemini rollout', null],
  ])('"%s" is kept as %s', (short, kept) => {
    expect(acceptedShort(short, said)).toBe(kept);
  });

  it('reads Vietnamese the same way', () => {
    const vi = 'Ờ. Thì là… mình cần, kiểu, làm cái đánh giá… cho việc thay Gemini.';
    expect(acceptedShort('Đánh giá thay Gemini', vi)).toBe('Đánh giá thay Gemini');
    expect(acceptedShort('Mình cần', vi)).toBeNull();
    expect(acceptedShort('Ờ', vi)).toBeNull();
  });
});
