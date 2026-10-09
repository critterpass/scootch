import type { Attitude, DayHeardTime } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { helperLine, timeSaidBackLine } from '@scootch/voice';

import { useT } from '../../i18n/i18n-provider';
import { useDispatch } from '../../state/day-store-provider';
import { CapsuleButton } from '../../ui/buttons';

import { HeardCard } from './dump-panels';

export interface TimeHeardCardProps {
  readonly heardTime: Pick<DayHeardTime, 'heardAs'>;
  readonly language: Language;
  /** The day's voice; `plain` for a serious thing, which is told the plan in plain words. */
  readonly voice: Attitude | 'plain';
}

/**
 * A time heard in the words, said back on the one thing ("Dentist at 3.") with what Scootch will
 * do about it, from the offline pack, and its two answers: "Good", and "Don't watch it". The
 * answer goes straight to the day store.
 */
export function TimeHeardCard({ heardTime, language, voice }: TimeHeardCardProps) {
  const t = useT();
  const dispatch = useDispatch();
  const onAnswer = (watched: boolean) =>
    void dispatch({ type: 'heard_time_answered', watched }).catch(() => undefined);
  const plan =
    voice === 'plain'
      ? helperLine(language, 'plain', 'timeHeardPlan')
      : helperLine(language, voice, 'timeHeardPlan');
  return (
    <HeardCard
      testID="time-heard"
      mark={t('heardTime.mark')}
      said={timeSaidBackLine(language, heardTime.heardAs)}
      under={plan}
    >
      <CapsuleButton
        label={t('heardTime.good')}
        hint={t('heardTime.good.hint')}
        onPress={() => onAnswer(true)}
        testID="time-heard-good"
      />
      <CapsuleButton
        label={t('heardTime.unwatched')}
        hint={t('heardTime.unwatched.hint')}
        tone="quiet"
        onPress={() => onAnswer(false)}
        testID="time-heard-unwatched"
      />
    </HeardCard>
  );
}
