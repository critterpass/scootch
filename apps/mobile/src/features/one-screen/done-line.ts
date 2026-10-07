import type { Attitude } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { lineWithNoTask } from '../../state/lines';

type Shown = { readonly slot: string; readonly text: string } | null;

/**
 * What Scootch says when the day is done. A finish says its own line; a serious task set aside
 * says its plain one for leaving it; otherwise the offline pack's line for the end of the day.
 */
export function doneLine(
  shown: Shown,
  voice: { readonly language: Language; readonly attitude: Attitude },
): string {
  return shown && ['done', 'caught', 'notFinished'].includes(shown.slot)
    ? shown.text
    : lineWithNoTask('doneForToday', voice);
}
