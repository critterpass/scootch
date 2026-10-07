import {
  treatPlaceholder,
  type SeriousLinePack,
  type SessionLine,
  type SessionLinePack,
  type SessionTone,
  type SettingsRow,
  type TaskRow,
} from '@scootch/domain';
import { t } from '@scootch/i18n';
import {
  noTaskLine,
  offlineLine,
  offlinePacks,
  offlineSlots,
  type NoTaskSlot,
  type OfflineSlot,
} from '@scootch/voice';

import { showsComedy, showsSelling, type SellingDay } from './shows-comedy';

export type LineSlot = SessionLine | 'hatch' | 'working';

/**
 * Whether a task takes the quiet path. A screened task says so itself. One the server has not
 * screened yet is quiet when the phone's own gate saw a dark or heavy word in it.
 */
export function toneFor(task: Pick<TaskRow, 'screen' | 'seriousOverridden' | 'text'>): SessionTone {
  return showsComedy(task, 'burst') ? 'full' : 'quiet';
}

/** The plain-words lines, as a serious task stores them and as the offline pack holds them. */
type PlainPack = Omit<SeriousLinePack, 'working'> & { readonly working: readonly string[] };

/**
 * The plain words for a task nobody trusted has screened yet: typed with no connection, or sent
 * when no trusted model answered in time. Nothing is known about it, so nothing is claimed: no
 * joke, and no word that it is heavy. The care pack's "That sounds like a lot" belongs only to
 * text that was judged serious, by the screen or by the phone's own gate.
 */
function neutralPack(language: SettingsRow['language']): PlainPack {
  return {
    acknowledge: t(language, 'plain.unscreened.acknowledge'),
    working: [
      t(language, 'plain.unscreened.working.first'),
      t(language, 'plain.unscreened.working.second'),
    ],
    tinyNextStep: t(language, 'plain.unscreened.tinyNextStep'),
    done: t(language, 'plain.unscreened.done'),
    notFinished: t(language, 'plain.unscreened.notFinished'),
  };
}

function fromPlain(pack: PlainPack, slot: LineSlot, turn: number): string | null {
  if (slot === 'acknowledge' || slot === 'start') return pack.acknowledge;
  if (slot === 'done' || slot === 'caught') return pack.done;
  if (slot === 'tinyNextStep' || slot === 'checkIn') return pack.tinyNextStep;
  if (slot === 'notFinished') return pack.notFinished;
  if (slot === 'working') return pack.working[turn % pack.working.length] ?? null;
  // Plain company has no words for the clock or for small moments.
  return null;
}

/**
 * A task's tiny next steps, each smaller than the one before and none of them twice. A pack
 * written before the smaller ones existed has the one step.
 */
export function nextSteps(lines: TaskRow['lines']): readonly string[] {
  if (lines === null) return [];
  const tinier = 'hatch' in lines ? (lines.tinierNextSteps ?? []) : [];
  return [...new Set([lines.tinyNextStep, ...tinier])];
}

function fromSessionPack(pack: SessionLinePack, slot: LineSlot, turn: number): string | null {
  if (slot === 'working') return pack.working[turn % pack.working.length] ?? null;
  if (slot === 'tinyNextStep') {
    // `turn` counts the steps down already taken; past the smallest step it stays there.
    const steps = nextSteps(pack);
    return steps[Math.min(Math.max(0, turn), steps.length - 1)] ?? null;
  }
  const line = (pack as Record<string, unknown>)[slot];
  return typeof line === 'string' ? line : null;
}

const isOfflineSlot = (slot: string): slot is OfflineSlot =>
  (offlineSlots as readonly string[]).includes(slot);

/**
 * The words for one line slot. A task the server has answered for speaks its own stored lines.
 * Until then the lines come from the offline pack, which is never about the task. There is no
 * joke before the screen: only a task screened as ordinary gets the pack's lines in the person's
 * attitude, and every other task gets its plain words. `null` means nothing is said.
 */
export function lineFor(
  slot: LineSlot,
  task: TaskRow,
  settings: Pick<SettingsRow, 'language' | 'attitude'>,
  turn = 0,
): string | null {
  const { lines } = task;
  if (lines !== null) {
    return 'hatch' in lines ? fromSessionPack(lines, slot, turn) : fromPlain(lines, slot, turn);
  }
  if (!showsComedy(task, 'joke')) {
    // An ordinary task typed with no connection: under the timer Scootch says when its monster
    // will come. A task the phone's gate held gets plain company and no word about monsters.
    const unjudged = task.screen === 'unscreened' && showsComedy(task, 'burst');
    if (unjudged && slot === 'working') {
      return noTaskLine(settings.language, settings.attitude, 'hatchesWhenBack');
    }
    // Only text that was judged serious, by the screen or by the phone's gate, gets the care pack.
    const pack = unjudged ? neutralPack(settings.language) : offlinePacks[settings.language].plain;
    return fromPlain(pack, slot, turn);
  }
  if (!isOfflineSlot(slot)) return null;
  // The offline pack has one tiny next step: a count of steps down is not a turn through it.
  return offlineLine(
    settings.language,
    settings.attitude,
    slot,
    slot === 'tinyNextStep' ? 0 : turn,
  );
}

/**
 * The words for a moment with no task to talk about (first launch, waiting, the end of the day),
 * from the offline pack in the person's language and attitude.
 */
export function lineWithNoTask(
  slot: NoTaskSlot,
  settings: Pick<SettingsRow, 'language' | 'attitude'>,
): string {
  return noTaskLine(settings.language, settings.attitude, slot);
}

/**
 * A line Scootch speaks about Plus (the sheet, the first offer, a purchase's own moment). On a day
 * with something heavy in it there is none: `null`, and the screen says nothing.
 */
export function plusLine(
  slot: NoTaskSlot,
  settings: Pick<SettingsRow, 'language' | 'attitude'>,
  day: SellingDay,
): string | null {
  return showsSelling(day) ? noTaskLine(settings.language, settings.attitude, slot) : null;
}

/** What Scootch says on the screens after a finish, where the task's own pack has the words. */
export interface AfterLines {
  /** The ceremony line of the treat, naming it. */
  readonly treat: string | null;
  /** Said over the thoughts parked during the session. */
  readonly parkedThoughts: string | null;
}

export const NO_AFTER_LINES: AfterLines = { treat: null, parkedThoughts: null };

/**
 * The treat and parked-thoughts lines of a task's own pack. Only an ordinary task whose pack has
 * them says anything; every other task shows those screens as they were, without a line.
 */
export function afterLinesFor(task: TaskRow, treat: string | null): AfterLines {
  const { lines } = task;
  if (lines === null || !('hatch' in lines) || !showsComedy(task, 'joke')) return NO_AFTER_LINES;
  const name = treat?.trim() ?? '';
  return {
    treat:
      lines.treatHandOver === undefined || name === ''
        ? null
        : lines.treatHandOver.split(treatPlaceholder).join(name),
    parkedThoughts: lines.parkedThoughts ?? null,
  };
}
