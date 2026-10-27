import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The picked segment's white comes and goes over the board's 240 ms. */
const PICK_MS = 240;

interface SegmentProps {
  readonly label: string;
  readonly spoken: string;
  readonly on: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}

function Segment({ label, spoken, on, onPress, testID }: SegmentProps) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const picked = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    picked.value = reducedMotion
      ? on
        ? 1
        : 0
      : withTiming(on ? 1 : 0, { duration: PICK_MS, reduceMotion: ReduceMotion.Never });
  }, [on, picked, reducedMotion]);
  const thumb = useAnimatedStyle(() => ({ opacity: picked.value }));
  return (
    <PressSpring
      accessibilityRole="radio"
      accessibilityLabel={spoken}
      accessibilityState={{ selected: on, checked: on }}
      onPress={onPress}
      feedback="choice"
      // A segment does not sink: the white moving to it is the answer, as the board draws it.
      pressScale={1}
      testID={testID}
      style={styles.segment}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { backgroundColor: palette.surface }, thumb]}
      />
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.segmentText, { color: palette.ink, fontSize: size(14) }]}
      >
        {label}
      </Text>
    </PressSpring>
  );
}

/** A choice of a few, one at a time: the system's segmented look. */
export function Segments<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  readonly options: readonly {
    readonly value: T;
    readonly label: string;
    /** What VoiceOver reads, where the label alone says too little ("10"). */
    readonly spoken?: string;
  }[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly label: string;
}) {
  const { largeText } = useScreenStyle();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segments, largeText && styles.segmentsStacked]}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          spoken={option.spoken ?? option.label}
          on={option.value === value}
          onPress={() => onChange(option.value)}
          testID={`segment-${option.value}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: 11,
    backgroundColor: 'rgba(118,118,128,0.12)',
  },
  segmentsStacked: { flexDirection: 'column' },
  segment: {
    flex: 1,
    minHeight: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9,
    boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)',
  },
  segmentText: { fontWeight: '600', textAlign: 'center' },
});
