import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PERIOD_LENGTHS } from '../../state/board-core';
import { GlassSurface } from '../../ui/glass-surface';
import { useMayMove } from '../../ui/motion/use-feel';

import { curves, ink } from './class-style';

/**
 * Held, Start offers the period's length: a glass row of chips above it, the current one dark. It
 * springs up out of Start; under Reduce Motion it is simply there.
 */
export function PeriodLengths({
  minutes,
  onPick,
}: {
  readonly minutes: number;
  readonly onPick: (minutes: number) => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const mayMove = useMayMove();
  const shown = useSharedValue(mayMove ? 0 : 1);
  useEffect(() => {
    if (mayMove) shown.set(withTiming(1, { duration: 340, easing: curves.character }));
  }, [mayMove, shown]);
  const pop = useAnimatedStyle(() => {
    const v = shown.get();
    return {
      opacity: Math.min(1, v),
      transform: [{ translateY: 10 * (1 - v) }, { scale: 0.86 + 0.14 * v }],
    };
  });

  return (
    <Animated.View style={[styles.pop, pop]}>
      <GlassSurface style={styles.lengths}>
        <Animated.View
          style={styles.row}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('desk.periodLength')}
        >
          {PERIOD_LENGTHS.map((length) => (
            <Pressable
              key={length}
              testID={`desk-length-${length}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: length === minutes }}
              accessibilityLabel={t('desk.startMinutes', { minutes: length })}
              onPress={() => onPick(length)}
            >
              {({ pressed }) => (
                <Animated.View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: length === minutes ? ink.text : ink.soft,
                      transform: [{ scale: pressed && mayMove ? 0.94 : 1 }],
                    },
                  ]}
                >
                  <Text
                    allowFontScaling={sizing.allowFontScaling}
                    style={[styles.chipText, { color: length === minutes ? ink.white : ink.text }]}
                  >
                    {length}
                  </Text>
                </Animated.View>
              )}
            </Pressable>
          ))}
        </Animated.View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pop: {
    position: 'absolute',
    right: -4,
    bottom: 66,
    zIndex: 2,
    transformOrigin: '72% 110%',
  },
  lengths: { padding: 5, borderRadius: 25 },
  row: { flexDirection: 'row', gap: 4 },
  chip: {
    minWidth: 46,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
