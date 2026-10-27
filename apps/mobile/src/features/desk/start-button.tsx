import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Pressure } from '@phusclass/domain/board';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { clockText } from '../session/session-model';

import { css } from './class-motion';
import { BUTTON_MAX_SCALE, buttonText, cappedSize, curves, shapes } from './class-style';
import type { StartPulse } from './desk-model';
import { PeriodLengths } from './period-lengths';
import { StartDrum, StartRipple } from './start-drum';

const HEIGHT = 56;

/** The pulse a pressure step gives Start: a period and whether it nudges or breathes. */
const PULSE: Record<
  Exclude<StartPulse, 'none'>,
  { readonly ms: number; readonly nudge: boolean }
> = {
  'breathe slow': { ms: 2600, nudge: false },
  breathe: { ms: 1500, nudge: false },
  'nudge slow': { ms: 3200, nudge: true },
  nudge: { ms: 1900, nudge: true },
};

export interface StartButtonProps {
  /** Share of the fuse left, 1 to 0; `null` for no fuse (a heavy task). */
  readonly fuseLeft: number | null;
  readonly fuseLeftMs: number;
  readonly minutes: number;
  readonly pulse: StartPulse;
  /** From pressure 4 the pie burns yellow; at 4 a soft ring stands around Start. */
  readonly pressure: Pressure;
  /** The drum is sounding: it swings, and a ripple crosses Start. */
  readonly ringing?: boolean;
  readonly onStart: () => void;
  readonly onLength: (minutes: number) => void;
  readonly disabled?: boolean;
  /** At the largest text sizes the desk's buttons stack: Start takes the full width. */
  readonly stacked?: boolean;
}

/**
 * Start: the drum icon, whose pie empties as the fuse burns, "Start" and the period's length. Held,
 * it offers the length. As his pressure rises it breathes, then nudges; it is still while pressed
 * or while the lengths are out. Nothing pulses where nothing may move.
 */
export function StartButton({
  fuseLeft,
  fuseLeftMs,
  minutes,
  pulse,
  pressure,
  ringing = false,
  onStart,
  onLength,
  disabled = false,
  stacked = false,
}: StartButtonProps) {
  const t = useT();
  const mayMove = useMayMove();
  const sizing = useTextSizing();
  const [choosing, setChoosing] = useState(false);
  const [pressing, setPressing] = useState(false);

  // The fuse is read from the store once a second; between readings it burns smoothly.
  const left = useSharedValue(fuseLeft ?? 0);
  useEffect(() => {
    const next = fuseLeft ?? 0;
    left.set(mayMove ? withTiming(next, { duration: 1000, easing: Easing.linear }) : next);
  }, [fuseLeft, mayMove, left]);

  const scale = useSharedValue(1);
  const turn = useSharedValue(0);
  const still = disabled || choosing || pressing;
  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(turn);
    scale.set(1);
    turn.set(0);
    if (!mayMove || pulse === 'none' || still) return;
    const { ms, nudge } = PULSE[pulse];
    const step = (to: number, share: number) =>
      withTiming(to, { duration: ms * share, easing: css.easeInOut });
    if (nudge) {
      // The board's `ctaN`: still for three quarters, then a shake that swells and settles.
      turn.set(
        withRepeat(
          withSequence(
            step(0, 0.76),
            step(-2.6, 0.04),
            step(2.4, 0.04),
            step(-1.4, 0.04),
            step(0.8, 0.04),
            step(0, 0.08),
          ),
          -1,
        ),
      );
      scale.set(
        withRepeat(
          withSequence(
            step(1, 0.76),
            step(1.035, 0.04),
            step(1.035, 0.04),
            step(1.02, 0.04),
            step(1, 0.04),
            step(1, 0.08),
          ),
          -1,
        ),
      );
    } else {
      scale.set(withRepeat(withSequence(step(1.02, 0.5), step(1, 0.5)), -1));
    }
  }, [pulse, mayMove, still, scale, turn]);

  const pressed = useSharedValue(1);
  const moving = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() * pressed.get() }, { rotate: `${turn.get()}deg` }],
  }));
  const press = (to: number) => {
    setPressing(to < 1);
    pressed.set(mayMove ? withTiming(to, { duration: 220, easing: curves.ui }) : to);
  };

  const label = [
    t('desk.startLabel', { minutes }),
    fuseLeft === null ? null : t('desk.fuseLeft', { time: clockText(fuseLeftMs) }),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={stacked ? styles.wrapStacked : styles.wrap}>
      {choosing ? (
        <PeriodLengths
          minutes={minutes}
          onPick={(length) => {
            setChoosing(false);
            onLength(length);
          }}
        />
      ) : null}
      <Animated.View
        style={[
          styles.button,
          shapes.red,
          pressure === 4 ? { boxShadow: `${shapesShadow}, 0 0 0 7px rgba(226,69,62,0.16)` } : null,
          moving,
        ]}
      >
        <Pressable
          testID="desk-start"
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityActions={[{ name: 'longpress', label: t('desk.periodLength') }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'longpress') setChoosing(true);
          }}
          disabled={disabled}
          delayLongPress={430}
          onLongPress={() => {
            press(1);
            setChoosing(true);
          }}
          onPressIn={() => press(0.965)}
          onPressOut={() => press(1)}
          onPress={() => {
            setChoosing(false);
            onStart();
          }}
          style={styles.press}
        >
          <StartRipple ringing={ringing} mayMove={mayMove} />
          <StartDrum
            left={left}
            hasFuse={fuseLeft !== null}
            hot={pressure >= 4}
            ringing={ringing}
            mayMove={mayMove}
          />
          <Text
            allowFontScaling={sizing.allowFontScaling}
            maxFontSizeMultiplier={BUTTON_MAX_SCALE}
            numberOfLines={1}
            style={[buttonText.red, styles.label, { fontSize: cappedSize(sizing, 17) }]}
          >
            {t('desk.start')}
          </Text>
          <Text
            allowFontScaling={sizing.allowFontScaling}
            maxFontSizeMultiplier={BUTTON_MAX_SCALE}
            numberOfLines={1}
            style={[
              buttonText.red,
              styles.label,
              styles.minutes,
              { fontSize: cappedSize(sizing, 17) },
            ]}
          >
            {t('desk.startMinutes', { minutes })}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const shapesShadow = 'inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(201,36,30,0.28)';

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  wrapStacked: { alignSelf: 'stretch' },
  label: { flexShrink: 1 },
  button: { height: HEIGHT, borderRadius: HEIGHT / 2 },
  press: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: HEIGHT / 2,
  },
  minutes: { fontWeight: '500', opacity: 0.85, fontVariant: ['tabular-nums'] },
});
