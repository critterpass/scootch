import {
  isQuietTask,
  type SeriousLinePack,
  type SessionLine,
  type SessionLinePack,
  type SessionTone,
  type SettingsRow,
  type TaskRow,
} from '@scootch/domain';
import { offlineLine, offlinePacks, offlineSlots, type OfflineSlot } from '@scootch/voice';

import { careGate } from '../api/care-gate';

export type LineSlot = SessionLine | 'hatch' | 'working';

/**
 * Whether a task takes the quiet path. A screened task says so itself. One the server has not
 * screened yet is quiet when the phone's own gate saw a dark or heavy word in it.
 */
export function toneFor(task: Pick<TaskRow, 'screen' | 'seriousOverridden' | 'text'>): SessionTone {
  if (isQuietTask(task)) return 'quiet';
  return task.screen === 'unscreened' && careGate(task.text) !== 'clear' ? 'quiet' : 'full';
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
  if (task.screen !== 'pass' || toneFor(task) === 'quiet') {
    return fromPlain(offlinePacks[settings.language].plain, slot, turn);
  }
  return isOfflineSlot(slot) ? offlineLine(settings.language, settings.attitude, slot, turn) : null;
}
