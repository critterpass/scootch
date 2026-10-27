import * as Haptics from 'expo-haptics';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { TouchFeedback } from './may-move';
import { PRESS, SPRING_CURVE } from './motion-tokens';
import { useFeel } from './use-feel';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedGesturePressable = Animated.createAnimatedComponent(GesturePressable);
// Whether anything moves is decided once, by `useFeel`; the animations do not ask the system again.
const ALWAYS = ReduceMotion.Never;

export interface PressSpringProps extends Omit<PressableProps, 'style'> {
  readonly style?: StyleProp<ViewStyle>;
  /**
   * What a finished tap feels like: `primary` is a light tap for a screen's action, `choice` the
   * selection tick for one option among several. Left out, a press is seen and not felt.
   */
  readonly feedback?: TouchFeedback;
  /** The opacity at rest, for a control that is drawn faint (a disabled one). */
  readonly restOpacity?: number;
  /**
   * `glass` for a control on the system's interactive glass, which answers the finger by itself:
   * the press then stays still here, and only the tap is felt. Left out, the spring answers.
   */
  readonly answeredBy?: 'spring' | 'glass';
  /**
   * True for a control beside a text field that has the keyboard. A tap in a focused field can
   * leave React Native's touch system holding a touch that has ended, and the next tap then never
   * reaches a control beside it; this one is taken by a native gesture instead.
   */
  readonly byGesture?: boolean;
  /** How far it sinks: 0.965 for a button, 0.98 for a full-width row, 0.94 for a small chip. */
  readonly pressScale?: number;
}

/** The tap a control answers with, when the person has haptics on. */
export function touchHaptic(feedback: TouchFeedback): void {
  if (feedback === 'primary') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  } else if (feedback === 'choice') {
    void Haptics.selectionAsync().catch(() => undefined);
  }
}

/**
 * The app's one pressable: every button, row, chip and pill. Pressed, it sinks to 0.965 over
 * 200 ms on the interface curve, and let go it comes back the same way with no overshoot, as the
 * App board's `.press`. The finger can reverse it at any point. The whole press runs on the UI
 * thread. Where nothing may move it dips in opacity instead. A finished tap is felt according to
 * `feedback`, when haptics are on.
 */
export function PressSpring({
  style,
  feedback = 'none',
  restOpacity = 1,
  answeredBy = 'spring',
  byGesture = false,
  pressScale = PRESS.scale,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressSpringProps) {
  const { mayMove, haptics } = useFeel();
  // 0 at rest, 1 fully down.
  const down = useSharedValue(0);

  const pressed = useAnimatedStyle(() => {
    if (answeredBy === 'glass') return { opacity: restOpacity, transform: [{ scale: 1 }] };
    if (!mayMove) {
      return {
        opacity: restOpacity * (1 - (1 - PRESS.calmOpacity) * down.value),
        transform: [{ scale: 1 }],
      };
    }
    return { opacity: restOpacity, transform: [{ scale: 1 - (1 - pressScale) * down.value }] };
  }, [mayMove, restOpacity, answeredBy, pressScale]);

  const to = (value: 0 | 1) => {
    down.value = withTiming(value, {
      duration: PRESS.ms,
      easing: SPRING_CURVE,
      reduceMotion: ALWAYS,
    });
  };
  const pressIn = (event: GestureResponderEvent) => {
    to(1);
    onPressIn?.(event);
  };
  const pressOut = (event: GestureResponderEvent) => {
    to(0);
    onPressOut?.(event);
  };
  const press = (event: GestureResponderEvent) => {
    if (haptics) touchHaptic(feedback);
    onPress?.(event);
  };

  // The two take the same props; the gesture one's events carry the same `nativeEvent` fields.
  const Press = byGesture
    ? (AnimatedGesturePressable as unknown as typeof AnimatedPressable)
    : AnimatedPressable;
  return (
    <Press
      {...rest}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={press}
      style={[style, pressed]}
    />
  );
}
