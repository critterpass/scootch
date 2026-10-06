import type { ContextWord } from './types';

const feeling = 'sợ|mệt|đói|vui|mừng|thèm|chán|nóng|lạnh|ngại|đau|mắc cười|buồn cười';
const cloth =
  'quần|áo|váy|đầm|vải|ga|rèm|khăn|giấy|sơ mi|chăn|mền|màn|đồng phục|vest|bàn ủi|bàn là';
const idiom = 'cười|mê|mệt|đứng|trân|lặng|khiếp|dở|thật|chưa|máy|pin';

/**
 * Vietnamese off-limits words that also live in everyday phrases: a word fails when it is really
 * about the topic (a faith, a person's body, a death) and passes inside the phrase that makes it
 * ordinary: "công chúa", "ăn chùa", "cá mập", "chết cười", "giết thời gian". Every word of the
 * topic lists was read for this; the ones left in the plain lists only mean the topic.
 */
export const viTopicContextWords: readonly ContextWord[] = [
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
  {
    word: 'thánh',
    reason: 'topic_religion',
    lapse: [],
    safe: ['thánh thót'],
    otherwise: 'fail',
  },
  {
    word: 'phật',
    reason: 'topic_religion',
    lapse: [],
    safe: ['phật (?:ý|lòng)'],
    otherwise: 'fail',
  },
  {
    word: 'chùa',
    reason: 'topic_religion',
    lapse: [],
    safe: ['(?:ăn|xài|dùng|coi|xem|nghe|đọc|hàng|đồ|của|wifi|wi-fi|mạng) chùa'],
    otherwise: 'fail',
  },
  {
    word: 'béo',
    reason: 'topic_bodies',
    lapse: [`(?:bạn|mình|tui|người|ai|đứa|trông|nhìn) (?:hơi |quá |rất |thật |cũng )?béo`],
    safe: ['béo (?:ngậy|bở)', '(?:vị|chất|sữa|kem|nước cốt|váng|ít|nhiều|không|tách|giàu) béo'],
    otherwise: 'fail',
  },
  {
    word: 'mập',
    reason: 'topic_bodies',
    lapse: [],
    safe: ['cá mập', 'mập mờ'],
    otherwise: 'fail',
  },
  {
    word: 'gầy',
    reason: 'topic_bodies',
    lapse: [],
    safe: ['gầy (?:dựng|sòng|độ)'],
    otherwise: 'fail',
  },
  {
    // Wrinkles are the cloth's or the paper's; on a face, or with no owner named, they fail.
    word: 'nếp nhăn',
    reason: 'topic_bodies',
    lapse: [
      'nếp nhăn(?: [\\p{L}]+){0,3} (?:mặt|trán|mắt|da|bạn|mình|tui|mẹ|bà|ông)',
      '(?:mặt|trán|mắt|da|bạn|mẹ|bà|ông|già|tuổi)(?: [\\p{L}]+){0,3} nếp nhăn',
      '(?:xoá|xóa|chống|giảm|trị|ngừa|mờ) nếp nhăn',
    ],
    safe: [
      `(?:${cloth})(?: [\\p{L}\\p{N}]+){0,6}? nếp nhăn`,
      `nếp nhăn (?:trên|ở|của|trong) (?:cái |chiếc |tấm |tờ |bộ )?(?:${cloth})`,
    ],
    otherwise: 'fail',
  },
  {
    word: 'chết',
    reason: 'topic_harm',
    lapse: [
      `(?:tui|mình|bạn|ta) (?:sắp |muốn |thà |chắc |gần |suýt |sẽ |đã )?chết(?! (?:${idiom})(?![\\p{L}]))`,
      'chết (?:đi|quách|cho rồi|cho xong)',
    ],
    safe: [
      `chết (?:${idiom})`,
      'cười (?:muốn |gần |đến |tới |sắp )?chết',
      `(?:${feeling}) (?:muốn |gần |đến |tới |sắp )?chết`,
      '(?:pin|máy|đồng hồ|cây|hoa|xe|bóng đèn|wifi|chuột|bàn phím|điện thoại) (?:đã |sắp |bị |lại |vừa )?chết',
      '(?:giờ|điểm|góc) chết',
    ],
    otherwise: 'fail',
  },
  {
    word: 'giết',
    reason: 'topic_harm',
    lapse: [],
    safe: ['giết (?:thời gian|thì giờ)'],
    otherwise: 'fail',
  },
];
