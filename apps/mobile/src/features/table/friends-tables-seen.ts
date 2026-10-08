import type { FriendsTable } from '../../api/together-api';

/** The open tables friends were last seen at, and when the server was asked. */
export interface FriendsTablesSeen {
  readonly at: number;
  readonly tables: readonly FriendsTable[];
}

let seen: FriendsTablesSeen | null = null;
const listeners = new Set<() => void>();

/**
 * What the app last learned about friends' tables, kept for the widget that shows them. It is
 * only as fresh as the last time a screen asked, so it carries the time with it.
 */
export const friendsTablesSeen = {
  get: (): FriendsTablesSeen | null => seen,
  set(tables: readonly FriendsTable[], at: number): void {
    seen = { at, tables };
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
