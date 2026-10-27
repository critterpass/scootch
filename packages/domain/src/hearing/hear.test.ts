import { describe, expect, it } from 'vitest';

import { hear, hearTask } from './hear';

// 27 October 2026 is a Tuesday; it is eleven in the morning.
const clock = { today: '2026-10-27', nowMinutes: 11 * 60 };

const brief = (text: string) =>
  hear(text, clock).tasks.map(({ text: task, dueDate, heardTime }) => [
    task,
    dueDate,
    heardTime?.at ?? null,
  ]);

describe('hearing a ramble', () => {
  it('in English: each task with its day and its time, in the user’s words', () => {
    expect(
      brief('Um, I need to email the landlord by Friday, the dentist at three. Also buy milk.'),
    ).toEqual([
      ['Email the landlord', '2026-10-30', null],
      ['The dentist', null, '15:00'],
      ['Buy milk', null, null],
    ]);
  });

  it('in Vietnamese', () => {
    expect(
      brief('Ừm mai phải nộp báo cáo cho sếp, 3 giờ chiều khám răng, rồi đi chợ mua đồ ăn'),
    ).toEqual([
      ['Nộp báo cáo cho sếp', '2026-10-28', null],
      ['Khám răng', null, '15:00'],
      ['Đi chợ mua đồ ăn', null, null],
    ]);
  });

  it('in Vietnamese typed without marks', () => {
    expect(brief('mai phai nop bao cao roi di cho')).toEqual([
      ['Nop bao cao', '2026-10-28', null],
      ['Di cho', null, null],
    ]);
  });

  it('keeps a time said with another day as that day’s deadline, never as a time today', () => {
    expect(brief('dentist at 3 on Friday')).toEqual([['Dentist at 3', '2026-10-30', null]]);
    expect(brief('tối nay 8 giờ gọi cho bà')).toEqual([['Gọi cho bà', '2026-10-27', '20:00']]);
  });

  it.each([
    [
      'so tomorrow I have to call the insurance people and then on Thursday the vet',
      [
        ['Call the insurance people', '2026-10-28', null],
        ['The vet', '2026-10-29', null],
      ],
    ],
    [
      'I need to call mum and tell her about Sunday, and pay the gas bill',
      [
        ['Call mum', null, null],
        ['Tell her about Sunday', null, null],
        ['Pay the gas bill', null, null],
      ],
    ],
    ['meeting with Tom at 2 30', [['Meeting with Tom', null, '14:30']]],
    ['appointment at 2.30pm', [['Appointment', null, '14:30']]],
    ['send Jake the slides by end of day', [['Send Jake the slides', '2026-10-27', null]]],
    [
      'I should probably go to the gym, and maybe also clean the fridge',
      [
        ['Go to the gym', null, null],
        ['Clean the fridge', null, null],
      ],
    ],
    [
      'làm xong báo cáo rồi gửi cho chị Hằng trước thứ 5',
      [
        ['Làm xong báo cáo', null, null],
        ['Gửi cho chị Hằng', '2026-10-29', null],
      ],
    ],
    [
      'cuối tuần này đi cắt tóc với lại mua giày',
      [
        ['Đi cắt tóc', '2026-10-31', null],
        ['Mua giày', null, null],
      ],
    ],
    ['trước 5 giờ chiều phải gửi báo giá cho khách', [['Gửi báo giá cho khách', null, '17:00']]],
    ['đặt bàn ăn tối thứ bảy lúc 7 giờ', [['Đặt bàn ăn tối lúc 7 giờ', '2026-10-31', null]]],
  ])('"%s"', (text, expected) => {
    expect(brief(text)).toEqual(expected);
  });

  it('never loses a ramble it cannot split: it lands as one task, as said', () => {
    const heard = hear("I don't even know. Everything is a mess", clock);

    expect(heard.how).toBe('sentences');
    expect(heard.tasks.map((task) => task.text)).toEqual([
      "I don't even know. Everything is a mess",
    ]);
  });

  it('keeps a task that is only a date in the words it was said in', () => {
    expect(hearTask('tomorrow', clock)).toMatchObject({ text: 'Tomorrow', dueDate: '2026-10-28' });
  });
});
