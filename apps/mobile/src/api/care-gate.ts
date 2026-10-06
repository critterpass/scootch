import type { CareWords } from './care-words/care-words';
import { enCareWords } from './care-words/en';
import { viCareWords } from './care-words/vi';

/**
 * What the phone can tell before anything is sent. It is a gate, not a judge:
 * - `crisis`: an explicit phrase. Crisis at once, offline, and the text goes nowhere.
 * - `hold`: a dark or heavy word. Nothing funny until the server's screen has answered.
 * - `clear`: nothing matched. With a connection the server's screen is still awaited.
 */
export type CareGateResult = 'crisis' | 'hold' | 'clear';

const LISTS: readonly CareWords[] = [enCareWords, viCareWords];

/** Lower-case words separated and wrapped by single spaces, so a phrase matches whole words only. */
function wordsLine(text: string): string {
  const words = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .match(/[\p{L}\p{N}']+/gu);
  return ` ${(words ?? []).join(' ')} `;
}

function withoutMarks(line: string): string {
  return line.normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd');
}

function has(line: string, entry: string): boolean {
  return entry.endsWith('*')
    ? line.includes(` ${entry.slice(0, -1)}`)
    : line.includes(` ${entry} `);
}

function remove(line: string, phrases: readonly string[]): string {
  let rest = line;
  for (const phrase of phrases) rest = rest.split(` ${phrase} `).join(' ');
  return rest;
}

/**
 * The on-phone keyword gate. Both languages are always checked, because people mix them. Idioms
 * ("this inbox is killing me", "chết mất") are removed first so they trip nothing.
 */
export function careGate(text: string): CareGateResult {
  const idioms = LISTS.flatMap((list) => list.idioms);
  const line = remove(wordsLine(text), idioms);

  if (LISTS.some((list) => list.crisis.some((entry) => has(line, entry)))) return 'crisis';
  if (LISTS.some((list) => list.hold.some((entry) => has(line, entry)))) return 'hold';

  const plain = remove(withoutMarks(wordsLine(text)), idioms.map(withoutMarks));
  const unmarked = LISTS.flatMap((list) => list.holdWithoutMarks);
  return unmarked.some((entry) => has(plain, entry)) ? 'hold' : 'clear';
}
