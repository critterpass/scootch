import type { Attitude, Language, TaskRow } from '@scootch/domain';

import { lineWithNoTask } from '../../state/lines';
import { showsComedy } from '../../state/shows-comedy';

export interface Connection {
  /** The phone has no connection. */
  readonly offline: boolean;
  /** The last task call failed with a connection up: the model is down or slow. */
  readonly modelDown: boolean;
}

/**
 * What Scootch says about a task nobody has screened yet, from the offline pack: that his brain
 * is buffering, or that there is no signal, and then when the monster will come. Never a word
 * about the task itself. A task the phone's gate held, and any screened task, gets `null`: its
 * own lines speak, or nothing does.
 */
export function wordsWhileUnscreened(
  task: Pick<TaskRow, 'screen' | 'seriousOverridden' | 'text'>,
  where: 'offered' | 'set',
  connection: Connection,
  voice: { readonly language: Language; readonly attitude: Attitude },
): string | null {
  if (task.screen !== 'unscreened' || !showsComedy(task, 'burst')) return null;
  if (connection.modelDown) {
    return lineWithNoTask(where === 'offered' ? 'modelDown' : 'modelDownMore', voice);
  }
  if (connection.offline) {
    return lineWithNoTask(where === 'offered' ? 'offline' : 'hatchesWhenBack', voice);
  }
  return null;
}
