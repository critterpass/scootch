import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { appHttp } from '../../api/app-http';
import { useLanguage } from '../../i18n/i18n-provider';
import { useBoardStore } from '../../state/board-provider';
import type { BoardSnapshot } from '../../state/board-view';
import { memory } from '../care/care-memory';
import { careModeOf, treatmentOf } from '../care/care-mode';
import { useFirstDay } from '../first-day/student';
import { getNetworkStateAsync } from '../offline/connection';

import { cancelNotes, notesAllowed, scheduleNotes, sendPushToken } from './notes-home';
import { planNotes } from './notes-plan';
import { onNotesSettingsChange, readNotesSettings } from './notes-settings';

/** What the notes depend on in a board reading; a change to it plans them again. */
function deskKey(board: BoardSnapshot): string {
  const task = board.desk?.task;
  return [
    board.now.day,
    board.phase,
    board.heavyToday,
    task?.id ?? '',
    task?.text ?? '',
    task?.care ?? '',
    task?.screened ?? '',
    board.session === null ? '' : 'running',
  ].join('|');
}

/**
 * Keeps the notes home planned for the whole app: at launch, whenever the desk changes, when the
 * settings change and as the app goes to the back. The push token is sent at launch.
 */
export function useNotesHome(): void {
  const db = useSQLiteContext();
  const store = useBoardStore();
  const { language } = useLanguage();
  const { fullName, done } = useFirstDay();
  const facts = useRef({ language, fullName });
  facts.current = { language, fullName };

  useEffect(() => {
    if (!done) return undefined;
    let current = true;
    let planning: Promise<void> = Promise.resolve();

    const plan = () => {
      planning = planning
        .then(async () => {
          const settings = await readNotesSettings(db);
          if (!current) return;
          if (!settings.enabled || !(await notesAllowed())) {
            await cancelNotes();
            return;
          }
          const board = store.getSnapshot();
          const care = treatmentOf(careModeOf(board, memory.get()));
          await scheduleNotes(
            planNotes({
              now: board.now,
              enabled: true,
              quiet: settings.quiet,
              timeSensitive: settings.timeSensitive,
              language: facts.current.language,
              desk: board.session === null ? (board.desk?.task ?? null) : null,
              heavyToday: board.heavyToday,
              careAllows: care.notes,
              fullName: facts.current.fullName,
            }),
          );
        })
        .catch(() => undefined);
    };

    let last = '';
    const check = () => {
      const board = store.getSnapshot();
      if (board.phase === 'loading') return;
      const key = deskKey(board);
      if (key === last) return;
      last = key;
      plan();
    };
    check();
    const unsubscribe = store.subscribe(check);
    const unsettled = onNotesSettingsChange(plan);
    const unplain = memory.subscribe(plan);
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'background') plan();
    });

    void getNetworkStateAsync()
      .then((network) => {
        if (current && network.isConnected)
          return sendPushToken(appHttp(() => facts.current.language));
        return undefined;
      })
      .catch(() => undefined);

    return () => {
      current = false;
      unsubscribe();
      unsettled();
      unplain();
      app.remove();
    };
  }, [db, store, done]);
}
