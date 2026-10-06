import { localDateTime } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { trialDayOf } from './charge-reminders';

/**
 * The day before a trial's charge, said once more on the one screen in plain words: a note, not a
 * control. It opens nothing and sells nothing, and it is plain enough to sit beside a heavy task.
 */
export function ChargeNote() {
  const t = useT();
  const { palette } = useScreenStyle();
  const runtime = usePlusRuntime();
  const { customer } = usePlusState();
  const timeZone = runtime.timeZone();
  const today = localDateTime(runtime.now(), timeZone).date;
  if (trialDayOf(customer, today, timeZone) !== 'day_before') return null;
  return (
    <SessionText face="caption" color={palette.muted} testID="charge-note">
      {t('plus.note.trialEndsTomorrow')}
    </SessionText>
  );
}
