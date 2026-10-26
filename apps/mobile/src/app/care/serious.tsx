import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { careActions } from '../../features/care/care-actions';
import { canBeFunny } from '../../features/care/care-mode';
import { SeriousScreen } from '../../features/care/serious-screen';
import { useCareGuard } from '../../features/care/use-care-guard';
import { useHisLine } from '../../features/first-day/his-line';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { goBack } from '../../ui/motion/go-back';

/** How long his answer to "be funny" stays before the desk comes back. */
const BE_FUNNY_LINE_MS = 1600;

/**
 * Serious mode for the heavy task on the desk: grey, still, glasses off. "Sit with me" starts a
 * quiet period; "Not now" goes back; "be funny" is offered only where the screen allows it.
 */
export default function Serious() {
  const board = useBoard();
  const store = useBoardStore();
  const db = useSQLiteContext();
  const router = useRouter();
  const say = useHisLine();
  useCareGuard();
  // After "be funny", the task's words and his answer stay while the desk comes back.
  const [lifted, setLifted] = useState<{ readonly text: string; readonly line: string } | null>(
    null,
  );
  const task = board.desk?.task ?? null;

  useEffect(() => {
    if (lifted === null && (task === null || task.care === 'none')) goBack(router, '/');
  }, [task, lifted, router]);

  useEffect(() => {
    if (lifted === null) return undefined;
    const timer = setTimeout(() => goBack(router, '/'), BE_FUNNY_LINE_MS);
    return () => clearTimeout(timer);
  }, [lifted, router]);

  if (lifted !== null) {
    return (
      <SeriousScreen
        task={lifted.text}
        line={lifted.line}
        beFunnyOffered={false}
        onSit={() => goBack(router, '/')}
        onNotNow={() => goBack(router, '/')}
        onBeFunny={() => undefined}
      />
    );
  }
  if (task === null) return null;
  const current = task;
  return (
    <SeriousScreen
      task={current.text}
      line={say('seriousCompany', current.id)}
      beFunnyOffered={canBeFunny(current)}
      onSit={() => {
        void store.start().finally(() => goBack(router, '/'));
      }}
      onNotNow={() => goBack(router, '/')}
      onBeFunny={() => {
        void careActions(store, db)
          .beFunny(current.id)
          .then((done) => {
            if (done) setLifted({ text: current.text, line: say('seriousBeFunny', current.id) });
          });
      }}
    />
  );
}
