import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { FriendsTable } from '../../api/together-api';
import { useTogether } from '../../state/together-context';

import { friendsTablesSeen } from './friends-tables-seen';

/** A screen that comes into view asks again no sooner than this. */
const ASK_AGAIN_AFTER_MS = 60_000;

/**
 * The last answer, kept for the app's run: the pill on home comes and goes with the composer, and
 * each return shows what is known instead of asking again.
 */
let lastAnswer: { at: number; tables: readonly FriendsTable[] } = { at: 0, tables: [] };

export interface FriendsTables {
  readonly tables: readonly FriendsTable[];
  /** Asks now, whatever was asked before: after a seat was taken or refused. */
  readonly refresh: () => void;
}

/**
 * The open tables a friend is at, asked for when the screen comes into view. A phone that never
 * signed in, or has no connection, is answered with none: nothing is said about either.
 */
export function useFriendsTables(): FriendsTables {
  const { api } = useTogether();
  const focused = useIsFocused();
  const [tables, setTables] = useState(lastAnswer.tables);
  const current = useRef(true);
  useEffect(
    () => () => {
      current.current = false;
    },
    [],
  );

  const ask = useCallback(() => {
    lastAnswer = { ...lastAnswer, at: Date.now() };
    void api
      .friendsTables()
      .catch(() => [])
      .then((found) => {
        lastAnswer = { ...lastAnswer, tables: found };
        friendsTablesSeen.set(found, Date.now());
        if (current.current) setTables(found);
      });
  }, [api]);

  useEffect(() => {
    if (focused && Date.now() - lastAnswer.at >= ASK_AGAIN_AFTER_MS) ask();
  }, [focused, ask]);

  return { tables, refresh: ask };
}

/** The friend a table is named by, and how many of the caller's friends sit there beside them. */
export function tableFriend(table: FriendsTable): { name: string | null; others: number } {
  return { name: table.friends[0]?.displayName ?? null, others: table.friends.length - 1 };
}
