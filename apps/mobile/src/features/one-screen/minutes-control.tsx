import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { PressSpring } from '../../ui/motion/press-spring';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useScreenStyle } from '../../ui/use-screen-style';

import { segmentOffset } from './one-screen-frame';

const HEIGHT = 36;
const PADDING = 2;
const LABEL_SIZE = 14;
const SLIDE_MS = 320;
/** The track, as the board fills it, and the chosen pill in each scheme. */
const TRACK = { light: 'rgba(118, 112, 104, 0.13)', dark: 'rgba(118, 112, 104, 0.26)' } as const;
const PILL = { light: '#FFFFFF', dark: '#5E5852' } as const;

export interface MinutesControlProps {
  readonly minutes: number;
  readonly options: readonly number[];
  readonly onMinutes: (minutes: number) => void;
}

/**
 * How long to go for: the board's segmented control, 36 points high, with the chosen length on a
 * white pill that slides between segments. The pill moves by transform on the UI thread. At the
 * large text sizes the lengths stack, each one its own row.
 */
export function MinutesControl({ minutes, options, onMinutes }: MinutesControlProps) {
  const { palette, allowFontScaling, size, largeText, reducedMotion } = useScreenStyle();
  const appearance = useAppearance();
  const t = useT();
  const chosenIndex = Math.max(0, options.indexOf(minutes));
  const count = options.length;

  // The track is measured once, in React: the pill's width is plain layout, and only its place
  // is animated.
  const [width, setWidth] = useState(0);
  const place = useSharedValue(chosenIndex);
  useEffect(() => {
    place.value = reducedMotion
      ? chosenIndex
      : withTiming(chosenIndex, {
          duration: SLIDE_MS,
          easing: SPRING_CURVE,
          reduceMotion: ReduceMotion.Never,
        });
  }, [chosenIndex, place, reducedMotion]);
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: segmentOffset(place.value, width, count, PADDING) }],
  }));
  const pillWidth = width > 0 && count > 0 ? (width - PADDING * 2) / count : 0;

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, largeText && styles.stacked, { backgroundColor: TRACK[appearance] }]}
    >
      {largeText || pillWidth === 0 ? null : (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: pillWidth, backgroundColor: PILL[appearance] }, pill]}
        />
      )}
      {options.map((option) => {
        const chosen = option === minutes;
        return (
          <PressSpring
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen, checked: chosen }}
            accessibilityLabel={t('taskSet.minutes', { minutes: option })}
            accessibilityHint={t('taskSet.minutes.hint')}
            onPress={() => onMinutes(option)}
            feedback="choice"
            hitSlop={{ top: 6, bottom: 6 }}
            testID={`task-set-minutes-${option}`}
            style={[
              styles.segment,
              largeText && styles.segmentStacked,
              largeText && chosen && { backgroundColor: PILL[appearance] },
            ]}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[
                styles.label,
                { color: palette.ink, fontSize: size(LABEL_SIZE) },
                chosen && styles.chosen,
              ]}
            >
              {t('taskSet.minutes', { minutes: option })}
            </Text>
          </PressSpring>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    minHeight: HEIGHT,
    borderRadius: HEIGHT / 2,
    padding: PADDING,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: HEIGHT / 2 - PADDING,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.04)',
  },
  segment: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: HEIGHT - PADDING * 2,
    borderRadius: HEIGHT / 2 - PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentStacked: {
    flexGrow: 0,
    flexBasis: 'auto',
    minHeight: 44,
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  chosen: {
    fontWeight: '600',
  },
});
