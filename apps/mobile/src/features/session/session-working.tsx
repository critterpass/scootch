import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ClassIcon } from '../desk/class-icons';
import { fadeUp } from '../desk/class-motion';
import { BUTTON_MAX_SCALE, buttonText, cappedSize, ink, shapes, type } from '../desk/class-style';

import { SessionClockView } from './session-clock';
import type { SessionClock } from './session-model';

export interface SessionWorkingProps {
  readonly title: string;
  readonly clock: SessionClock | null;
  readonly heavy: boolean;
  readonly plain?: boolean;
  /** "Say it" for a stray thought, while it is open. */
  readonly stray: ReactNode;
  /**
   * iPhone Duo's card, as its boards draw it: Raise a hand and Done side by side, the stray
   * thought on the side's microphone.
   */
  readonly duo?: boolean;
  readonly onRaiseHand: () => void;
  readonly onStray: () => void;
  readonly onDone: () => void;
  readonly onNotYet: () => void;
}

/**
 * The period while it runs: the task, the time left and its track, then raise a hand, a stray
 * thought and Done (Not yet once the time is up). At the accessibility sizes the title wraps in
 * full, the time wraps under its label (the clock caps its own growth), and the buttons stack at full width with their labels
 * grown to 1.6× at most, as on the desk.
 */
export function SessionWorking(props: SessionWorkingProps) {
  const t = useT();
  const { largeText, allowFontScaling, size } = useScreenStyle();
  const sizing = { allowFontScaling, size };
  const { clock } = props;
  const timeUp = clock?.timeUp ?? false;
  const label = (design: number) => ({ fontSize: cappedSize(sizing, design) });
  const lines = largeText ? 0 : 1;
  // On iPhone Duo the two buttons share a row, unless the text is too large for it.
  const duoRow = props.duo === true && !largeText;

  const soft = (testID: string, icon: 'hand' | 'pencil', text: string, onPress: () => void) => (
    <PressSpring
      feedback="choice"
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[shapes.button, shapes.soft, largeText ? styles.stacked : styles.small]}
    >
      <ClassIcon name={icon} color={ink.text} />
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={BUTTON_MAX_SCALE}
        numberOfLines={lines}
        style={[buttonText.soft, styles.centred, styles.shrink, label(15)]}
      >
        {text}
      </Text>
    </PressSpring>
  );

  return (
    <View style={styles.panel} testID="session-working">
      <View style={[styles.headRow, largeText ? styles.wrap : null]}>
        <Text allowFontScaling={allowFontScaling} style={[type.label, { color: ink.muted }]}>
          {timeUp ? t('session.time') : t('session.working')}
        </Text>
        {clock?.inTime && !props.heavy && props.plain !== true ? (
          <Text
            allowFontScaling={allowFontScaling}
            style={[type.hand, { color: ink.red }, { fontSize: size(18) }]}
          >
            {t('session.inTime')}
          </Text>
        ) : null}
      </View>
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        numberOfLines={largeText ? 0 : 3}
        style={[styles.taskTitle, { fontSize: size(19) }]}
      >
        {props.title}
      </Text>
      {clock !== null ? <SessionClockView clock={clock} /> : null}
      {props.stray ?? (
        <View style={[styles.buttons, duoRow ? styles.pair : null]}>
          {!timeUp ? (
            <View style={duoRow ? styles.grow : largeText ? styles.column : styles.pair}>
              {soft('session-raise-hand', 'hand', t('session.raiseHand'), props.onRaiseHand)}
              {props.duo === true
                ? null
                : soft('session-stray', 'pencil', t('session.strayThought'), props.onStray)}
            </View>
          ) : (
            <Animated.View entering={fadeUp} style={duoRow ? styles.grow : null}>
              <PressSpring
                feedback="choice"
                testID="session-not-yet"
                accessibilityRole="button"
                onPress={props.onNotYet}
                style={[shapes.button, shapes.soft, largeText ? styles.stacked : styles.small]}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  maxFontSizeMultiplier={BUTTON_MAX_SCALE}
                  numberOfLines={lines}
                  style={[buttonText.soft, styles.centred, label(17)]}
                >
                  {t('session.notYet')}
                </Text>
              </PressSpring>
            </Animated.View>
          )}
          <PressSpring
            feedback="primary"
            testID="session-done"
            accessibilityRole="button"
            onPress={props.onDone}
            style={[shapes.button, shapes.ink, duoRow ? styles.grow : null]}
          >
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={BUTTON_MAX_SCALE}
              numberOfLines={lines}
              style={[buttonText.ink, styles.centred, label(17)]}
            >
              {t('session.done')}
            </Text>
          </PressSpring>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 22,
  },
  wrap: { flexWrap: 'wrap', rowGap: 4, columnGap: 10 },
  taskTitle: { fontWeight: '600', color: ink.text, letterSpacing: -0.2, marginTop: -4 },
  buttons: { gap: 10, marginTop: 14 },
  pair: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
  column: { gap: 10 },
  small: { flex: 1, minHeight: 48, paddingHorizontal: 10 },
  stacked: { minHeight: 56, paddingVertical: 10 },
  centred: { textAlign: 'center' },
  shrink: { flexShrink: 1 },
});
