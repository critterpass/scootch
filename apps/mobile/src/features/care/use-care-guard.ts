import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import type { Task } from '@phusclass/domain/board';

import { useForcedVariant } from '../../screens/registry/support/forced-variant';
import { useBoard } from '../../state/board-provider';

import { usePlainCompany } from './care-memory';
import {
  canBeFunny,
  careModeOf,
  lineKindFor,
  treatmentOf,
  type CareTreatment,
  type LineKind,
} from './care-mode';

/**
 * For a screen that shows tasks: while the board store holds a crisis open, the focused screen
 * replaces itself with the crisis screen. Returns true while it does, so the screen draws no task
 * in the moment before the route changes. The flag is the store's; it is never worked out here.
 * A registry capture is never moved.
 */
export function useCareGuard(): boolean {
  const router = useRouter();
  const focused = useIsFocused();
  const captured = useForcedVariant() !== undefined;
  const crisis = useBoard().phase === 'crisis';
  useEffect(() => {
    if (crisis && focused && !captured) router.replace('/care/crisis');
  }, [crisis, focused, captured, router]);
  return crisis;
}

export interface CareView extends CareTreatment {
  /** What he may say about a task right now. */
  readonly lineKind: (task: Pick<Task, 'care' | 'screened'>) => LineKind;
  /** Whether "It's fine, be funny" may be offered for a task. */
  readonly canBeFunny: (task: Pick<Task, 'care' | 'screened'>) => boolean;
}

/**
 * What a screen that shows tasks may show today, read from the board and the care memory:
 * - `pressure` false: no fuse, no rising pressure, no thrown chalk, no tally, no late slip.
 * - `act` false: plain lines, no grade, happening, burst, confetti or share.
 * - `selling` false: no tuition notice.
 * After the crisis screen is closed the mode is `plain` until something said afterwards is
 * screened and cleared; a heavy task on the desk makes it `serious`. Call `useCareGuard` too.
 */
export function useCareView(): CareView {
  const board = useBoard();
  const plain = usePlainCompany();
  const mode = careModeOf(board, plain);
  return useMemo(
    () => ({
      ...treatmentOf(mode),
      lineKind: (task) => lineKindFor(task, mode),
      canBeFunny,
    }),
    [mode],
  );
}
