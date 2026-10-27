import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PERIOD_LENGTHS } from '../../state/board-core';
import { GlassSurface } from '../../ui/glass-surface';
import { PressSpring } from '../../ui/motion/press-spring';
import { useMayMove } from '../../ui/motion/use-feel';

import { useEased } from './class-motion';
import { curves, ink } from './class-style';

/** One length: a press, a selection tick, and its colours eased over 200 ms as the board's chips. */
function LengthChip({
  length,
  on,
  mayMove,
  onPick,
}: {
  readonly length: number;
  readonly on: boolean;
  readonly mayMove: boolean;
  readonly onPick: () => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const lit = useEased(on, 200, mayMove);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(lit.get(), [0, 1], [ink.soft, ink.text]),
  }));
  const figure = useAnimatedStyle(() => ({
    color: interpolateColor(lit.get(), [0, 1], [ink.text, ink.white]),
  }));
  return (
    <PressSpring
      testID={`desk-length-${length}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={t('desk.startMinutes', { minutes: length })}
      feedback="choice"
      pressScale={0.94}
      onPress={onPick}
    >
      <Animated.View style={[styles.chip, fill]}>
        <Animated.Text allowFontScaling={sizing.allowFontScaling} style={[styles.chipText, figure]}>
          {length}
        </Animated.Text>
      </Animated.View>
    </PressSpring>
  );
}

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
            <LengthChip
              key={length}
              length={length}
              on={length === minutes}
              mayMove={mayMove}
              onPick={() => onPick(length)}
            />
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
