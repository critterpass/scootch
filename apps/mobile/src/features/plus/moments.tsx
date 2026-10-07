import { StyleSheet, View } from 'react-native';

import { FREE_STARTS_PER_DAY, type Attitude } from '@scootch/domain';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { ChoiceRow } from './ui/parts';

export interface MomentProps {
  readonly attitude: Attitude;
  /** Scootch's line for the moment, from the line pack. */
  /** `null` on a day with something heavy in it: nothing is said. */
  readonly said: string | null;
  readonly close: () => void;
}

function Figure({ mood, attitude }: { mood: ScootchProps['mood']; attitude: Attitude }) {
  const { largeText } = useScreenStyle();
  const character = useCharacterMotion();
  return (
    <View style={styles.centre}>
      <Scootch mood={mood} attitude={attitude} size={largeText ? 110 : 200} {...character} />
    </View>
  );
}

export interface LastDayProps extends MomentProps {
  readonly yearlyPrice: string | null;
  readonly monthlyPrice: string | null;
  readonly keepYearly: () => void;
  readonly switchToMonthly: () => void;
  readonly stop: () => void;
}

/** The trial's last day: three choices of the same size. Stopping is as easy as keeping. */
export function LastDay(props: LastDayProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <KeepFrame
      testID="plus-last-day"
      close={{ label: t('keep.close'), hint: t('plus.done.hint'), onPress: props.close }}
      closeTestID="plus-last-day-close"
    >
      <Figure mood="thinking" attitude={props.attitude} />
      {props.said === null ? null : (
        <SessionText face="headline" color={palette.ink}>
          {props.said}
        </SessionText>
      )}
      <SessionText face="body" color={palette.muted}>
        {t('plus.lastDay.keeps', { count: FREE_STARTS_PER_DAY })}
      </SessionText>
      <ChoiceRow
        title={t('plus.lastDay.keep')}
        note={
          props.yearlyPrice === null
            ? t('plus.lastDay.keep.noteNoPrice')
            : t('plus.lastDay.keep.note', { price: props.yearlyPrice })
        }
        hint={t('plus.lastDay.keep.hint')}
        testID="plus-last-day-keep"
        onPress={props.keepYearly}
      />
      <ChoiceRow
        title={t('plus.lastDay.monthly')}
        note={
          props.monthlyPrice === null
            ? t('plus.lastDay.monthly.noteNoPrice')
            : t('plus.lastDay.monthly.note', { price: props.monthlyPrice })
        }
        hint={t('plus.opensApple.hint')}
        testID="plus-last-day-monthly"
        onPress={props.switchToMonthly}
      />
      <ChoiceRow
        title={t('plus.lastDay.stop')}
        note={t('plus.lastDay.stop.note')}
        hint={t('plus.opensApple.hint')}
        testID="plus-last-day-stop"
        onPress={props.stop}
      />
    </KeepFrame>
  );
}

export interface RenewalOffProps extends MomentProps {
  /** `cancelled` after "Cancel Plus" on the manage page; `renewal_off` everywhere else. */
  readonly after: 'renewal_off' | 'cancelled';
  /** The store's date Plus stays on until; `null` when the store gave none. */
  readonly until: string | null;
  /** Turning renewal back on is Apple's step too: this opens Apple's sheet again. */
  readonly manage: () => void;
}

/** Renewal is off, read back from the store: what happens next, said plainly. There is no undo. */
export function RenewalOff(props: RenewalOffProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  const cancelled = props.after === 'cancelled';
  return (
    <KeepFrame
      testID={cancelled ? 'plus-cancelled' : 'plus-renewal-off'}
      close={{ label: t('keep.close'), hint: t('plus.done.hint'), onPress: props.close }}
      closeTestID="plus-renewal-off-close"
      footer={
        <Dock
          quiet={{
            label: cancelled ? t('plus.cancelled.changed') : t('plus.renewalOff.manage'),
            hint: t('plus.opensApple.hint'),
            testID: 'plus-renewal-off-manage',
            onPress: props.manage,
          }}
          action={{
            label: cancelled ? t('plus.cancelled.thanks') : t('plus.renewalOff.ok'),
            hint: t('plus.done.hint'),
            testID: 'plus-renewal-off-ok',
            onPress: props.close,
          }}
        />
      }
    >
      <Figure mood={cancelled ? 'pleased' : 'asleep'} attitude={props.attitude} />
      {props.said === null ? null : (
        <SessionText face="headline" color={palette.ink} style={styles.centred}>
          {props.said}
        </SessionText>
      )}
      {props.until === null ? null : (
        <SessionText face="body" color={palette.muted} style={styles.centred} testID="plus-until">
          {cancelled
            ? t('plus.cancelled.until', { date: props.until })
            : t('plus.renewalOff.until', { date: props.until })}
        </SessionText>
      )}
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  centred: { textAlign: 'center' },
});
