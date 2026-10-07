import * as Haptics from 'expo-haptics';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { TouchFeedback } from './may-move';
import { EASE_OUT, PRESS, SPRING_CURVE } from './motion-tokens';
import { useFeel } from './use-feel';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
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
 * The app's one pressable: every button, row, chip and pill. Pressed, it sinks to 0.95; let go, it
 * springs back through 1.02, as the design's boards script every `data-press`. The whole press runs
 * on the UI thread. Where nothing may move it dips in opacity instead. A finished tap is felt
 * according to `feedback`, when haptics are on.
 */
export function PressSpring({
  style,
  feedback = 'none',
  restOpacity = 1,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressSpringProps) {
  const { mayMove, haptics } = useFeel();
  // 0 at rest, 1 fully down.
  const down = useSharedValue(0);
  // 0 as the finger lifts, 1 back at rest; `from` is how far down the press was at that moment.
  const up = useSharedValue(1);
  const from = useSharedValue(0);

  const pressed = useAnimatedStyle(() => {
    const sunk = 1 - (1 - PRESS.downScale) * from.value;
    const scale =
      up.value < 1
        ? interpolate(up.value, [0, PRESS.overshootAt, 1], [sunk, PRESS.overshootScale, 1])
        : 1 - (1 - PRESS.downScale) * down.value;
    if (!mayMove) {
      return {
        opacity: restOpacity * (1 - (1 - PRESS.calmOpacity) * down.value),
        transform: [{ scale: 1 }],
      };
    }
    return { opacity: restOpacity, transform: [{ scale }] };
  }, [mayMove, restOpacity]);

  const pressIn = (event: GestureResponderEvent) => {
    up.value = 1;
    down.value = withTiming(1, { duration: PRESS.downMs, easing: EASE_OUT, reduceMotion: ALWAYS });
    onPressIn?.(event);
  };
  const pressOut = (event: GestureResponderEvent) => {
    from.value = down.value;
    down.value = 0;
    up.value = 0;
    up.value = withTiming(1, {
      duration: mayMove ? PRESS.upMs : PRESS.downMs,
      easing: SPRING_CURVE,
      reduceMotion: ALWAYS,
    });
    onPressOut?.(event);
  };
  const press = (event: GestureResponderEvent) => {
    if (haptics) touchHaptic(feedback);
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={press}
      style={[style, pressed]}
    />
  );
}
