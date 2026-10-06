import type { TaskRow } from '@scootch/domain';

import { careGate } from '../api/care-gate';

/** The things that must stop for a heavy task. */
export type Comedy = 'monster' | 'joke' | 'card' | 'share' | 'burst' | 'notification';

/** The care flags a task carries, as the store keeps them. */
export type CareFlags = Pick<TaskRow, 'screen'> & {
  readonly seriousOverridden?: boolean;
  /** Needed only for a task nobody has screened yet, where the phone's own gate decides. */
  readonly text?: string;
};

/**
 * The one answer to "may this be shown, played or sent for this task?". Every place that can draw
 * a monster, say a joke, make a card, offer a share, play the burst or schedule one of the task's
 * own notifications asks here and nowhere else.
 *
 * - No task (which is all a crisis day ever has): nothing.
 * - A serious task: nothing, until the person says "It's fine, be funny". Then the jokes, the
 *   burst and the notifications may come back; the monster, the card and the share wait for the
 *   server to screen the task again as an ordinary one.
 * - A task not screened yet: no joke about it. The start burst and the hold to finish are the
 *   phone's own and are allowed, unless the phone's gate saw a dark or heavy word.
 */
export function showsComedy(task: CareFlags | null, what: Comedy): boolean {
  if (task === null) return false;
  if (task.screen === 'pass') return true;
  if (task.screen === 'serious') {
    const asked = task.seriousOverridden === true;
    return asked && (what === 'joke' || what === 'burst' || what === 'notification');
  }
  return what === 'burst' && task.text !== undefined && careGate(task.text) === 'clear';
}
