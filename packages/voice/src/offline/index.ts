import type { Attitude, InTheWay, Language } from '@scootch/domain';

import { enOffline } from './en';
import type { HelperSlot, NoTaskSlot, OfflinePack, OfflineSlot, PlainHelperSlot } from './types';
import { viOffline } from './vi';

export * from './types';

export const offlinePacks: Readonly<Record<Language, OfflinePack>> = {
  en: enOffline,
  vi: viOffline,
};

/** The offline line for a slot. `index` rotates through the slot's lines and wraps round. */
export function offlineLine(
  language: Language,
  attitude: Attitude,
  slot: OfflineSlot,
  index = 0,
): string {
  const lines = offlinePacks[language].lines[attitude][slot];
  return lines[index % lines.length] ?? lines[0];
}

/** The line for a moment with no task to talk about: first launch, waiting, the end of the day. */
export function noTaskLine(language: Language, attitude: Attitude, slot: NoTaskSlot): string {
  return offlinePacks[language].noTask[attitude][slot];
}

/** The line that announces the next renewal of Plus, from the store's own day and price. */
export function renewalLine(
  language: Language,
  attitude: Attitude,
  plan: 'monthly' | 'yearly',
  day: string,
  price: string | null,
): string {
  return offlinePacks[language].renewal(attitude, plan, day, price);
}

/**
 * The line for one of the starting helpers. `plain` is for a heavy task, which shows only some of
 * them and has no monster to say any.
 */
export function helperLine(language: Language, attitude: Attitude, slot: HelperSlot): string;
export function helperLine(language: Language, attitude: 'plain', slot: PlainHelperSlot): string;
export function helperLine(
  language: Language,
  attitude: Attitude | 'plain',
  slot: HelperSlot,
): string {
  const pack = offlinePacks[language];
  return attitude === 'plain'
    ? pack.plainHelpers[slot as PlainHelperSlot]
    : pack.helpers[attitude][slot];
}

const inTheWaySlots = {
  boring: 'inTheWayBoring',
  scary: 'inTheWayScary',
  confusing: 'inTheWayConfusing',
  too_big: 'inTheWayTooBig',
} as const satisfies Readonly<Record<InTheWay, HelperSlot>>;

/** What Scootch says back to an answer to "Anything in the way?". Never said on a heavy task. */
export function inTheWayLine(language: Language, attitude: Attitude, answer: InTheWay): string {
  return offlinePacks[language].helpers[attitude][inTheWaySlots[answer]];
}

/** A heard clock time said back: "Dentist at 3." */
export function timeSaidBackLine(language: Language, heardAs: string): string {
  return offlinePacks[language].timeSaidBack(heardAs);
}

/** The one nudge before a heard time: "Dentist at 3. Time to get ready." */
export function getReadyLine(language: Language, heardAs: string): string {
  return offlinePacks[language].getReady(heardAs);
}
