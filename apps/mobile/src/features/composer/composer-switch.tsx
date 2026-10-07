import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { CONTROL_HEIGHT } from '../../ui/buttons';
import { KeyboardIcon, WaveIcon } from '../../ui/icons';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../ui/use-screen-style';

import { DOCK_PADDING } from './composer-fold';
import { useFollow } from './use-follow';

export interface ComposerSwitchProps {
  /** The dock is a text field: the button shows the wave, to go back to talking. */
  readonly typing: boolean;
  /** A recording is on: the capsule sweeps over the button, which fades under it. */
  readonly listening: boolean;
  readonly disabled: boolean;
  /** Drawn faint: the day has no start left, and typing is off with talking. */
  readonly off?: boolean;
  readonly label: string;
  readonly hint: string;
  readonly onPress: () => void;
}

/**
 * The round button at the dock's left: the keyboard, or the wave once the dock is a field. The two
 * icons crossfade, each growing from 0.6; a finger on it sinks it to 0.92.
 */
export function ComposerSwitch({
  typing,
  listening,
  disabled,
  off = false,
  label,
  hint,
  onPress,
}: ComposerSwitchProps) {
  const { palette, reducedMotion } = useScreenStyle();
  const [pressed, setPressed] = useState(false);
  const fade = useFollow(listening ? 0 : off ? 0.4 : 1, reducedMotion ? CROSSFADE_MS : 300);
  const sink = useFollow(pressed && !reducedMotion ? 1 : 0, 200);
  const mix = useFollow(typing ? 1 : 0, reducedMotion ? CROSSFADE_MS : 250);
  const pose = useFollow(typing ? 1 : 0, reducedMotion ? 0 : 450, SPRING_CURVE);

  const button = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: 1 - 0.08 * sink.value }],
  }));
  const keyboard = useAnimatedStyle(() => ({
    opacity: 1 - mix.value,
    transform: [{ scale: 1 - 0.4 * pose.value }],
  }));
  const wave = useAnimatedStyle(() => ({
    opacity: mix.value,
    transform: [{ scale: 0.6 + 0.4 * pose.value }],
  }));

  return (
    <Animated.View style={[styles.slot, button]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
        testID="composer-switch"
        style={[styles.round, { backgroundColor: `${palette.ink}0F` }]}
      >
        <Animated.View style={[styles.icon, keyboard]}>
          <KeyboardIcon color={palette.ink} />
        </Animated.View>
        <Animated.View style={[styles.icon, wave]}>
          <WaveIcon color={palette.ink} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginRight: DOCK_PADDING,
  },
  round: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    overflow: 'hidden',
  },
  icon: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
