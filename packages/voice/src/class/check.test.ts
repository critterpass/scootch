import { describe, expect, it } from 'vitest';

import { checkClassLine, type ClassCheckReason } from './check';
import type { ClassLanguage } from './types';

type Bad = readonly [ClassLanguage, string, ClassCheckReason];

const knownBad: readonly Bad[] = [
  // Banned words, in either language.
  ['en', 'Lazy again, are we?', 'banned_word'],
  ['en', 'You finally started.', 'banned_word'],
  ['en', 'Day four of your streak.', 'banned_word'],
  ['en', 'I am disappointed.', 'banned_word'],
  ['en', 'You are behind on the {task}.', 'banned_word'],
  ['en', 'I’ve seen glaciers move faster.', 'banned_word'],
  ['en', 'That was stupid.', 'banned_word'],
  ['en', 'You missed the {task}.', 'banned_word'],
  ['vi', 'Lười thế này thì thôi.', 'banned_word'],
  ['vi', 'Thầy thất vọng về em.', 'banned_word'],
  ['vi', 'Cuối cùng cũng chịu làm.', 'banned_word'],
  ['vi', 'Hôm qua em vắng mặt.', 'banned_word'],
  ['vi', 'Mai thầy mời phụ huynh.', 'banned_word'],
  ['vi', 'Lại nữa rồi đấy.', 'banned_word'],
  ['vi', 'Học dốt thì phải chăm.', 'banned_word'],
  // About the person: worth, intelligence, body, past.
  ['en', 'You’re so clever when you try.', 'about_person'],
  ['en', 'Last time you did this in an hour.', 'about_person'],
  ['en', 'You always leave the {task} to me.', 'about_person'],
  ['en', 'Your brain is on holiday.', 'about_person'],
  ['vi', 'Em thông minh mà sao thế.', 'about_person'],
  ['vi', 'Lần trước em làm nhanh hơn.', 'about_person'],
  ['vi', 'Em béo lên rồi đấy.', 'about_person'],
  // Counting days, or any gap.
  ['en', 'Three days since the {task}.', 'counts_days'],
  ['en', 'Day 4. The {task} waits.', 'counts_days'],
  ['en', 'Welcome back. Sit.', 'mentions_gap'],
  ['en', 'Where have you been?', 'mentions_gap'],
  ['vi', 'Ba ngày rồi chưa làm.', 'counts_days'],
  ['vi', 'Lâu rồi không thấy em.', 'mentions_gap'],
  ['vi', 'Mấy hôm nay em đi đâu?', 'mentions_gap'],
  // Comparison with other people.
  ['en', 'Everyone else finished hours ago.', 'comparison'],
  ['en', 'Other students do this in ten minutes.', 'comparison'],
  ['vi', 'Con nhà người ta làm xong từ sáng.', 'comparison'],
  ['vi', 'Các bạn làm xong hết rồi.', 'comparison'],
  // Length and placeholders.
  ['en', 'Two minutes. '.repeat(10), 'too_long'],
  ['en', '{chore}. Two minutes.', 'unknown_placeholder'],
  ['en', '{task. Two minutes.', 'unknown_placeholder'],
  ['vi', '{treat} sau giờ học.', 'unknown_placeholder'],
  // The wrong language for the pack.
  ['vi', 'Two minutes. I will wait for you.', 'wrong_language'],
  ['en', 'Hai phút. Thầy đợi em.', 'wrong_language'],
  ['en', '   ', 'empty'],
];

describe('the line check', () => {
  it.each(knownBad)('rejects (%s) "%s" for %s', (language, line, reason) => {
    const result = checkClassLine(line, language);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(reason);
  });

  it.each([
    ['en', 'I have thirty-two years of practice.'],
    ['en', 'Not now, Mèo.'],
    ['en', 'It has more tally marks than I have hair.'],
    ['en', '{NAME}. Desk. Now.'],
    ['vi', 'Nó nhiều vạch hơn tóc thầy.'],
    ['vi', 'Một tháng miễn phí. Bàn sẵn rồi.'],
    ['vi', 'Hạn {date}. Đúng hôm đó thầy mang ra.'],
  ] as const)('lets (%s) "%s" through: about the task or about himself', (language, line) => {
    expect(checkClassLine(line, language)).toEqual({ ok: true, reasons: [] });
  });

  it('checks the words around a placeholder, not what fills it', () => {
    expect(checkClassLine('{task}. Two minutes.', 'en').ok).toBe(true);
  });
});
