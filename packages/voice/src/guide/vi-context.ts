import type { ContextWord } from './types';

const person = 'bạn|con|em|đứa|người|trẻ|bé';
const degree = 'thật|thiệt|quá|hơi|rất|cũng|nào|làm';

/**
 * Vietnamese words that are banned when they judge a person and fine when they describe a thing:
 * "bạn hư quá" against "máy giặt bị hư", "bạn tệ thật" against "ngoại tệ", "Chúa ơi" against
 * "công chúa".
 */
export const viContextWords: readonly ContextWord[] = [
  {
    word: 'hư',
    reason: 'banned_word',
    lapse: [
      `(?:${person}|thói|tính|nết)(?: (?:${degree}))? hư`,
      'hư (?:quá|thế|lắm|ghê|vậy|đốn|thân|thật|thiệt)',
      'chiều hư',
    ],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'tệ',
    reason: 'banned_word',
    lapse: [
      `(?:${person}|mình|tui)(?: (?:${degree}))? tệ`,
      'tệ (?:quá|thật|thiệt|lắm|ghê|hại|bạc|thế|vậy|hơn|nhất|dữ|với)',
      'tồi tệ',
    ],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'chúa',
    reason: 'topic_religion',
    lapse: ['chúa ơi', 'lạy chúa', 'chúa trời', 'ơn chúa', 'cầu chúa', 'đạo chúa', 'nhà chúa'],
    safe: [
      'công chúa',
      'chúa tể',
      'bà chúa',
      'ong chúa',
      'kiến chúa',
      'mối chúa',
      'chúa sơn lâm',
      'chúa đảo',
      'vua chúa',
      'lãnh chúa',
      'chúa nhật',
    ],
    otherwise: 'fail',
  },
];
