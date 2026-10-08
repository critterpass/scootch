import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { useMayMove } from '../../../ui/motion/use-feel';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

/** The button, and the ring that stands a little way off it. */
const BUTTON = 124;
const RING_GAP = 12;
const RING_WIDTH = 5;
const SIZE = BUTTON + RING_GAP * 2;
const CENTRE = SIZE / 2;
/** The design's hold: it sinks to 0.96 and a little further as it fills, and trembles harder. */
const HELD_SCALE = 0.96;
const FILL_SCALE = 0.02;
const SHAKE_POINTS = 1.6;
/** The tremble's speed: one radian every 22 ms of holding, and a full hold is 1.7 s. */
const SHAKE_TURNS = 1700 / 22;
/** Past this much of the fill the label sits on tomato and turns white. */
const LABEL_TURNS_AT = 0.55;

export interface HoldButtonProps {
  /** 0 to 1, linear in time. */
  readonly progress: SharedValue<number>;
  readonly label: string;
  readonly spokenLabel: string;
  readonly hint: string;
  readonly inks: SessionInks;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
  /** VoiceOver's double-tap, which stands in for the hold. */
  readonly onActivate: () => void;
}

/**
 * Hold to finish: a round button inside a ring. Holding fills the ring clockwise from the top and
 * a tomato disc grows from the middle; letting go drains both.
 */
export function HoldButton({
  progress,
  label,
  spokenLabel,
  hint,
  inks,
  onPressIn,
  onPressOut,
  onActivate,
}: HoldButtonProps) {
  const ring = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(CENTRE, CENTRE, CENTRE - RING_WIDTH / 2);
    return path;
  }, []);
  const mayMove = useMayMove();
  // 1 while a finger is on the button. The press itself never waits for React.
  const held = useSharedValue(0);
  const fill = useDerivedValue(() => {
    const p = progress.value;
    return (BUTTON / 2) * p * p * (3 - 2 * p);
  });
  // The fill is linear in time while held, so the tremble can be read from it: no clock of its own.
  const pressed = useAnimatedStyle(() => {
    const p = progress.value;
    const eased = p * p * (3 - 2 * p);
    if (!mayMove || held.value === 0) return { transform: [{ translateX: 0 }, { scale: 1 }] };
    return {
      transform: [
        { translateX: Math.sin(p * SHAKE_TURNS) * eased * SHAKE_POINTS },
        { scale: HELD_SCALE - eased * FILL_SCALE },
      ],
    };
  }, [mayMove]);
  const onTomato = useAnimatedStyle(() => {
    const p = progress.value;
    return { opacity: p * p * (3 - 2 * p) > LABEL_TURNS_AT ? 1 : 0 };
  });
  const onSurface = useAnimatedStyle(() => {
    const p = progress.value;
    return { opacity: p * p * (3 - 2 * p) > LABEL_TURNS_AT ? 0 : 1 };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      accessibilityHint={hint}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onActivate}
      testID="session-hold"
      onPressIn={() => {
        held.value = 1;
        onPressIn();
      }}
      onPressOut={() => {
        held.value = 0;
        onPressOut();
      }}
      style={styles.button}
    >
      <Animated.View style={pressed}>
        <Canvas style={styles.canvas}>
          <Path path={ring} style="stroke" strokeWidth={RING_WIDTH} color={inks.track} />
          <Group origin={{ x: CENTRE, y: CENTRE }} transform={[{ rotate: -Math.PI / 2 }]}>
            <Path
              path={ring}
              style="stroke"
              strokeWidth={RING_WIDTH}
              strokeCap="round"
              color={inks.tomato}
              start={0}
              end={progress}
            />
          </Group>
          <Circle cx={CENTRE} cy={CENTRE} r={BUTTON / 2} color={inks.surface} />
          <Circle cx={CENTRE} cy={CENTRE} r={fill} color={inks.tomato} />
        </Canvas>
        <Animated.View pointerEvents="none" style={[styles.label, onSurface]}>
          <SessionText face="action" color={inks.ink}>
            {label}
          </SessionText>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.label, onTomato]}>
          <SessionText face="action" color={inks.onTomato}>
            {label}
          </SessionText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  canvas: {
    width: SIZE,
    height: SIZE,
  },
  label: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
