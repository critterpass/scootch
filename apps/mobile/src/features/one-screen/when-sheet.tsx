import { getCalendars } from 'expo-localization';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  clockAt,
  DAY_MOMENTS,
  MINUTE_MS,
  type ClockTime,
  type DayMoment,
  type StartCue,
} from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import { useT, type Translate } from '../../i18n/i18n-provider';
import { momentLabel } from '../../state/start-cue';
import { CapsuleButton } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { Sheet, SheetScroll } from '../../ui/sheet/sheet';
import { useScreenStyle } from '../../ui/use-screen-style';
import { stepClock } from '../settings/quiet-hours';
import { GROUP_RADIUS } from '../settings/rows';
import { Words } from '../table/words';

import { HelperChip } from './helper-chip';

const ROW_SIZE = 17;

/** `13:10` as the app writes a time: no leading zero on the hour. */
export function clockShown(clock: ClockTime): string {
  return clock.replace(/^0(?=\d)/, '');
}

/** A cue as a sentence opens with it: "After lunch", "At 15:30". */
export function cueOpening(t: Translate, cue: StartCue): string {
  return cue.kind === 'moment'
    ? t(momentLabel(cue.moment))
    : t('when.atTime.said', { clock: clockShown(cue.at) });
}

/** The same words inside a sentence: "after lunch", "at 15:30". */
export function cueInside(t: Translate, cue: StartCue): string {
  const opening = cueOpening(t, cue);
  return opening.charAt(0).toLocaleLowerCase() + opening.slice(1);
}

/** The next half hour on the phone's clock: where "At a time" starts. */
function nextHalfHour(): ClockTime {
  const timeZone = getCalendars()[0]?.timeZone ?? 'UTC';
  return stepClock(clockAt(Date.now() + 15 * MINUTE_MS, timeZone), 0);
}

export interface WhenSheetProps {
  readonly open: boolean;
  /** The cue already picked, which the sheet opens on; `null` opens it on lunch. */
  readonly cue: StartCue | null;
  /** The clock time of each day moment, from the settings: written beside it for VoiceOver. */
  readonly moments: Readonly<Record<DayMoment, ClockTime>>;
  /** A cue picked, or `null` for "Now". */
  readonly onCue: (cue: StartCue | null) => void;
  readonly onClose: () => void;
}

/**
 * "When should I bring it back?": Now, one of the five moments of the day, or a time on the clock.
 * "Now" takes any cue away at once; a moment or a time is kept by the button, which says it back.
 */
export function WhenSheet({ open, cue, moments, onCue, onClose }: WhenSheetProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const usual: StartCue = { kind: 'moment', moment: 'lunch' };
  const [picked, setPicked] = useState<StartCue>(cue ?? usual);
  // Opened again, the sheet starts from what is kept, not from a pick that was dropped.
  useEffect(() => {
    if (open) setPicked(cue ?? { kind: 'moment', moment: 'lunch' });
  }, [open, cue]);
  const row = { fontSize: size(ROW_SIZE), lineHeight: size(ROW_SIZE) * 1.3 };
  const line = { borderTopColor: `${palette.ink}1F`, borderTopWidth: StyleSheet.hairlineWidth };
  const atTime = picked.kind === 'time' ? picked.at : null;
  const shiftTime = (steps: number) =>
    setPicked({ kind: 'time', at: stepClock(atTime ?? nextHalfHour(), steps) });
  const stepButton = (mark: string, label: string, steps: number, name: string) => (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('when.atTime.hint')}
      onPress={() => shiftTime(steps)}
      feedback="choice"
      hitSlop={spacing.xs}
      testID={`when-time-${name}`}
      style={[styles.step, { backgroundColor: `${palette.ink}0F` }]}
    >
      <Text allowFontScaling={false} style={[styles.mark, { color: palette.ink }]}>
        {mark}
      </Text>
    </PressSpring>
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      testID="when-sheet"
      header={
        <View style={styles.head}>
          <Words kind="title">{t('when.title')}</Words>
        </View>
      }
    >
      <SheetScroll contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('when.now')}
            accessibilityHint={t('when.now.hint')}
            onPress={() => {
              onCue(null);
              onClose();
            }}
            feedback="choice"
            testID="when-now"
            style={styles.row}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.label, row, { color: palette.ink }]}
            >
              {t('when.now')}
            </Text>
          </PressSpring>
          <View style={[styles.after, line]}>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.small, { color: palette.muted, fontSize: size(15) }]}
            >
              {t('when.after')}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.moments}>
              {DAY_MOMENTS.map((moment) => (
                <HelperChip
                  key={moment}
                  role="radio"
                  label={t(momentLabel(moment))}
                  spokenLabel={t('when.moment.spoken', {
                    moment: t(momentLabel(moment)),
                    clock: clockShown(moments[moment]),
                  })}
                  hint={t('when.moment.hint')}
                  set
                  chosen={picked.kind === 'moment' && picked.moment === moment}
                  onPress={() => setPicked({ kind: 'moment', moment })}
                  testID={`when-moment-${moment}`}
                />
              ))}
            </View>
          </View>
          <View style={[styles.row, styles.timeRow, line]}>
            <PressSpring
              accessibilityRole="radio"
              accessibilityState={{ selected: atTime !== null, checked: atTime !== null }}
              accessibilityLabel={t('when.atTime')}
              accessibilityHint={t('when.atTime.hint')}
              onPress={() => setPicked({ kind: 'time', at: atTime ?? nextHalfHour() })}
              feedback="choice"
              testID="when-at-time"
              style={styles.timeLabel}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  atTime === null ? styles.label : styles.chosen,
                  row,
                  { color: palette.ink },
                ]}
              >
                {t('when.atTime')}
              </Text>
            </PressSpring>
            {atTime === null ? null : (
              <View style={styles.stepper}>
                {stepButton('−', t('when.earlier'), -1, 'earlier')}
                <Text
                  testID="when-time"
                  allowFontScaling={allowFontScaling}
                  style={[styles.time, row, { color: palette.ink }]}
                >
                  {clockShown(atTime)}
                </Text>
                {stepButton('+', t('when.later'), 1, 'later')}
              </View>
            )}
          </View>
        </View>
        <CapsuleButton
          label={t('when.confirm', { cue: cueInside(t, picked) })}
          hint={t('when.confirm.hint')}
          onPress={() => {
            onCue(picked);
            onClose();
          }}
          testID="when-confirm"
        />
      </SheetScroll>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6, paddingHorizontal: 6 },
  content: { gap: 18, paddingBottom: 6 },
  card: { borderRadius: GROUP_RADIUS, overflow: 'hidden' },
  row: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  timeLabel: { flexGrow: 1, minHeight: 44, justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  after: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 10 },
  moments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontFamily: fonts.body },
  chosen: { fontFamily: fonts.body, fontWeight: '700' },
  small: { fontFamily: fonts.body },
  time: {
    fontFamily: fonts.body,
    minWidth: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mark: { fontFamily: fonts.heading, fontSize: 22, fontWeight: '600' },
});
