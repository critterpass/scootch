import { getReadyLeadMinutes, showsOthersHunting, type SettingsRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';

import { Row, SwitchRow } from './rows';

/** The two rows of the day's times: the five moments, and the lead before a time heard. */
export function DayTimeRows({
  settings,
  onOpen,
}: {
  readonly settings: SettingsRow;
  readonly onOpen: (sheet: 'day-moments' | 'get-ready') => void;
}) {
  const t = useT();
  return (
    <>
      <Row
        label={t('settings.dayMoments')}
        hint={t('settings.dayMoments.hint')}
        onPress={() => onOpen('day-moments')}
        testID="settings-day-moments"
      />
      <Row
        label={t('settings.getReady')}
        hint={t('settings.getReady.hint')}
        value={t('settings.getReady.minutes', { minutes: getReadyLeadMinutes(settings) })}
        onPress={() => onOpen('get-ready')}
        testID="settings-get-ready"
      />
    </>
  );
}

/** The switch for the count of others in a session. Off, no number is shown and nothing is sent. */
export function OthersHuntingRow({
  settings,
  onChange,
}: {
  readonly settings: SettingsRow;
  readonly onChange: (changes: Pick<SettingsRow, 'othersHunting'>) => void;
}) {
  const t = useT();
  return (
    <SwitchRow
      label={t('settings.othersHunting')}
      sub={t('settings.othersHunting.sub')}
      hint={t('settings.othersHunting.hint')}
      value={showsOthersHunting(settings)}
      onChange={(othersHunting) => onChange({ othersHunting })}
      testID="settings-others-hunting"
    />
  );
}
