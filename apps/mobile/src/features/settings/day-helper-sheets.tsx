import { Modal } from 'react-native';

import {
  DAY_MOMENTS,
  dayMomentTimes,
  getReadyLeadMinutes,
  type ClockTime,
  type DayMoment,
  type SettingsRow,
} from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { FittedSheet, SheetHeading } from '../../ui/fitted-sheet';
import { Words } from '../table/words';

import { Stepper, stepClock } from './quiet-hours';
import { Section } from './rows';

/** A day moment is moved ten minutes at a time. */
const MOMENT_STEP_MINUTES = 10;
/** The lead before a time heard: five minutes at a time, from five to three hours. */
const LEAD_STEP = 5;
const LEAD_MIN = 5;
const LEAD_MAX = 180;

const MOMENT_KEYS = {
  coffee: 'coffeeAt',
  lunch: 'lunchAt',
  work: 'workAt',
  dinner: 'dinnerAt',
  bed: 'bedAt',
} as const satisfies Record<DayMoment, keyof SettingsRow>;

type HelperChanges = Partial<
  Pick<
    SettingsRow,
    'coffeeAt' | 'lunchAt' | 'workAt' | 'dinnerAt' | 'bedAt' | 'getReadyLeadMinutes'
  >
>;

/** The lead moved by some steps, held between five minutes and three hours. */
export function stepLead(minutes: number, steps: number): number {
  const moved = Math.round((minutes + steps * LEAD_STEP) / LEAD_STEP) * LEAD_STEP;
  return Math.min(LEAD_MAX, Math.max(LEAD_MIN, moved));
}

/** The change one step of a day moment writes. */
export function momentChange(moment: DayMoment, time: ClockTime, steps: number): HelperChanges {
  return { [MOMENT_KEYS[moment]]: stepClock(time, steps, MOMENT_STEP_MINUTES) };
}

export interface DayHelperSheetProps {
  readonly settings: SettingsRow;
  readonly onChange: (changes: HelperChanges) => void;
  readonly onClose: () => void;
}

/** The five moments of a day, each moved ten minutes earlier or later. Every step is written. */
export function DayMomentsSheet({ settings, onChange, onClose }: DayHelperSheetProps) {
  const t = useT();
  const times = dayMomentTimes(settings);
  return (
    <FittedSheet
      testID="day-moments"
      close={{
        label: t('settings.close'),
        hint: t('settings.close.hint'),
        onPress: onClose,
        testID: 'day-moments-close',
      }}
    >
      <SheetHeading>
        <Words kind="title">{t('settings.dayMoments')}</Words>
        <Words kind="quiet">{t('settings.dayMoments.note')}</Words>
      </SheetHeading>
      <Section>
        {DAY_MOMENTS.map((moment, index) => (
          <Stepper
            key={moment}
            first={index === 0}
            id={`moment-${moment}`}
            label={t(`settings.dayMoments.${moment}`)}
            value={times[moment]}
            earlier={t('settings.dayMoments.earlier')}
            later={t('settings.dayMoments.later')}
            onStep={(steps) => onChange(momentChange(moment, times[moment], steps))}
          />
        ))}
      </Section>
    </FittedSheet>
  );
}

/** How long before a time heard getting ready starts, five minutes at a time. */
export function GetReadySheet({ settings, onChange, onClose }: DayHelperSheetProps) {
  const t = useT();
  const lead = getReadyLeadMinutes(settings);
  return (
    <FittedSheet
      testID="get-ready"
      close={{
        label: t('settings.close'),
        hint: t('settings.close.hint'),
        onPress: onClose,
        testID: 'get-ready-close',
      }}
    >
      <SheetHeading>
        <Words kind="title">{t('settings.getReady')}</Words>
        <Words kind="quiet">{t('settings.getReady.note')}</Words>
      </SheetHeading>
      <Section>
        <Stepper
          first
          id="get-ready-lead"
          label={t('settings.getReady.lead')}
          value={t('settings.getReady.minutes', { minutes: lead })}
          earlier={t('settings.getReady.less')}
          later={t('settings.getReady.more')}
          onStep={(steps) => onChange({ getReadyLeadMinutes: stepLead(lead, steps) })}
        />
      </Section>
    </FittedSheet>
  );
}

/** Which of the two sheets is up over Settings, if either. */
export type DayHelperSheet = 'day-moments' | 'get-ready';

/** The sheet over Settings, slid up from the foot; closing it keeps what is shown. */
export function DayHelperSheetModal({
  open,
  ...props
}: DayHelperSheetProps & { readonly open: DayHelperSheet | null }) {
  return (
    <Modal visible={open !== null} transparent animationType="slide" onRequestClose={props.onClose}>
      {open === 'get-ready' ? <GetReadySheet {...props} /> : <DayMomentsSheet {...props} />}
    </Modal>
  );
}
