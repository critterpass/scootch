import { describe, expect, it } from 'vitest';

import { hear } from './hear';
import { hearWithModel, type ModelSplit } from './hear-with-model';

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
