import { Canvas, Circle, Group, Path } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { clockText } from '../session/session-model';

import { BUTTON_MAX_SCALE, buttonText, cappedSize, curves, ink, shapes } from './class-style';
import type { StartPulse } from './desk-model';
import { PeriodLengths } from './period-lengths';

const HEIGHT = 56;
const INSET = 1.5;

/** The fuse's track: around the button from the top-left of its straight edge, clockwise. */
function fusePath(width: number): string {
  const w = width - INSET * 2;
  const h = HEIGHT - INSET * 2;
  const r = h / 2;
  const x = INSET;
  const y = INSET;
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

/** Where the burning end is, `left` (1 to 0) of the way round. */
function sparkAt(width: number, left: number): { x: number; y: number } {
  'worklet';
  const w = width - INSET * 2;
  const h = HEIGHT - INSET * 2;
  const r = h / 2;
  const a = w - 2 * r;
  const arc = Math.PI * r;
  const d = left * (2 * a + 2 * arc);
  if (d <= a) return { x: INSET + r + d, y: INSET };
  if (d <= a + arc) {
    const t = (d - a) / r;
    return { x: INSET + w - r + r * Math.sin(t), y: INSET + r - r * Math.cos(t) };
  }
  if (d <= 2 * a + arc) return { x: INSET + w - r - (d - a - arc), y: INSET + h };
  const t = (d - 2 * a - arc) / r;
  return { x: INSET + r - r * Math.sin(t), y: INSET + r + r * Math.cos(t) };
}

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
  /** Pressure 4 and up: the pie burns yellow and a soft ring stands around Start. */
  readonly hot: boolean;
  readonly onStart: () => void;
  readonly onLength: (minutes: number) => void;
  readonly disabled?: boolean;
  /** At the largest text sizes the desk's buttons stack: Start takes the full width. */
  readonly stacked?: boolean;
}

/**
 * Start, with the fuse burning around its edge: a red track that shortens over two minutes with a
 * spark at its end, and the small pie in the drum icon emptying with it. Held, it offers the
 * period's length. As his pressure rises it breathes, then nudges. Nothing pulses where nothing
 * may move.
 */
export function StartButton({
  fuseLeft,
  fuseLeftMs,
  minutes,
  pulse,
  hot,
  onStart,
  onLength,
  disabled = false,
  stacked = false,
}: StartButtonProps) {
  const t = useT();
  const mayMove = useMayMove();
  const sizing = useTextSizing();
  const [width, setWidth] = useState(0);
  const [choosing, setChoosing] = useState(false);

  // The fuse is read from the store once a second; between readings it burns smoothly.
  const left = useSharedValue(fuseLeft ?? 0);
  useEffect(() => {
    const next = fuseLeft ?? 0;
    left.set(mayMove ? withTiming(next, { duration: 1000, easing: Easing.linear }) : next);
  }, [fuseLeft, mayMove, left]);
  const spark = useDerivedValue(() => sparkAt(width, left.get()));
  const sparkX = useDerivedValue(() => spark.get().x);
  const sparkY = useDerivedValue(() => spark.get().y);
  const sparkOpacity = useDerivedValue(() => (left.get() > 0.001 ? 1 : 0));

  const scale = useSharedValue(1);
  const turn = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(turn);
    scale.set(1);
    turn.set(0);
    if (!mayMove || pulse === 'none' || disabled) return;
    const { ms, nudge } = PULSE[pulse];
    if (nudge) {
      turn.set(
        withRepeat(
          withSequence(
            withTiming(0, { duration: ms * 0.76 }),
            withTiming(-2.6, { duration: ms * 0.04 }),
            withTiming(2.4, { duration: ms * 0.04 }),
            withTiming(-1.4, { duration: ms * 0.04 }),
            withTiming(0.8, { duration: ms * 0.04 }),
            withTiming(0, { duration: ms * 0.08 }),
          ),
          -1,
        ),
      );
    } else {
      scale.set(
        withRepeat(
          withSequence(
            withTiming(1.02, { duration: ms / 2, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: ms / 2, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
        ),
      );
    }
  }, [pulse, mayMove, disabled, scale, turn]);

  const pressed = useSharedValue(1);
  const moving = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() * pressed.get() }, { rotate: `${turn.get()}deg` }],
  }));
  const press = (to: number) =>
    pressed.set(mayMove ? withTiming(to, { duration: 200, easing: curves.ui }) : to);

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
          hot ? { boxShadow: `${shapesShadow}, 0 0 0 7px rgba(226,69,62,0.16)` } : null,
          moving,
        ]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
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
          {width > 0 && fuseLeft !== null ? (
            <Canvas
              style={[StyleSheet.absoluteFill, { width, height: HEIGHT }]}
              pointerEvents="none"
            >
              <Path
                path={fusePath(width)}
                style="stroke"
                strokeWidth={3}
                strokeCap="round"
                color="#FFE29A"
                start={0}
                end={left}
              />
              <Group opacity={sparkOpacity}>
                <Circle cx={sparkX} cy={sparkY} r={6} color="rgba(255,226,154,0.45)" />
                <Circle cx={sparkX} cy={sparkY} r={2.6} color={ink.white} />
              </Group>
            </Canvas>
          ) : null}
          <Canvas style={styles.drum} pointerEvents="none">
            <Circle
              cx={11}
              cy={11}
              r={9.5}
              style="stroke"
              strokeWidth={2}
              color="rgba(255,255,255,0.4)"
            />
            {fuseLeft !== null ? (
              <Path
                path="M 11 7.5 A 3.5 3.5 0 1 1 10.99 7.5"
                style="stroke"
                strokeWidth={7}
                color={hot ? '#FFE29A' : ink.white}
                start={0}
                end={left}
              />
            ) : (
              <Circle cx={11} cy={11} r={7} color={ink.white} />
            )}
          </Canvas>
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
  drum: { width: 22, height: 22 },
  minutes: { fontWeight: '500', opacity: 0.85, fontVariant: ['tabular-nums'] },
});
