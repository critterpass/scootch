import { describe, expect, it } from '@jest/globals';

import { DAY_MS, newTask, type Task } from '@phusclass/domain/board';

import { reportCard, reportSubjectOf, termOf, termsOfYear } from './report-model';

function finished(
  id: string,
  text: string,
  day: string,
  over: Partial<Task> = {},
  waited = 3,
): Task {
  const at = Date.parse(`${day}T09:00:00Z`);
  return {
    ...newTask({ id, text, at: at - waited * DAY_MS }),
    status: 'done',
    done: { at, day, periodMinutes: 10, comment: 'good', carving: null, giayKhen: false },
    ...over,
  };
}

describe('the report card', () => {
  it('runs the school year in two terms, from khai giảng to January, then February to July', () => {
    expect(termOf('2026-10-27')).toEqual({
      number: 1,
      years: '2026–27',
      from: '2026-08-01',
      until: '2027-02-01',
    });
    expect(termOf('2027-01-20').number).toBe(1);
    expect(termOf('2027-03-01')).toMatchObject({ number: 2, years: '2026–27' });
    expect(termsOfYear('2027-03-01').map((term) => term.number)).toEqual([1, 2]);
    expect(termsOfYear('2026-10-27')[1].from).toBe('2027-02-01');
  });

  it('files finished tasks under subjects, a couple each, in the words they were said', () => {
    const tasks = [
      finished('a', 'Tax receipts', '2026-10-01'),
      finished('b', 'Renew passport', '2026-10-02'),
      finished('c', 'Email the dentist', '2026-10-03'),
      finished('d', 'Fix the bike light', '2026-10-04'),
      finished('e', 'Gửi biên lai thuế', '2026-10-05'),
    ];
    const card = reportCard(tasks, termOf('2026-10-27'));
    expect(card.lines).toEqual([
      { subject: 'paperwork', examples: ['Gửi biên lai thuế', 'Renew passport'] },
      { subject: 'home', examples: ['Fix the bike light'] },
      { subject: 'calls', examples: ['Email the dentist'] },
    ]);
    expect(reportSubjectOf('Đọc chương 4')).toBe('study');
  });

  it('names the hardest one by how long it waited and how long it took', () => {
    const tasks = [
      finished('a', 'Tax receipts', '2026-10-01', {}, 2),
      finished('b', 'Email the dentist', '2026-10-10', {}, 9),
      finished('c', 'Ticked off', '2026-10-11', {}, 30),
    ];
    const ticked = tasks[2]!;
    tasks[2] = { ...ticked, done: { ...ticked.done!, periodMinutes: null } };
    expect(reportCard(tasks, termOf('2026-10-27')).hardest).toEqual({
      text: 'Email the dentist',
      waitedDays: 9,
      tookMinutes: 10,
    });
  });

  it('leaves out anything heavy, anything open and anything from another term', () => {
    const tasks = [
      finished('a', 'Call the hospital', '2026-10-01', { care: 'serious' }),
      finished('b', 'Next term thing', '2027-03-01'),
      { ...finished('c', 'Still open', '2026-10-01'), status: 'board' as const, done: null },
    ];
    const card = reportCard(tasks, termOf('2026-10-27'));
    expect(card).toMatchObject({ empty: true, lines: [], hardest: null });
  });

  it('holds no counts, totals or averages', () => {
    const card = reportCard([finished('a', 'Tax receipts', '2026-10-01')], termOf('2026-10-27'));
    const keys = JSON.stringify(card).toLowerCase();
    for (const word of ['count', 'total', 'average', 'streak']) expect(keys).not.toContain(word);
  });
});
