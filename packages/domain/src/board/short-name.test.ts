import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { reword } from './actions';
import { SHORT_NAME_MOST, shortName, taskLanguage } from './short-name';
import { newTask } from './task';

const words = (text: string) =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((word) => word !== '');

describe('a short name in English', () => {
  it.each([
    ['Email the dentist to move Thursday', 'Dentist email'],
    ['Email the landlord about the sink', 'Landlord email'],
    ['Send an email to Minh about the party', 'Minh email'],
    ['Renew passport', 'Renew passport'],
    ['Reply to Minh', 'Reply to Minh'],
    ['Reply to Minh about the party', 'Reply to Minh'],
    ['Cancel the gym trial', 'Cancel gym trial'],
    ['The tax receipts', 'Tax receipts'],
    ['Okay so I need to call the bank about the card thing', 'Call bank'],
    ['I need to finish the report for Monday', 'Finish report'],
    ['Buy a birthday gift for Linh before Saturday', 'Buy birthday gift'],
    ['Pick up the kids from school', 'Pick up kids'],
    ['Read chapter 4', 'Read chapter 4'],
    [
      'Write to the council about the broken streetlight on the corner before the end of the month',
      'Write to council',
    ],
  ])('%s → %s', (task, short) => {
    expect(shortName(task)).toBe(short);
  });

  it('keeps the verb and the main word when the whole phrase does not fit', () => {
    expect(shortName('Organise every single photograph from the wedding')).toBe(
      'Organise photograph',
    );
    expect(shortName('Finish the quarterly budget report for Sarah')).toBe('Finish budget report');
  });

  it('cuts at a word, never inside one, and leaves no word hanging', () => {
    expect(shortName('Pick up the dry cleaning and the parcel from the post office')).toBe(
      'Pick up dry cleaning',
    );
  });

  it.each([
    ['Evaluation for Gemini replacement', 'Gemini replacement eval'],
    ['Meeting with Tom', 'Tom meeting'],
    ['The onboarding doc for the new hires, it needs a section on VPN', 'New hires onboarding doc'],
    ['Tickets for the concert on Friday', 'Concert tickets'],
  ])('names a thing by what it is for: %s → %s', (task, short) => {
    expect(shortName(task)).toBe(short);
  });
});

describe('a short name in Vietnamese', () => {
  it.each([
    ['Gửi email cho nha sĩ dời lịch thứ Năm', 'Email nha sĩ'],
    ['Gửi email cho chủ nhà về bồn rửa', 'Email chủ nhà'],
    ['Nhắn chủ nhà về bồn rửa', 'Nhắn chủ nhà'],
    ['Gọi điện cho cô Lan', 'Gọi cô Lan'],
    ['À mình cần gọi ngân hàng về cái thẻ', 'Gọi ngân hàng'],
    ['Gia hạn hộ chiếu', 'Gia hạn hộ chiếu'],
    ['Trả lời Minh', 'Trả lời Minh'],
    ['Hủy gói tập thử ở phòng gym', 'Hủy gói tập thử'],
    ['Mua quà sinh nhật cho Linh trước thứ Bảy', 'Mua quà sinh nhật'],
    ['Nhớ mua sữa tối nay', 'Mua sữa'],
    ['Đặt lịch bảo dưỡng xe', 'Đặt lịch bảo dưỡng xe'],
    ['Làm cái đánh giá cho việc thay Gemini', 'Đánh giá thay Gemini'],
    ['Cái báo cáo tài chính quý ba ấy là phải nộp cho chị Hương', 'Báo cáo tài chính quý ba'],
    ['Thì là mình cần gọi cho bên bảo hiểm về cái xe', 'Gọi bên bảo hiểm'],
  ])('%s → %s', (task, short) => {
    expect(shortName(task)).toBe(short);
  });

  it('reads the language from the task’s own letters', () => {
    expect(taskLanguage('Gia hạn hộ chiếu')).toBe('vi');
    expect(taskLanguage('Renew passport')).toBe('en');
  });
});

describe('a task’s short name', () => {
  it('is worked out when the task is said, and again when it is reworded', () => {
    const said = newTask({ id: 'a', text: 'Email the dentist to move Thursday', at: 0 });
    expect(said.short).toBe('Dentist email');
    expect(reword(said, 'Gửi email cho chủ nhà về bồn rửa', 1).short).toBe('Email chủ nhà');
  });
});

describe('every short name', () => {
  const tasks = fc.oneof(
    fc.string({ maxLength: 120 }),
    fc
      .array(
        fc.constantFrom(
          'email',
          'the',
          'dentist',
          'to',
          'about',
          'call',
          'Minh',
          'gửi',
          'cho',
          'nha',
          'sĩ',
          'về',
          'gọi',
          'mình',
          'cần',
          'I',
          'need',
          'a',
          'very-long-word-indeed',
          'evaluation',
          'for',
          'Gemini',
          'meeting',
          'hospital',
          'results',
          'kết',
          'quả',
          'and',
          'buy',
          'milk',
          'Thursday',
          '4',
          ',',
          '.',
        ),
        { minLength: 1, maxLength: 16 },
      )
      .map((list) => list.join(' ')),
  );

  it('is made only of the task’s own words, or their starts, so it says nothing the task did not', () => {
    fc.assert(
      fc.property(tasks, (task) => {
        const said = words(task);
        for (const word of words(shortName(task))) {
          expect(said.some((one) => one === word || one.startsWith(word))).toBe(true);
        }
      }),
    );
  });

  it('fits the chalk unless its first word alone is longer, and is the same every time', () => {
    fc.assert(
      fc.property(tasks, (task) => {
        const short = shortName(task);
        const first = short.split(' ')[0] ?? '';
        expect(short.length <= SHORT_NAME_MOST || short === first).toBe(true);
        expect(shortName(task)).toBe(short);
      }),
    );
  });

  it('is never empty for a task with words in it', () => {
    fc.assert(
      fc.property(tasks, (task) => {
        if (words(task).length > 0) expect(shortName(task)).not.toBe('');
      }),
    );
  });
});
