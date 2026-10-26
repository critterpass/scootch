import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useBoard } from '../../state/board-provider';

/** The crisis screen. Its route is built with the care screens. */
const CRISIS: Href = '/care/crisis';

/**
 * For a screen that shows tasks: while the board store holds a crisis open, the screen replaces
 * itself with the crisis screen. Returns true while it does, so the screen draws no task in the
 * moment before the route changes. The flag is the store's; it is never worked out here.
 */
export function useCareGuard(): boolean {
  const router = useRouter();
  const crisis = useBoard().phase === 'crisis';
  useEffect(() => {
    if (crisis) router.replace(CRISIS);
  }, [crisis, router]);
  return crisis;
}
