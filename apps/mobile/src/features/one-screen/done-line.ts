import type { Attitude } from '@phusclass/domain';
import type { Language } from '@phusclass/i18n';
import { offlinePacks } from '@phusclass/voice';

import type { DayState } from '../../state/day-types';
import { lineWithNoTask } from '../../state/lines';

type Shown = { readonly slot: string; readonly text: string } | null;

/**
 * What Scootch says when the day is done. A day that held something heavy (a serious task
 * finished, set aside or waiting, or the care screen closed) ends on the plain line and nothing
 * else, whatever else was finished in it and whatever was last said. Otherwise a finish says its
 * own line, a task set aside says its line for leaving it, and then the offline pack's line for
 * the end of the day in the person's attitude.
 */
export function doneLine(
  shown: Shown,
  voice: { readonly language: Language; readonly attitude: Attitude },
  day: Pick<DayState, 'heavyToday'>,
): string {
  if (day.heavyToday) return offlinePacks[voice.language].plain.doneForToday;
  return shown && ['done', 'caught', 'notFinished'].includes(shown.slot)
    ? shown.text
    : lineWithNoTask('doneForToday', voice);
}
