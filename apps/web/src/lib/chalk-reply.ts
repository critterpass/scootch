import type { Language } from '@phusclass/i18n';

// The app's own on-phone care gate, read as it is so the site never decides care differently.
import { careGate } from '../../../mobile/src/api/care-gate';
import { chalkLines } from '../copy/chalk-lines';

export type ChalkReply =
  | { readonly kind: 'empty' }
  | { readonly kind: 'crisis' }
  | { readonly kind: 'plain' }
  | { readonly kind: 'line'; readonly line: string };

/** Lower case, with words wrapped in single spaces so a word matches whole. */
function wordsLine(text: string): string {
  const words = text
    .normalize('NFC')
    .toLowerCase()
    .match(/[\p{L}\p{N}'-]+/gu);
  return ` ${(words ?? []).join(' ')} `;
}

/**
 * What the board says to a task. `turn` picks among the lines of a kind, so asking twice can
 * give another. A crisis gets no line and a heavy task gets only “Written down.”
 */
export function chalkReply(text: string, language: Language, turn: number): ChalkReply {
  if (text.trim() === '') return { kind: 'empty' };
  const care = careGate(text);
  if (care === 'crisis') return { kind: 'crisis' };
  if (care === 'hold') return { kind: 'plain' };

  const line = wordsLine(text);
  const pack = chalkLines[language];
  const kind = pack.kinds.find((entry) => entry.words.some((word) => line.includes(` ${word} `)));
  const lines = kind?.lines ?? pack.general;
  return { kind: 'line', line: lines[Math.abs(turn) % lines.length] ?? pack.general[0] ?? '' };
}
