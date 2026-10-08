import { useSyncExternalStore } from 'react';

import type { Id } from '@scootch/domain';

/**
 * The card last taken out of its pocket, kept while the app is open: the card screen writes it as
 * the person browses, and the shelf underneath reads it, so coming back finds the shelf at that
 * card with a ring round it. It is forgotten when the app closes.
 */
let looked: Id | null = null;
const listeners = new Set<() => void>();

export function lookAt(monsterId: Id | null): void {
  if (looked === monsterId) return;
  looked = monsterId;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const read = () => looked;

export function useLastLooked(): Id | null {
  return useSyncExternalStore(subscribe, read, read);
}
