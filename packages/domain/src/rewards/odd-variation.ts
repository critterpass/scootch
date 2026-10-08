import type { OddWord } from '../contracts';

/** A hatch that comes out differently. `word` is what the card's name gains: "Molar (tiny)". */
export interface OddHatch {
  readonly on: 'hatch';
  readonly word: OddWord;
}

/** A catch that is not one of the usual ones. `kind` names its scene on the phone. */
export interface OddCatch {
  readonly on: 'catch';
  readonly kind: string;
}

/** One way a week can be odd. Each is one file in `odd/`; the generated index collects them. */
export type OddVariation = OddHatch | OddCatch;

export function isOddVariation(value: unknown): value is OddVariation {
  if (typeof value !== 'object' || value === null || !('on' in value)) return false;
  return value.on === 'hatch' ? 'word' in value : value.on === 'catch' && 'kind' in value;
}
