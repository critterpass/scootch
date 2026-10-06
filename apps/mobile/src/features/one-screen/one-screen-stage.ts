import type {
  Ask,
  DrawerItemRow,
  HeardDeadline,
  MonsterRow,
  QuietNote,
  TaskRow,
} from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';

import type { DayState, Reveal } from '../../state/day-types';
import { MAX_SHRINKS, sizeStep } from '../../state/smaller';

/** The three small ways in on a return: the person's own words, as chips. Nothing here counts anything. */
export const RETURN_CHIPS = [
  { id: 'tiny', label: 'morning.chip.tiny' },
  { id: 'pick', label: 'morning.chip.pick' },
  { id: 'sit', label: 'morning.chip.sit' },
] as const satisfies readonly { readonly id: string; readonly label: StringKey }[];
export type ReturnChip = (typeof RETURN_CHIPS)[number]['id'];

/** Which of its states the one screen is in. Worked out from the day; nothing is decided here. */
export type Stage =
  /** A crisis day: nothing of this screen is shown and the care screens take over. */
  | { readonly kind: 'care' }
  | { readonly kind: 'session' }
  | { readonly kind: 'done' }
  /** The battery question, asked while the person's words wait to be sent. */
  | { readonly kind: 'energy' }
  | {
      readonly kind: 'composer';
      /** Back after a long while: the smallest ask and its chips, with no word about the gap. */
      readonly returning: boolean;
      /** A dated thing that is close, mentioned quietly beside the ask. */
      readonly note: { readonly item: DrawerItemRow; readonly dueDate: string } | null;
      readonly canPickForMe: boolean;
    }
  | { readonly kind: 'picked_for_me'; readonly item: DrawerItemRow }
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
  | { readonly kind: 'bargain'; readonly task: TaskRow; readonly excuse: string; readonly ask: Ask }
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
  'today' | 'pick' | 'morning' | 'monster' | 'heardDeadlines' | 'drawer' | 'oneMore'
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
  if (today.kind === 'done_for_today') {
    // "One more" was tapped and the daily limit has a start left: the plain ask comes back.
    if (input.oneMore && today.startsLeft > 0) {
      return {
        kind: 'composer',
        returning: false,
        note: null,
        canPickForMe: drawer.items.length > 0,
      };
    }
    return { kind: 'done' };
  }

  if (pick.kind === 'picked_for_me') {
    const item = drawer.items.find((one) => one.id === pick.itemId);
    if (item) return { kind: 'picked_for_me', item };
  }

  if (today.kind === 'nothing_yet') {
    if (input.energyAsked) return { kind: 'energy' };
    const returning = morning.kind === 'smallest_ask';
    return {
      kind: 'composer',
      returning,
      note: returning ? noteOf(morning.note, drawer.items) : null,
      canPickForMe: drawer.items.length > 0,
    };
  }

  const { task } = today;
  // The flag is the task's own: a serious task never reaches the reveal, the hatch or a monster.
  const quiet = today.kind === 'serious';
  if (pick.kind === 'offered') {
    return {
      kind: 'one_thing',
      task,
      quiet,
      reveal: quiet ? null : pick.reveal,
      deadline: input.heardDeadlines[0] ?? null,
      another: pick.another,
    };
  }
  if (pick.kind === 'bargaining') {
    return { kind: 'bargain', task, excuse: pick.excuse, ask: pick.ask };
  }
  if (pick.kind === 'hatching' && !quiet && task.screen === 'pass') {
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
      quiet || monster === null
        ? null
        : { row: monster, sizeFactor: carried ? carriedSizeFactor(task) : 1 },
  };
}
