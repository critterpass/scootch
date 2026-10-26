/**
 * Text helpers for hearing, kept here so the phone's hearing needs nothing else: the same
 * normalising the server's checks use, and a way to read Vietnamese typed without its marks.
 */

/** Lower case, composed accents, straight apostrophes and single spaces. */
export function normalise(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

/** The same text with Vietnamese tone and vowel marks removed, for input typed without them. */
export function stripMarks(text: string): string {
  return normalise(text).normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd');
}

/**
 * Marks taken off letter by letter, keeping every index where it was: position 5 in the result
 * is position 5 in the text. A character that would change length is left as it is.
 */
export function foldMarks(text: string): string {
  let folded = '';
  for (const character of text) {
    const bare = character
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
    folded += bare.length === character.length ? bare : character;
  }
  return folded;
}

/** Whether the text carries any Vietnamese mark at all. */
export function hasMarks(text: string): boolean {
  return foldMarks(text) !== text;
}

/** The words of a line: runs of letters, digits, apostrophes and hyphens. */
export function wordsOf(text: string): string[] {
  return normalise(text).match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [];
}

/**
 * The text tidied but still in the user's case: composed accents, straight apostrophes, single
 * spaces. Lower-casing it keeps every index (checked by `lowerKeepsIndices`).
 */
export function tidy(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lowerKeepsIndices(text: string): boolean {
  return text.toLowerCase().length === text.length;
}

/** A Vietnamese pattern in two forms: as written, and for text typed without marks. */
export type BothForms = { readonly marked: RegExp; readonly folded: RegExp };

/** Builds both forms from one source written with its marks. */
export function bothForms(source: string, flags = 'gu'): BothForms {
  return { marked: new RegExp(source, flags), folded: new RegExp(foldMarks(source), flags) };
}

/** The form that fits the text: marked text is read only as marked. */
export function formFor(pattern: BothForms, marked: boolean): RegExp {
  return marked ? pattern.marked : pattern.folded;
}

/** Word edges that work for Vietnamese letters too. */
export const START = '(?<![\\p{L}\\p{N}])';
export const END = '(?![\\p{L}\\p{N}])';

/** A phrase found in a text, by its place in the tidied text. */
export type Found = { readonly start: number; readonly end: number; readonly phrase: string };
