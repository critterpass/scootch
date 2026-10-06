import {
  type SeriousLinePack,
  type SessionLine,
  type SessionLinePack,
  type SessionTone,
  type SettingsRow,
  type TaskRow,
} from '@scootch/domain';
import {
  noTaskLine,
  offlineLine,
  offlinePacks,
  offlineSlots,
  type NoTaskSlot,
  type OfflineSlot,
} from '@scootch/voice';

import { showsComedy } from './shows-comedy';

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

function fromPlain(pack: PlainPack, slot: LineSlot, turn: number): string | null {
  if (slot === 'acknowledge' || slot === 'start') return pack.acknowledge;
  if (slot === 'done' || slot === 'caught') return pack.done;
  if (slot === 'tinyNextStep' || slot === 'checkIn') return pack.tinyNextStep;
  if (slot === 'notFinished') return pack.notFinished;
  if (slot === 'working') return pack.working[turn % pack.working.length] ?? null;
  // Plain company has no words for the clock or for small moments.
  return null;
}

function fromSessionPack(pack: SessionLinePack, slot: LineSlot, turn: number): string | null {
  if (slot === 'working') return pack.working[turn % pack.working.length] ?? null;
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
    if (task.screen === 'unscreened' && showsComedy(task, 'burst') && slot === 'working') {
      return noTaskLine(settings.language, settings.attitude, 'hatchesWhenBack');
    }
    return fromPlain(offlinePacks[settings.language].plain, slot, turn);
  }
  return isOfflineSlot(slot) ? offlineLine(settings.language, settings.attitude, slot, turn) : null;
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
