import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, type ReactNode } from 'react';

import { prepareDatabase } from '../../db/database';
import { BoardProvider, useBoard, useBoardStore } from '../../state/board-provider';

/**
 * A finish with its logbook entry, for a capture: a board of its own on a database in memory,
 * where `title` is told, started and finished the way the desk does it. What is drawn inside
 * reads that board, so the finish's share button finds the entry and shows, as the Finish board
 * draws it. Nothing is written to the phone's own board.
 */
export function WithFinishedEntry({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <SQLiteProvider databaseName=":memory:" onInit={prepareDatabase}>
      <BoardProvider>
        <Finished title={title}>{children}</Finished>
      </BoardProvider>
    </SQLiteProvider>
  );
}

function Finished({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const store = useBoardStore();
  const board = useBoard();
  const loaded = board.phase !== 'loading';
  const finished = board.lastFinish !== null;
  useEffect(() => {
    // Once the provider has loaded the board; actions run one at a time, in this order.
    if (!loaded) return;
    void store
      .say(title)
      .then(() => store.start())
      .then(() => store.finish());
  }, [loaded, store, title]);
  return finished ? children : null;
}
