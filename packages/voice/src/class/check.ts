import { classWordLists, type WordList } from './banned';
import { placeholders, type ClassLanguage } from './types';

/** No line of his is longer than this, in characters, placeholders as written. */
export const maxLineLength = 110;
/** Most lines are shorter than this. */
export const shortLineLength = 60;

export type ClassCheckReason =
  | 'empty'
  | 'too_long'
  | 'banned_word'
  | 'about_person'
  | 'counts_days'
  | 'mentions_gap'
  | 'comparison'
  | 'unknown_placeholder'
  | 'wrong_language';

export type ClassLineCheck = {
  readonly ok: boolean;
  readonly reasons: readonly ClassCheckReason[];
};

/** Lower case, composed accents, straight apostrophes and single spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFC')
    .toLocaleLowerCase('vi')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One pattern that finds any entry of a word list as a whole word or phrase. */
function wordListPattern(list: WordList): RegExp {
  const entries = list.map((entry) => {
    const open = entry.endsWith('*');
    const body = normalise(open ? entry.slice(0, -1) : entry)
      .split(' ')
      .map(escapeForPattern)
      .join('[\\s-]+');
    return open ? `${body}[\\p{L}]*` : body;
  });
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${entries.join('|')})(?![\\p{L}\\p{N}])`, 'u');
}

type Patterns = {
  readonly banned: RegExp;
  readonly aboutPerson: RegExp;
  readonly gap: RegExp;
  readonly comparison: RegExp;
};

function patternsFor(language: ClassLanguage): Patterns {
  const lists = classWordLists[language];
  return {
    banned: wordListPattern(lists.banned),
    aboutPerson: wordListPattern(lists.aboutPerson),
    gap: wordListPattern(lists.gap),
    comparison: wordListPattern(lists.comparison),
  };
}

const patterns: Readonly<Record<ClassLanguage, Patterns>> = {
  en: patternsFor('en'),
  vi: patternsFor('vi'),
};

/**
 * Counting days, weeks or months: "three days", "day 4", "ba ngày rồi", "ngày thứ 5". A task may
 * wait, but he never counts it out loud, and he never counts days the app was not opened.
 */
const dayCount: Readonly<Record<ClassLanguage, RegExp>> = {
  en: /(?<![\p{L}\p{N}])(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|many|few|couple of) (?:whole )?(?:days?|weeks?|months?)|days? (?:\d+|one|two|three|four|five|six|seven))(?![\p{L}\p{N}])/u,
  vi: /(?<![\p{L}\p{N}])(?:(?:\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mấy|nhiều|vài) (?:ngày|tuần|tháng) (?:rồi|nay|liền|qua|không|chưa|trời)|ngày thứ \d+)(?![\p{L}\p{N}])/u,
};

const vietnameseLetter = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/u;

/** Words that stay as they are in both languages: names, the drum, and Tết and its cake. */
const sharedWords = new Set(['tùng', 'mèo', 'phú', 'thầy', 'tết', 'bánh', 'chưng']);

function wordsOf(text: string): string[] {
  return normalise(text).match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [];
}

/** An English line full of Vietnamese marks, or a Vietnamese line with none. */
function languageIsWrong(text: string, language: ClassLanguage): boolean {
  const words = wordsOf(text).filter((word) => !sharedWords.has(word));
  if (words.length === 0) return false;
  const share = words.filter((word) => vietnameseLetter.test(word)).length / words.length;
  return language === 'vi' ? words.length >= 4 && share < 0.25 : words.length >= 2 && share > 0.3;
}

const knownPlaceholders = new Set<string>(placeholders);
const placeholderPattern = /\{([^{}]*)\}/g;

/** The placeholders a line holds, in order of first appearance. */
export function placeholdersIn(text: string): string[] {
  return [...new Set([...text.matchAll(placeholderPattern)].map((match) => match[1] ?? ''))];
}

/**
 * Checks one of his lines, from the offline pack or written online, against the voice rules.
 * Pure: the same line always gets the same answer. Returns the reasons only, never the text.
 */
export function checkClassLine(text: string, language: ClassLanguage): ClassLineCheck {
  const raw = text.trim();
  if (raw === '') return { ok: false, reasons: ['empty'] };

  const reasons: ClassCheckReason[] = [];
  if (raw.length > maxLineLength) reasons.push('too_long');

  const unknown = placeholdersIn(raw).some((name) => !knownPlaceholders.has(name));
  // A brace left open or closed on its own is a broken placeholder too.
  const stray = /[{}]/.test(raw.replace(placeholderPattern, ''));
  if (unknown || stray) reasons.push('unknown_placeholder');

  // What the phone fills in is not his wording: the words around it are checked, not the slot.
  const line = normalise(raw.replace(placeholderPattern, ' '));
  const own = patterns[language];
  const other = patterns[language === 'en' ? 'vi' : 'en'];

  if (own.banned.test(line) || other.banned.test(line)) reasons.push('banned_word');
  if (own.aboutPerson.test(line)) reasons.push('about_person');
  if (dayCount[language].test(line)) reasons.push('counts_days');
  if (own.gap.test(line)) reasons.push('mentions_gap');
  if (own.comparison.test(line)) reasons.push('comparison');
  if (languageIsWrong(line, language)) reasons.push('wrong_language');

  return { ok: reasons.length === 0, reasons };
}
