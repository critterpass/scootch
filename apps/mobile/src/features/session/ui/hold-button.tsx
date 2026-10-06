import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

/** The button, and the ring that stands a little way off it. */
const BUTTON = 124;
const RING_GAP = 12;
const RING_WIDTH = 5;
const SIZE = BUTTON + RING_GAP * 2;
const CENTRE = SIZE / 2;

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
  const fill = useDerivedValue(() => {
    const p = progress.value;
    return (BUTTON / 2) * p * p * (3 - 2 * p);
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      accessibilityHint={hint}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={onActivate}
      testID="session-hold"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [styles.button, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
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
      <View pointerEvents="none" style={styles.label}>
        <SessionText face="action" color={inks.ink}>
          {label}
        </SessionText>
      </View>
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
