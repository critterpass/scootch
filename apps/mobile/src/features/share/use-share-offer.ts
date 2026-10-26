import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { useBoard } from '../../state/board-provider';

import { loadShareOffer, type ShareOffer } from './share-offer';

/**
 * The offer for one logbook entry, read when the sheet opens, and read again when the board says
 * the day or the crisis state changed, so a crisis said while the sheet is open takes it away.
 * `null` while it loads.
 */
export function useShareOffer(taskId: string): ShareOffer | null {
  const db = useSQLiteContext();
  const board = useBoard();
  const [offer, setOffer] = useState<ShareOffer | null>(null);
  const day = board.now.day;
  const crisis = board.phase === 'crisis' || board.heavyToday;

  useEffect(() => {
    let current = true;
    loadShareOffer(db, taskId, board.now)
      .then((next) => {
        if (current) setOffer(next);
      })
      .catch(() => {
        if (current) setOffer({ kind: 'blocked', why: 'not finished' });
      });
    return () => {
      current = false;
    };
    // `board.now` changes every tick; the offer is read again only when the day or care changes.
  }, [db, taskId, day, crisis]);

  return offer;
}
