/**
 * The app's side of the helpline table. The rows, their hours and the rules for what is open live
 * in `@scootch/i18n`, where the website reads the very same table; this file adds only the words
 * on the app's buttons. Nothing here is ever logged.
 */
import type { Helpline } from '@scootch/i18n';

import type { Translate } from '../../i18n/i18n-provider';

export {
  HELPLINES,
  HELPLINE_DIRECTORY,
  dialLink,
  helplineDetail,
  helplinesFor,
  orderedAt,
  textLink,
} from '@scootch/i18n';
export type { Helpline } from '@scootch/i18n';

/** The words on a helpline's button: what to do, the number, and whose line it is. */
export function helplineLabel(t: Translate, line: Helpline): string {
  if (line.reach === 'emergency') return t('care.helpline.emergency', { number: line.number });
  const key = line.reach === 'call_or_text' ? 'care.helpline.callOrText' : 'care.helpline.call';
  return t(key, { number: line.number, name: line.name });
}

/** The words on the button for a line's own text number, or null when it has none. */
export function textLabel(t: Translate, line: Helpline): string | null {
  if (line.textNumber === undefined) return null;
  return t('care.helpline.text', { number: line.textNumber, name: line.name });
}
