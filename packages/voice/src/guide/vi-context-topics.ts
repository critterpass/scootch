import type { ContextWord } from './types';

const feeling = 'sợ|mệt|đói|vui|mừng|thèm|chán|nóng|lạnh|ngại|đau|mắc cười|buồn cười';
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
