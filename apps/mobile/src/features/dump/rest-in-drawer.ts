import type { SettingsRow } from '@scootch/domain';

import { lineWithNoTask } from '../../state/lines';

/**
 * Scootch's second sentence under the one thing: how many other things are parked in the drawer.
 * The number is the real one; with nothing parked he says nothing.
 */
export function restInDrawerLine(
  parked: number,
  voice: Pick<SettingsRow, 'language' | 'attitude'>,
): string | null {
  if (parked <= 0) return null;
  if (parked === 1) return lineWithNoTask('oneInDrawer', voice);
  return lineWithNoTask('restInDrawer', voice).replace('{count}', String(parked));
}
