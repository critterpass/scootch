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
