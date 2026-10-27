import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { fadeUp } from './class-motion';
import { BUTTON_MAX_SCALE, buttonText, cappedSize, ink, shapes, type } from './class-style';
import type { DeskModel } from './desk-model';
import type { RecessView } from './desk-view';
import { StartButton } from './start-button';
import { TallyMarks } from './tally-marks';

export interface DeskCardProps {
  readonly model: DeskModel;
  readonly typing: boolean;
  readonly chosenMinutes: number | null;
  /** The drum is sounding for the period about to begin. */
  readonly ringing: boolean;
  readonly onCardLayout: (event: LayoutChangeEvent) => void;
  readonly onStart: () => void;
  readonly onLength: (minutes: number) => void;
  readonly onSlip: () => void;
  readonly onNotNow: () => void;
}

/**
 * The desk sheet's card: the one task with its tallies, days and front-row tag, the user's note
 * for next time, then the late slip and Start. A heavy task gets plain company instead: no fuse,
 * no slip. An empty desk asks for something.
 */
export function DeskCard(props: DeskCardProps) {
  const t = useT();
  const sizing = useTextSizing();
  // At the accessibility sizes the title wraps in full and the buttons stack, full width.
  const { largeText } = useScreenStyle();
  // The front-row tag and the note fade up as they appear, as the board's `fade` does.
  const appear = useMayMove() ? { entering: fadeUp } : {};
  const { model } = props;
  const task = model.task;
  const onCardLayout = props.onCardLayout;
  const deskHead =
    task === null ? (
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Text
            allowFontScaling={sizing.allowFontScaling}
            style={[type.label, { color: ink.muted }]}
          >
            {t('desk.onYourDesk')}
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          allowFontScaling={sizing.allowFontScaling}
          style={[type.title, { fontSize: sizing.size(25), lineHeight: sizing.size(30) }]}
        >
          {t('desk.clearTitle')}
        </Text>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.sub, { fontSize: sizing.size(15) }]}
        >
          {t('desk.clearHint')}
        </Text>
      </View>
    ) : (
      <View style={styles.head} onLayout={onCardLayout} testID="desk-card">
        <View style={[styles.headRow, largeText ? styles.headRowLarge : null]}>
          <View style={styles.headLeft}>
            <Text
              allowFontScaling={sizing.allowFontScaling}
              style={[type.label, { color: ink.red }]}
            >
              {t('desk.onYourDesk')}
            </Text>
            {model.task?.frontRow ? (
              <Animated.Text
                {...appear}
                testID="desk-front-row"
                allowFontScaling={sizing.allowFontScaling}
                style={[type.hand, styles.frontRow, { fontSize: sizing.size(15) }]}
              >
                {t('desk.frontRow')}
              </Animated.Text>
            ) : null}
          </View>
          <View style={styles.headRight}>
            <TallyMarks count={task.tallies} />
            <Text
              allowFontScaling={sizing.allowFontScaling}
              style={[styles.days, { fontSize: sizing.size(13) }]}
            >
              {task.waitedDays === 0 ? t('desk.new') : t('desk.waited', { count: task.waitedDays })}
            </Text>
          </View>
        </View>
        <Text
          testID="desk-title"
          accessibilityRole="header"
          allowFontScaling={sizing.allowFontScaling}
          numberOfLines={props.typing ? 1 : largeText ? 0 : 3}
          style={[
            type.title,
            props.typing
              ? { fontSize: sizing.size(19), lineHeight: sizing.size(25) }
              : { fontSize: sizing.size(25), lineHeight: sizing.size(30) },
          ]}
        >
          {task.title}
        </Text>
        {task.note !== null ? (
          <Animated.Text
            {...appear}
            allowFontScaling={sizing.allowFontScaling}
            style={[type.hand, styles.note, { fontSize: sizing.size(19) }]}
          >
            {t('desk.noteToSelf', { note: task.note })}
          </Animated.Text>
        ) : null}
      </View>
    );

  // The late slip; stacked under Start at the largest sizes, never offered in plain company.
  const slip = (
    <Pressable
      testID="desk-late-slip"
      accessibilityRole="button"
      onPress={props.onSlip}
      style={[shapes.button, shapes.soft, largeText ? null : styles.slipButton]}
    >
      <Text
        allowFontScaling={sizing.allowFontScaling}
        maxFontSizeMultiplier={BUTTON_MAX_SCALE}
        numberOfLines={largeText ? 0 : 1}
        style={[buttonText.soft, styles.centred, { fontSize: cappedSize(sizing, 17) }]}
      >
        {t('desk.lateSlip')}
      </Text>
    </Pressable>
  );

  const actions =
    task === null || props.typing ? null : model.heavy ? (
      <View style={styles.actionsColumn}>
        <Pressable
          testID="desk-start"
          accessibilityRole="button"
          onPress={props.onStart}
          style={[shapes.button, styles.seriousStart]}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
            {t('desk.sitWithMe')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={props.onNotNow} style={styles.notNow}>
          <Text
            allowFontScaling={sizing.allowFontScaling}
            style={[buttonText.soft, styles.notNowText]}
          >
            {t('desk.notNow')}
          </Text>
        </Pressable>
      </View>
    ) : (
      <View style={largeText ? styles.actionsStacked : styles.actions}>
        {model.canSlip && !largeText ? slip : null}
        <StartButton
          fuseLeft={model.fuse?.left ?? null}
          fuseLeftMs={model.fuse?.leftMs ?? 0}
          minutes={props.chosenMinutes ?? model.periodMinutes}
          pulse={model.pulse}
          pressure={model.pressure}
          ringing={props.ringing}
          onStart={props.onStart}
          onLength={props.onLength}
          stacked={largeText}
        />
        {model.canSlip && largeText ? slip : null}
      </View>
    );

  return (
    <>
      {deskHead}
      {actions}
    </>
  );
}

/** Recess on the desk sheet: five minutes counting down, offered and never forced. */
export function RecessPanel({
  recess,
  onBackToClass,
}: {
  readonly recess: RecessView;
  readonly onBackToClass: () => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const props = { onBackToClass };
  return (
    <View style={styles.head} testID="desk-recess">
      <View style={styles.headRow}>
        <Text allowFontScaling={sizing.allowFontScaling} style={[type.label, { color: ink.green }]}>
          {t('recess.title')}
        </Text>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[type.hand, { color: ink.green, fontSize: sizing.size(18) }]}
        >
          {recess.over ? t('recess.over') : t('recess.earned')}
        </Text>
      </View>
      <Text
        allowFontScaling={sizing.allowFontScaling}
        style={[type.title, { fontSize: sizing.size(22), lineHeight: sizing.size(28) }]}
      >
        {t('recess.heading')}
      </Text>
      <View style={styles.timerRow}>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[type.rounded, styles.timer, { color: ink.green, fontSize: sizing.size(64) }]}
        >
          {recess.left}
        </Text>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.days, { fontSize: sizing.size(15) }]}
        >
          {t('recess.of', { minutes: 5 })}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: 'rgba(47,107,86,0.12)' }]}>
        <View
          style={[styles.trackFill, { width: `${recess.gone * 100}%`, backgroundColor: ink.green }]}
        />
      </View>
      <Pressable
        testID="recess-back"
        accessibilityRole="button"
        onPress={props.onBackToClass}
        style={[shapes.button, shapes.ink, styles.backToClass]}
      >
        <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
          {t('recess.back')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  headRowLarge: { flexWrap: 'wrap', rowGap: 4, columnGap: 10 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  frontRow: {
    color: ink.red,
    borderWidth: 1.5,
    borderColor: ink.red,
    borderRadius: 10,
    paddingHorizontal: 7,
  },
  days: { color: ink.muted },
  sub: { color: ink.muted, lineHeight: 21 },
  note: { color: ink.purple },
  actions: { flexDirection: 'row', gap: 10 },
  actionsStacked: { gap: 10 },
  centred: { textAlign: 'center' },
  actionsColumn: { gap: 6 },
  slipButton: { width: 112, paddingHorizontal: 8 },
  seriousStart: { backgroundColor: '#3A3530' },
  notNow: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontWeight: '600' },
  timerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 },
  timer: { lineHeight: undefined, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  trackFill: { height: '100%', borderRadius: 3 },
  backToClass: { marginTop: 24 },
});
