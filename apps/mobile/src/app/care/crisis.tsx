import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';

import { careActions } from '../../features/care/care-actions';
import { CrisisScreen } from '../../features/care/crisis-screen';
import { phoneRegion } from '../../features/care/helpline-cards';
import { useBoard, useBoardStore } from '../../state/board-provider';

/**
 * The crisis screen. It is simply there, with nothing playing around it and no swipe away; it
 * closes only by its own button, and asks nothing. Left open, it ends with the day.
 */
export default function Crisis() {
  const board = useBoard();
  const store = useBoardStore();
  const db = useSQLiteContext();
  const router = useRouter();
  const closing = useRef(false);

  useEffect(() => {
    if (board.phase !== 'crisis' && board.phase !== 'loading' && !closing.current) {
      router.replace('/');
    }
  }, [board.phase, router]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    void careActions(store, db)
      .closeCrisis()
      .catch(() => undefined)
      .finally(() => router.replace('/'));
  };

  return <CrisisScreen kind="crisis" region={phoneRegion()} now={board.now.at} onClose={close} />;
}
