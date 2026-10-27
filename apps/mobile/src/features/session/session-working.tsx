import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
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

  const soft = (testID: string, icon: 'hand' | 'pencil', text: string, onPress: () => void) => (
    <Pressable
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
    </Pressable>
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
        <View style={styles.buttons}>
          {!timeUp ? (
            <View style={largeText ? styles.column : styles.pair}>
              {soft('session-raise-hand', 'hand', t('session.raiseHand'), props.onRaiseHand)}
              {soft('session-stray', 'pencil', t('session.strayThought'), props.onStray)}
            </View>
          ) : (
            <Animated.View entering={fadeUp}>
              <Pressable
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
              </Pressable>
            </Animated.View>
          )}
          <Pressable
            testID="session-done"
            accessibilityRole="button"
            onPress={props.onDone}
            style={[shapes.button, shapes.ink]}
          >
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={BUTTON_MAX_SCALE}
              numberOfLines={lines}
              style={[buttonText.ink, styles.centred, label(17)]}
            >
              {t('session.done')}
            </Text>
          </Pressable>
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
  column: { gap: 10 },
  small: { flex: 1, minHeight: 48, paddingHorizontal: 10 },
  stacked: { minHeight: 56, paddingVertical: 10 },
  centred: { textAlign: 'center' },
  shrink: { flexShrink: 1 },
});
