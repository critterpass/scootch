import type { Task } from '@phusclass/domain/board';
import type { FillValues, Moment } from '@phusclass/voice/class';

import type { BoardStore } from '../../state/board-store';
import type { BoardSnapshot } from '../../state/board-view';
import type { CareMode } from '../care/care-mode';

/** One line of his for a moment, or undefined where he says nothing. */
export type Say = (moment: Moment, seed: string, values?: FillValues) => string | undefined;

type Store = Pick<
  BoardStore,
  | 'getSnapshot'
  | 'swap'
  | 'reword'
  | 'tickOff'
  | 'erase'
  | 'answerStillYours'
  | 'stillYoursAsked'
  | 'longBoardRemarked'
>;

/**
 * Whether he may say something pointed about a task: never about a serious or crisis task, and
 * nothing before the care screen has seen it. The flags are the store's.
 */
export function mayRemarkOn(task: Pick<Task, 'care' | 'screened'>): boolean {
  return task.care === 'none' && task.screened;
}

function findTask(snapshot: BoardSnapshot, id: string): Task | undefined {
  return snapshot.board.find(({ task }) => task.id === id)?.task;
}

/**
 * What the board's controls do to the store, and what he says about it. A swap gets his one line;
 * a tick and an erase get none. Erasing is a decision to drop something and is never commented on.
 * In plain company after a crisis (`care` reads it from `useCareView`) he remarks on nothing and
 * keeps plain company at the foot of the board.
 */
export function boardControls(store: Store, say: Say, care: () => CareMode = () => 'normal') {
  const plain = () => care() === 'plain';
  return {
    /** Onto the desk; what was there goes back on the board. Returns his line, if he has one. */
    async swap(id: string): Promise<string | null> {
      const task = findTask(store.getSnapshot(), id);
      if (task === undefined || task.status === 'desk') return null;
      await store.swap(id);
      if (plain() || !mayRemarkOn(task)) return null;
      return say('swapAllowed', `${task.id}:${task.lastTouched}`, { task: task.text }) ?? null;
    },

    /** New words for the task. Empty words leave it as it was. */
    async reword(id: string, text: string): Promise<void> {
      const words = text.trim();
      const task = findTask(store.getSnapshot(), id);
      if (task === undefined || words === '' || words === task.text) return;
      await store.reword(id, words);
    },

    /** Done without a period: off the board, quietly. */
    async tick(id: string): Promise<null> {
      await store.tickOff(id);
      return null;
    },

    /** Off the board. No comment, ever. */
    async erase(id: string): Promise<null> {
      await store.erase(id);
      return null;
    },

    /** "Still yours?" answered yes: fresh chalk again. */
    keep: (id: string) => store.answerStillYours(id, 'yes'),

    /** "Still yours?" answered no: it is rubbed off, with no comment. */
    letGo: (id: string) => store.answerStillYours(id, 'no'),

    /** The question was put on the board; it is not put again. */
    asked: (id: string) => store.stillYoursAsked(id),

    /**
     * His remark at the foot of the board when it opens: the long board (once a day; the store
     * remembers it was made) or the empty board. Null when he has nothing to say.
     */
    async opened(): Promise<string | null> {
      const snapshot = store.getSnapshot();
      if (plain()) return say('crisisCompany', snapshot.now.day) ?? null;
      if (snapshot.longBoard) {
        await store.longBoardRemarked();
        return say('boardLong', snapshot.now.day) ?? null;
      }
      if (snapshot.board.length === 0) return say('emptyDesk', snapshot.now.day) ?? null;
      return null;
    },
  };
}

export type BoardControls = ReturnType<typeof boardControls>;
