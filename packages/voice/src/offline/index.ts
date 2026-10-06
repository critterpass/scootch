import type { Attitude, Language } from '@scootch/domain';

import { enOffline } from './en';
import type { OfflinePack, OfflineSlot } from './types';
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
