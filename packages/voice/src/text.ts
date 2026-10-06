import type { WordList } from './guide/types';

const vietnameseLetter = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/;

/** Lower case, composed accents, straight apostrophes and single spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** The same text with Vietnamese tone and vowel marks removed, for input typed without them. */
export function stripMarks(text: string): string {
  return normalise(text).normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd');
}

/** The words of a line: runs of letters, digits, apostrophes and hyphens. */
export function wordsOf(text: string): string[] {
  return normalise(text).match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [];
}

/** The share of a line's words that carry a Vietnamese mark, 0 to 1. */
export function vietnameseShare(text: string): number {
  const words = wordsOf(text);
  if (words.length === 0) return 0;
  return words.filter((word) => vietnameseLetter.test(word)).length / words.length;
}

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One pattern that finds any entry of a word list as a whole word or phrase. */
export function wordListPattern(list: WordList): RegExp {
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
