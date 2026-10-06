import type { Attitude, Language } from '@scootch/domain';

import { enOffline } from './en';
import type { NoTaskSlot, OfflinePack, OfflineSlot } from './types';
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
