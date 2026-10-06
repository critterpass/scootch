import type { Language } from '@scootch/domain';

import { voiceGuides } from './guide';
import type { ContextWord } from './guide/types';

type Compiled = {
  readonly reason: ContextWord['reason'];
  readonly word: RegExp;
  readonly lapse: readonly RegExp[];
  readonly safe: RegExp | null;
  readonly failsOtherwise: boolean;
};

/** A pattern source as a whole word or phrase: no letter or digit may touch either end. */
function whole(source: string, flags = 'u'): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, flags);
}

function compile({ word, reason, lapse, safe, otherwise }: ContextWord): Compiled {
  return {
    reason,
    word: whole(word),
    lapse: lapse.map((source) => whole(source)),
    safe: safe.length === 0 ? null : whole(safe.join('|'), 'gu'),
    failsOtherwise: otherwise === 'fail',
  };
}

const compiled: Readonly<Record<Language, readonly Compiled[]>> = {
  en: voiceGuides.en.contextWords.map(compile),
  vi: voiceGuides.vi.contextWords.map(compile),
};

/**
 * Whether one use of a context word fails. A lapse use always does. Otherwise the safe phrases
 * are taken out of the line, and what is left of the word answers to the word's own default.
 */
function fails(line: string, rule: Compiled): boolean {
  if (!rule.word.test(line)) return false;
  if (rule.lapse.some((pattern) => pattern.test(line))) return true;
  if (!rule.failsOtherwise) return false;
  return rule.word.test(rule.safe === null ? line : line.replace(rule.safe, ' '));
}

/**
 * The reasons a line fails for words that are only wrong in context: "you're behind" fails and
 * "behind the sofa" does not. The line must already be normalised. Patterns only, no model.
 */
export function contextWordReasons(line: string, language: Language): ContextWord['reason'][] {
  const reasons = new Set<ContextWord['reason']>();
  for (const rule of compiled[language]) {
    if (fails(line, rule)) reasons.add(rule.reason);
  }
  return [...reasons];
}
