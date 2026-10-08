import type { Href } from 'expo-router';
import { useSyncExternalStore } from 'react';

import type { ShareTarget } from './share-target';

/** The composer's route: one sheet, whatever is being shared. */
export const SHARE_ROUTE = '/share' as Href;

/** What a screen asks the composer to show, and what that screen lets the composer do. */
export interface ShareRequest {
  readonly target: ShareTarget;
  /**
   * What a tap on a locked frame does. Set only by a screen that may sell; unset (the reveal, a
   * heavy day), a locked frame rests.
   */
  readonly onLocked?: () => void;
}

// The request is held here and not in the route's address: a target carries a whole card, a
// picture's commands and the handlers of the screen that asked. The next request takes its place.
let request: ShareRequest | null = null;
const listeners = new Set<() => void>();

function set(next: ShareRequest): void {
  request = next;
  for (const listener of listeners) listener();
}

/** Hands the composer what to show. The caller then opens the sheet. */
export function requestShare(next: ShareRequest): void {
  set(next);
}

/** The request the sheet is showing, or `null` when it was opened with nothing to show. */
export function useShareRequest(): ShareRequest | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => request,
  );
}
