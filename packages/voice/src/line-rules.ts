import type { Language } from '@scootch/domain';

import { normalise } from './text';

/**
 * The monster titles the writer's prompt shows as examples. Like the example names, they show the
 * shape and are never accepted back as output.
 */
export const exampleMonsterTitles: Readonly<Record<Language, readonly string[]>> = {
  en: ['Cupboard lurker'],
  vi: ['Cư dân gầm giường'],
};

/** Is this title one of the prompt's own examples, whatever its letter case. */
export function copiesExampleTitle(text: string, language: Language): boolean {
  const title = normalise(text).replace(/[.!]+$/, '');
  return exampleMonsterTitles[language].some((example) => normalise(example) === title);
}

/**
 * A lower-case letter that opens the line or follows the end of a sentence. A full stop after a
 * single letter ("p.m.") does not end a sentence, a line that opens with a placeholder (`{treat}`)
 * opens with whatever the phone puts there, and a name spelt with a small first letter ("iCloud")
 * keeps it.
 */
const lowerCaseOpening = /(^[^\p{L}{]*|(?<=[\p{L}\p{N}]{2}[.!?…]["”')]?\s+))(\p{Ll})(?!\p{Lu})/gu;

/** Does every sentence of the line open with a capital letter (or with no letter at all). */
export function isSentenceCased(text: string): boolean {
  return text.trim().search(lowerCaseOpening) === -1;
}

/**
 * The line with the first letter of each sentence capitalised and nothing else touched: no word
 * is added, removed or respelt. The only repair made to a writer's line in code.
 */
export function sentenceCased(text: string): string {
  return text
    .trim()
    .replace(
      lowerCaseOpening,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    );
}

/**
 * The positions in `steps` that repeat an earlier step, letter case, marks of emphasis and closing
 * punctuation aside. `steps` runs from the first tiny step to the tiniest, so position 0 is never
 * returned.
 */
export function repeatedSteps(steps: readonly string[]): number[] {
  const seen = new Set<string>();
  const repeated: number[] = [];
  steps.forEach((step, index) => {
    const key = normalise(step).replace(/[.!?…\s]+$/, '');
    if (key === '') return;
    if (seen.has(key)) repeated.push(index);
    seen.add(key);
  });
  return repeated;
}
