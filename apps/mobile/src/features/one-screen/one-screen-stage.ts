import {
  hasStartLeft,
  type DrawerItemRow,
  type HeardDeadline,
  type MonsterRow,
  type QuietNote,
  type TaskRow,
} from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';

import type { DayState, Reveal } from '../../state/day-types';
import { showsComedy } from '../../state/shows-comedy';
import { MAX_SHRINKS, sizeStep } from '../../state/smaller';

/** The small ways in on a return: the person's own words, as chips. Nothing here counts anything. */
export const RETURN_CHIPS = [
  { id: 'tiny', label: 'morning.chip.tiny' },
  { id: 'sit', label: 'morning.chip.sit' },
] as const satisfies readonly { readonly id: string; readonly label: StringKey }[];
export type ReturnChip = (typeof RETURN_CHIPS)[number]['id'];

/** Which of its states the one screen is in. Worked out from the day; nothing is decided here. */
export type Stage =
  /** A crisis day: nothing of this screen is shown and the care screens take over. */
  | { readonly kind: 'care' }
  | { readonly kind: 'session' }
  /** The battery question, asked while the person's words wait to be sent. */
  | { readonly kind: 'energy' }
  /**
   * Home: Scootch, the world and the composer, on a fresh morning and on a finished day alike.
   * Nothing is set, and the next thing is simply said or typed.
   */
  | {
      readonly kind: 'home';
      /** Something was finished or put down today: Scootch rests until he is spoken to. */
      readonly rested: boolean;
      /** False once every start of the day has been used: the composer takes no more words. */
      readonly startLeft: boolean;
      /** Back after a long while: the smallest ask and its chips, with no word about the gap. */
      readonly returning: boolean;
      /** A dated thing that is close, mentioned quietly beside the ask. */
      readonly note: { readonly item: DrawerItemRow; readonly dueDate: string } | null;
      /** The task carried on to tomorrow, when there is one. */
      readonly waiting: TaskRow | null;
    }
  | {
      readonly kind: 'picked_for_me';
      readonly item: DrawerItemRow;
      /** False when it is the only thing parked: there is nothing else to pick. */
      readonly canPickAgain: boolean;
    }
  | {
      readonly kind: 'one_thing';
      readonly task: TaskRow;
      /** A serious task: plain words, no reveal, no jokes. */
      readonly quiet: boolean;
      readonly reveal: Reveal | null;
      readonly deadline: HeardDeadline | null;
      readonly another: boolean;
    }
  | {
      readonly kind: 'hatch';
      readonly task: TaskRow;
      /** `null` while the monster's words are on their way. */
      readonly monster: MonsterRow | null;
      readonly shrunk: boolean;
      readonly canShrink: boolean;
    }
  | {
      readonly kind: 'task_set';
      readonly task: TaskRow;
      readonly quiet: boolean;
      /** Yesterday's task, back this morning. */
      readonly carried: boolean;
      /** The monster is drawn this much smaller than it is stored: a size down on a carried morning. */
      readonly monster: { readonly row: MonsterRow; readonly sizeFactor: number } | null;
    };

export type StageInput = Pick<
  DayState,
  'today' | 'pick' | 'morning' | 'monster' | 'heardDeadlines' | 'drawer' | 'waitingForTomorrow'
> & {
  /** The person's words are held back until the battery question is answered. */
  readonly energyAsked: boolean;
};

function noteOf(note: QuietNote | null, items: readonly DrawerItemRow[]) {
  const item = note ? items.find((one) => one.id === note.drawerItemId) : undefined;
  return note && item ? { item, dueDate: note.dueDate } : null;
}

/** The size a carried-over monster is drawn at: one step down from where its shrinks left it. */
export function carriedSizeFactor(task: Pick<TaskRow, 'shrinkCount'>): number {
  return sizeStep(task.shrinkCount + 1) / sizeStep(task.shrinkCount);
}

export function stageOf(input: StageInput): Stage {
  const { today, pick, morning, monster, drawer } = input;
  if (today.kind === 'crisis') return { kind: 'care' };
  if (today.kind === 'in_session' || (today.kind === 'serious' && today.session !== null)) {
    return { kind: 'session' };
  }
  // With nothing set the screen is home, whether or not anything was done today.
  const home = today.kind === 'nothing_yet' || today.kind === 'done_for_today';

  // The day's first words are waiting on the battery question: it is asked wherever the ask is,
  // so held words can always be answered for.
  if (home && input.energyAsked) return { kind: 'energy' };

  // Scootch's pick is shown wherever it was asked for.
  if (pick.kind === 'picked_for_me' && (home || today.kind === 'task_set')) {
    const item = drawer.items.find((one) => one.id === pick.itemId);
    if (item) return { kind: 'picked_for_me', item, canPickAgain: drawer.items.length > 1 };
  }
  if (today.kind === 'nothing_yet' || today.kind === 'done_for_today') {
    // The smallest ask is a morning's: once something was done today it is not asked again.
    const smallest =
      today.kind === 'nothing_yet' && morning.kind === 'smallest_ask' ? morning : null;
    return {
      kind: 'home',
      rested: today.kind === 'done_for_today',
      startLeft: hasStartLeft(today),
      returning: smallest !== null,
      note: smallest ? noteOf(smallest.note, drawer.items) : null,
      waiting: input.waitingForTomorrow,
    };
  }

  const { task } = today;
  // The flag is the task's own: a serious task never reaches the reveal, the hatch or a monster.
  const quiet = today.kind === 'serious';
  // A serious task is not offered and haggled over: its own quiet screen is shown at once.
  if (pick.kind === 'offered' && !quiet) {
    return {
      kind: 'one_thing',
      task,
      quiet,
      reveal: quiet ? null : pick.reveal,
      deadline: input.heardDeadlines[0] ?? null,
      another: pick.another,
    };
  }
  if (pick.kind === 'hatching' && showsComedy(task, 'monster')) {
    return {
      kind: 'hatch',
      task,
      monster,
      shrunk: pick.shrunk,
      canShrink: task.shrinkCount < MAX_SHRINKS,
    };
  }
  const carried = morning.kind === 'carried_over' && morning.taskId === task.id;
  return {
    kind: 'task_set',
    task,
    quiet,
    carried,
    monster:
      monster === null || !showsComedy(task, 'monster')
        ? null
        : { row: monster, sizeFactor: carried ? carriedSizeFactor(task) : 1 },
  };
}

/** True on the one stage that keeps the person's words waiting: the battery question. */
export function holdsWords(stage: Pick<Stage, 'kind'>): boolean {
  return stage.kind === 'energy';
}

/**
 * What the composer on home may do about a new thing. `open`: a start is left. `locked`: none is
 * left and Plus has more, so the talk capsule is the quiet locked control that leads to the sheet.
 * `spent`: none is left and nothing is offered: on Plus, and on any day with something heavy in
 * it, where nothing is ever sold.
 */
export type HomeStarts = 'open' | 'locked' | 'spent';

export function homeStarts(input: {
  readonly startLeft: boolean;
  readonly plus: boolean;
  /** `showsSelling` for the day: false beside anything heavy. */
  readonly selling: boolean;
}): HomeStarts {
  if (input.startLeft) return 'open';
  return input.plus || !input.selling ? 'spent' : 'locked';
}

/**
 * Where the trial-ends-tomorrow note may sit: on home, where nothing else is going on. Never
 * beside a task, a pick or a hatch.
 */
export function chargeNoteShows(shown: 'composer' | 'task_set' | 'panel' | 'quiet'): boolean {
  return shown === 'composer';
}
