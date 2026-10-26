import type { SlipOutcome } from '@phusclass/domain/board';
import type { ClassLanguage, Moment } from '@phusclass/voice/class';

import { fixedLine, lineFor } from '../desk/his-line';

/** The excuses he has heard often enough to have printed. */
export const PICKED_EXCUSES = ['too tired', 'after lunch', 'need first', 'real reason'] as const;
export type PickedExcuse = (typeof PICKED_EXCUSES)[number];

/** An excuse: picked from the slip, or in the user's own words, said or typed. */
export type Excuse =
  | { readonly kind: 'picked'; readonly which: PickedExcuse }
  | { readonly kind: 'written'; readonly words: string };

/** His red pen on the slip. `grade` is `null` for a real reason, which is not graded. */
export interface Graded {
  readonly comment: string;
  readonly grade: string | null;
  readonly accepted: boolean;
}

const PICKED: Record<
  Exclude<PickedExcuse, 'real reason'>,
  { readonly moment: Moment; readonly grade: string }
> = {
  'too tired': { moment: 'slipTooTired', grade: 'D' },
  'after lunch': { moment: 'slipAfterLunch', grade: 'C-' },
  'need first': { moment: 'slipNeedSomethingFirst', grade: 'B-' },
};

/** Excuses in the user's own words are graded on one of three red-pen rungs, by the words. */
const WRITTEN: readonly { readonly moment: Moment; readonly grade: string }[] = [
  { moment: 'gradeWeak', grade: 'D' },
  { moment: 'gradeSeenIt', grade: 'C-' },
  { moment: 'gradeCreative', grade: 'B-' },
];

function seedOf(words: string): number {
  let value = 0;
  for (const char of words.trim().toLowerCase()) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/**
 * He grades the excuse, never the person. A real reason gets "Accepted." and nothing else. The
 * same words always get the same grade.
 */
export function gradeExcuse(language: ClassLanguage, excuse: Excuse, seed: string): Graded | null {
  if (excuse.kind === 'picked') {
    if (excuse.which === 'real reason') {
      return { comment: fixedLine(language, 'slipAccepted'), grade: null, accepted: true };
    }
    const { moment, grade } = PICKED[excuse.which];
    const line = lineFor(language, moment, seed);
    return line === undefined ? null : { comment: line.text, grade, accepted: false };
  }
  const words = excuse.words.trim();
  if (words === '') return null;
  const rung = WRITTEN[seedOf(words) % WRITTEN.length] ?? WRITTEN[0];
  if (rung === undefined) return null;
  const line = lineFor(language, rung.moment, `${seed}:${words}`);
  return line === undefined ? null : { comment: line.text, grade: rung.grade, accepted: false };
}

/** What he says once the slip is handed in: the fifth tally earns the front row. */
export function afterSlip(language: ClassLanguage, outcome: SlipOutcome): string | null {
  if (outcome === 'front row') return fixedLine(language, 'frontRow');
  return null;
}
