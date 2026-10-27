/** The pieces both languages' short names are made with. */

/** The longest short name, in characters. A longer one is cut at a word. */
export const SHORT_NAME_MOST = 24;

/**
 * One word as written, the same word lower-cased for matching, and whether a comma or a stop came
 * right after it.
 */
export type ChalkWord = { readonly said: string; readonly low: string; readonly pause: boolean };

/** The task's words, with the punctuation around each one taken off. */
export function chalkWords(text: string): ChalkWord[] {
  return text
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .split(/\s+/)
    .map((written) => ({
      said: written.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''),
      pause: /[,.;:!?…]$/u.test(written),
    }))
    .filter(({ said }) => said !== '')
    .map(({ said, pause }) => ({ said, low: said.toLowerCase(), pause }));
}

/** The words up to and including the first one a comma or a stop follows. */
export function upToPause(words: readonly ChalkWord[]): ChalkWord[] {
  const at = words.findIndex((word) => word.pause);
  return at === -1 ? [...words] : words.slice(0, at + 1);
}

/** Whether a word starts with a capital, as a name does. */
export function isCapital(word: ChalkWord): boolean {
  return word.said !== word.low;
}

/** The words with any leading phrase from `phrases` taken off, as often as one matches. */
export function withoutLeading(
  words: readonly ChalkWord[],
  phrases: readonly (readonly string[])[],
): ChalkWord[] {
  let rest = [...words];
  for (let matched = true; matched && rest.length > 1;) {
    matched = false;
    for (const phrase of phrases) {
      if (phrase.length >= rest.length) continue;
      if (phrase.every((word, index) => rest[index]?.low === word)) {
        rest = rest.slice(phrase.length);
        matched = true;
        break;
      }
    }
  }
  return rest;
}

/**
 * The words up to the first linking word ("about", "để") that comes after at least one word that
 * is not itself linking or `loose`. A capitalised word is a name, never a link.
 */
export function upToLink(
  words: readonly ChalkWord[],
  links: ReadonlySet<string>,
  loose: ReadonlySet<string> = new Set(),
): ChalkWord[] {
  const kept: ChalkWord[] = [];
  let content = false;
  for (const word of words) {
    const link = links.has(word.low) && !isCapital(word);
    if (link && content) break;
    if (!link && !loose.has(word.low)) content = true;
    kept.push(word);
  }
  return kept;
}

const length = (words: readonly string[]) => words.join(' ').length;

/**
 * As many leading words as fit in `most` characters, never cutting inside a word, and with
 * any word in `dangling` left hanging at the end taken off. The first word stays even when it is
 * longer on its own.
 */
export function cutToFit(
  words: readonly string[],
  dangling: ReadonlySet<string>,
  most = SHORT_NAME_MOST,
): string[] {
  const kept = [...words];
  while (kept.length > 1 && length(kept) > most) kept.pop();
  while (kept.length > 1 && dangling.has((kept[kept.length - 1] ?? '').toLowerCase())) kept.pop();
  return kept;
}
