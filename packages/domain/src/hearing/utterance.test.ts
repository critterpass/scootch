import { describe, expect, it } from 'vitest';

import { shortName } from '../board/short-name';

import { hear } from './hear';

// 27 October 2026 is a Tuesday; it is eleven in the morning.
const clock = { today: '2026-10-27', nowMinutes: 11 * 60 };

/**
 * One hold to talk, as the phone puts it together: every phrase Scribe settled after a pause,
 * with its own full stop or trailing dots, joined by a space.
 */
const utterance = (...settled: string[]) => settled.join(' ');

/** What lands on the board: each task's words, its chalk name, its day and its time. */
const landed = (text: string) =>
  hear(text, clock).tasks.map((task) => ({
    task: task.text,
    chalk: task.short ?? shortName(task.text),
    due: task.dueDate,
    at: task.heardTime?.at ?? null,
  }));

describe('one long task said with fillers and pauses stays one task', () => {
  it('in English, with filler, a false start and trailing dots between phrases', () => {
    expect(landed(utterance('Uhm.', 'We need...', 'Evaluation for Gemini replacement.'))).toEqual([
      {
        task: 'Evaluation for Gemini replacement',
        chalk: 'Gemini replacement eval',
        due: null,
        at: null,
      },
    ]);
  });

  it('in English, with the reason and the day said after pauses', () => {
    expect(
      landed(
        utterance(
          'Okay so, uh, I need to finish the, the quarterly report.',
          'For Sarah.',
          'Before Friday.',
        ),
      ),
    ).toEqual([
      {
        task: 'Finish the quarterly report for Sarah',
        chalk: 'Finish quarterly report',
        due: '2026-10-30',
        at: null,
      },
    ]);
  });

  it('in English, when nothing in it looks like a task', () => {
    expect(
      landed(utterance('Um, so, the thing with the landlord.', 'About the deposit, you know.')),
    ).toEqual([
      {
        task: 'The thing with the landlord about the deposit',
        chalk: 'Landlord thing',
        due: null,
        at: null,
      },
    ]);
  });

  it('in Vietnamese, with ờ, thì là, kiểu and trailing dots', () => {
    expect(
      landed(utterance('Ờ.', 'Thì là… mình cần, kiểu, làm cái đánh giá…', 'cho việc thay Gemini.')),
    ).toEqual([
      {
        task: 'Làm cái đánh giá cho việc thay Gemini',
        chalk: 'Đánh giá thay Gemini',
        due: null,
        at: null,
      },
    ]);
  });

  it('in Vietnamese, with the topic first and the rest after a pause', () => {
    expect(
      landed(
        utterance(
          'À, ừm, cái báo cáo tài chính quý ba ấy.',
          'Là phải nộp cho chị Hương.',
          'Trước thứ Sáu.',
        ),
      ),
    ).toEqual([
      {
        task: 'Cái báo cáo tài chính quý ba ấy là phải nộp cho chị Hương',
        chalk: 'Báo cáo tài chính quý ba',
        due: '2026-10-30',
        at: null,
      },
    ]);
  });

  it('in Vietnamese, with a false start said twice', () => {
    expect(
      landed(utterance('Ừm, kiểu là, mình phải, mình phải gọi cho bên bảo hiểm…', 'về cái xe.')),
    ).toEqual([
      { task: 'Gọi cho bên bảo hiểm về cái xe', chalk: 'Gọi bên bảo hiểm', due: null, at: null },
    ]);
  });
});

describe('separate things said one after another are separate tasks', () => {
  it('in English, joined by "and also" and "then I have to"', () => {
    expect(
      landed(
        utterance(
          'Um, I need to call the dentist,',
          'and also pay the electricity bill.',
          'Then I have to pick up the kids at three.',
        ),
      ),
    ).toEqual([
      { task: 'Call the dentist', chalk: 'Call dentist', due: null, at: null },
      { task: 'Pay the electricity bill', chalk: 'Pay electricity bill', due: null, at: null },
      { task: 'Pick up the kids', chalk: 'Pick up kids', due: null, at: '15:00' },
    ]);
  });

  it('in English, as a list of things', () => {
    expect(
      landed(utterance('Okay.', 'Laundry.', 'Dishes.', 'Bins.')).map(({ task }) => task),
    ).toEqual(['Laundry', 'Dishes', 'Bins']);
  });

  it('in Vietnamese, joined by "với lại" and "rồi còn phải"', () => {
    expect(
      landed(
        utterance(
          'Ừm, mình phải gọi cho mẹ tối nay,',
          'với lại nộp báo cáo trước thứ Sáu.',
          'Rồi còn phải mua sữa nữa.',
        ),
      ),
    ).toEqual([
      { task: 'Gọi cho mẹ', chalk: 'Gọi mẹ', due: '2026-10-27', at: null },
      { task: 'Nộp báo cáo', chalk: 'Nộp báo cáo', due: '2026-10-30', at: null },
      { task: 'Mua sữa', chalk: 'Mua sữa', due: null, at: null },
    ]);
  });
});

describe('a chalk name', () => {
  it.each([['Uhm'], ['We need'], ['À'], ['Mình cần']])(
    'is never a filler or a fragment: "%s" alone puts nothing on the board',
    (said) => {
      expect(hear(said, clock).tasks).toEqual([]);
    },
  );
});
