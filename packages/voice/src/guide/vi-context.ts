import type { ContextWord } from './types';

const person = 'bạn|con|em|đứa|người|trẻ|bé';
const degree = 'thật|thiệt|quá|hơi|rất|cũng|nào|làm';

/**
 * Vietnamese banned words that have a harmless sense. Each fails when it judges a person or
 * points at something that slipped, and passes when it describes a thing: "bạn hư quá" against
 * "máy giặt bị hư", "giữ chuỗi" against "chuỗi nhà hàng", "cuối cùng bạn cũng" against "miếng
 * cuối cùng". Every word of the banned list was read for this; the ones left in the plain list
 * have no harmless sense in Scootch's voice.
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
    word: 'chuỗi',
    reason: 'banned_word',
    lapse: [
      'chuỗi (?:ngày|tuần|thắng|thua|kỷ lục|thành tích|liên tiếp|streak|\\d+)',
      '(?:giữ|đứt|mất|phá|nối|duy trì|gãy) chuỗi',
    ],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'cuối cùng',
    reason: 'banned_word',
    lapse: ['cuối cùng (?:thì |rồi |là )?(?:bạn|cũng|đã|chịu|mới)', '(?<=^|[.!?,:] )cuối cùng'],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'có lỗi',
    reason: 'banned_word',
    lapse: ['(?:bạn|mình|tui|thấy|cảm thấy|biết) có lỗi', 'có lỗi (?:với|gì đâu|quá)'],
    safe: [],
    otherwise: 'pass',
  },
  {
    word: 'nhỡ',
    reason: 'banned_word',
    lapse: ['gọi nhỡ', 'nhỡ (?:hẹn|việc|chuyến|tàu|xe|dịp)'],
    safe: ['nhỡ (?:đâu|may|mà|như)', '(?:cỡ|hạng|tầm) nhỡ'],
    otherwise: 'fail',
  },
  {
    word: 'trễ',
    reason: 'banned_word',
    lapse: [],
    safe: ['(?:phí|tiền phạt)(?: nộp| trả| thanh toán)? trễ(?: hạn)?'],
    otherwise: 'fail',
  },
  {
    word: 'xấu hổ',
    reason: 'banned_word',
    lapse: [],
    safe: ['(?:cây|hoa|lá|chậu) xấu hổ'],
    otherwise: 'fail',
  },
  {
    word: 'mày',
    reason: 'banned_word',
    lapse: [],
    safe: ['(?:lông|chân|mặt) mày', 'mày (?:mò|râu|đay)'],
    otherwise: 'fail',
  },
  {
    word: 'tao',
    reason: 'banned_word',
    lapse: [],
    safe: ['tao nhã', 'thanh tao'],
    otherwise: 'fail',
  },
  {
    word: 'hong',
    reason: 'banned_word',
    lapse: [],
    safe: ['hong (?:khô|tóc|nắng|gió|quần|áo|đồ|cho khô)', 'phơi hong'],
    otherwise: 'fail',
  },
  {
    word: 'vẫn chưa',
    reason: 'user_worth',
    lapse: ['(?:bạn|mình|ta) vẫn chưa'],
    safe: [
      'vẫn chưa (?:ai|có ai|thấy ai|đội nào|bên nào|tới giờ|đến giờ|hết (?:giờ|hạn|hiệp)|tới lượt|đến lượt)',
    ],
    otherwise: 'fail',
  },
];
