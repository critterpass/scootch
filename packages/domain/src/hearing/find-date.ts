import { resolveHeardDate } from './deadlines';
import { END, START, bothForms, formFor, hasMarks, tidy, type Found } from './text';

/** Finding the user's phrase for a day in what they said, in English and Vietnamese. */

const MONTH_NAMES =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const EN_NUMBER = '(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|\\d{1,2})';
const EN_LEAD = '(?:(?:by|on|before|until|till|due|for|this|coming|from)\\s+)*';

const english: readonly RegExp[] = [
  `${EN_LEAD}(?:next\\s+)?(?:the\\s+)?(?<!(?:about|of|since|last|from)\\s)(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\\s+(?:next|this)\\s+week)?`,
  `(?:(?:by|on|before|until|till|due|this|next|coming)\\s+)+(?:mon|tues?|wed|thur?s?|fri)\\.?`,
  `(?:(?:by|before|until)\\s+)?(?:the\\s+)?day\\s+after\\s+tomorrow`,
  `(?:(?:by|before|until)\\s+)?tomorrow(?:\\s+(?:morning|afternoon|evening|night))?`,
  `(?:(?:by|before)\\s+)?(?:today|tonight|this\\s+(?:morning|afternoon|evening)|(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?day|eod)`,
  `(?:with)?in\\s+${EN_NUMBER}\\s+(?:days?|weeks?)`,
  `(?:(?:by|before)\\s+)?(?:the\\s+)?end\\s+of\\s+(?:the\\s+|this\\s+|next\\s+)?(?:month|week)`,
  `(?:(?:by|before|on|until|over)\\s+)?(?:the\\s+|this\\s+|next\\s+)?weekend`,
  `(?:(?:by|sometime|before|until)\\s+)?next\\s+(?:week|month)`,
  `(?:(?:by|on|before|until|due)\\s+)?\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{4})?(?![/\\d])`,
  `(?:(?:by|on|before|until|due)\\s+)?\\d{1,2}\\.\\d{1,2}\\.\\d{4}`,
  `(?:by|on|before|until|due)\\s+(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)(?:\\s+of\\s+next\\s+month|\\s+next\\s+month)?`,
  `(?:(?:by|on|before|until|due)\\s+)?(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_NAMES}`,
  `(?:(?:by|on|before|until|due)\\s+)?${MONTH_NAMES}\\s+\\d{1,2}(?:st|nd|rd|th)?(?!\\s*(?:am|pm|:|h\\b))`,
].map((source) => new RegExp(`${START}(?:${source})${END}`, 'gu'));

const VI_LEAD =
  '(?:(?:trước|vào|hạn chót|hạn|đến|tới|hết|trong|chậm nhất|muộn nhất|nội trong)\\s+)?';
const VI_NUMBER = '(?:\\d{1,2}|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)';
/** Words before "thứ hai" that make it "the second", not Monday. */
const VI_ORDINAL_BEFORE = '(?<!(?:lần|việc|cái|điều|người|bước|là|chương|bài|phần|tập|hạng)\\s)';
/** Words before "mai" that make it a name, not tomorrow. */
const VI_NAME_BEFORE =
  '(?<!(?:cho|với|gặp|chị|anh|em|bạn|cô|bà|ông|của|bé|con|thăm|chú|dì|cậu|mợ|thím|hoa|tên|nhà|hỏi|gọi|nhắn|đón)\\s)';

type ViPattern = { readonly source: string; readonly markedOnly?: boolean; readonly mai?: boolean };

const vietnameseSources: readonly ViPattern[] = [
  {
    source: `${VI_LEAD}(?:ngày\\s+)?${VI_ORDINAL_BEFORE}(?:thứ\\s+(?:hai|ba|tư|năm|sáu|bảy|[2-7])|chủ\\s+nhật|t[2-7]|cn)(?:\\s+tuần\\s+(?:sau|tới|này))?`,
  },
  { source: `${VI_LEAD}ngày\\s+(?:mốt|kia)` },
  { source: `${VI_LEAD}mốt`, markedOnly: true },
  { source: `${VI_LEAD}(?:ngày|sáng|trưa|chiều|tối|đêm)\\s+mai` },
  { source: `${VI_LEAD}${VI_NAME_BEFORE}mai`, mai: true },
  { source: `${VI_LEAD}(?:hôm|tối|chiều|sáng|trưa)\\s+nay` },
  { source: `${VI_LEAD}${VI_NUMBER}\\s+(?:ngày|tuần)\\s+nữa` },
  { source: `${VI_LEAD}cuối\\s+(?:tuần|tháng)(?:\\s+(?:này|sau|tới))?` },
  {
    source: `${VI_LEAD}(?<!(?:\\d|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\\s)(?:tuần|tháng)\\s+(?:sau|tới)`,
  },
  {
    source: `${VI_LEAD}(?:ngày|mùng|mồng)\\s+\\d{1,2}(?:\\s*(?:tháng\\s+\\d{1,2}|tháng\\s+(?:sau|tới)|/\\d{1,2}(?:/\\d{4})?))?`,
  },
  { source: `${VI_LEAD}\\d{1,2}\\s+tháng\\s+\\d{1,2}` },
  { source: `${VI_LEAD}\\d{1,2}/\\d{1,2}(?:/\\d{4})?(?![/\\d])` },
];

const vietnamese = vietnameseSources.map((pattern) => ({
  ...pattern,
  forms: bothForms(`${START}(?:${pattern.source})${END}`),
}));

/** Every match of every pattern, earliest first and longest first where two start together. */
function allMatches(lower: string, patterns: readonly RegExp[]): Found[] {
  const found: Found[] = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of lower.matchAll(pattern)) {
      found.push({ start: match.index, end: match.index + match[0].length, phrase: match[0] });
    }
  }
  return found.sort((a, b) => a.start - b.start || b.end - a.end);
}

function dateMatches(said: string): Found[] {
  const lower = said.toLowerCase();
  const marked = hasMarks(lower);
  const vi: Found[] = [];
  for (const pattern of vietnamese) {
    if (pattern.markedOnly === true && !marked) continue;
    const regex = formFor(pattern.forms, marked);
    regex.lastIndex = 0;
    for (const match of lower.matchAll(regex)) {
      const start = match.index;
      const end = start + match[0].length;
      // A bare "mai" written with a capital is someone's name.
      if (pattern.mai === true && said.slice(end - 3, end) !== 'mai') continue;
      vi.push({ start, end, phrase: lower.slice(start, end) });
    }
  }
  return [...allMatches(lower, english), ...vi].sort((a, b) => a.start - b.start || b.end - a.end);
}

/** Whether a text names a day anywhere, whether or not it can be pinned down. */
export function mentionsDate(text: string): boolean {
  const said = tidy(text);
  return said.toLowerCase().length === said.length && dateMatches(said).length > 0;
}

export type DueDate = {
  readonly date: string;
  /** The user's words for it, as they appear in the tidied text. */
  readonly heardAs: string;
  readonly start: number;
  readonly end: number;
};

/**
 * The first day named in a text that can be pinned to one day, today or within a year. The text
 * should be one task; the first day it names is its due date.
 */
export function findDueDate(
  text: string,
  options: { readonly today: string; readonly dayFirst?: boolean },
): DueDate | null {
  const said = tidy(text);
  if (said.toLowerCase().length !== said.length) return null;
  const tried: Found[] = [];
  for (const found of dateMatches(said)) {
    // A shorter reading inside a phrase already turned down is not a second chance.
    if (tried.some((one) => found.start < one.end && one.start < found.end)) continue;
    tried.push(found);
    const date = resolveHeardDate({
      heardAs: found.phrase,
      candidate: '',
      text: said,
      localDate: options.today,
      dayFirst: options.dayFirst ?? true,
    });
    if (date !== null) {
      return {
        date,
        heardAs: said.slice(found.start, found.end),
        start: found.start,
        end: found.end,
      };
    }
  }
  return null;
}
