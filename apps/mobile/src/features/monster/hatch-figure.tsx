import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EGG_WOBBLE_SECONDS, eggWobble } from '@scootch/art';
import type { Attitude, MonsterRow } from '@scootch/domain';

import { Monster } from '../../art/Monster';
import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

const FIGURE_SIZE = 150;
const FIGURE_SIZE_LARGE_TEXT = 96;

export interface HatchFigureProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: Attitude;
  /** `null` while the monster is still on its way: its place wobbles, as an egg does. */
  readonly monster: MonsterRow | null;
  /** An extra scale on the stored size, for a morning when it is drawn a size down. */
  readonly sizeFactor?: number;
}

/** Scootch and the task's monster, side by side. The monster is drawn from its stored spec. */
export function HatchFigure({ mood, attitude, monster, sizeFactor = 1 }: HatchFigureProps) {
  const { palette, largeText, reducedMotion, captured } = useScreenStyle();
  const t = useT();
  const size = largeText ? FIGURE_SIZE_LARGE_TEXT : FIGURE_SIZE;
  // Seconds into one wobble of the egg.
  const wobbling = useSharedValue(0);
  const waiting = monster === null;
  // A monster that arrives where the egg was pops in; one that was already there does not.
  const waited = useRef(waiting);

  useEffect(() => {
    if (!waiting || reducedMotion) return;
    wobbling.value = withRepeat(
      withTiming(EGG_WOBBLE_SECONDS, {
        duration: EGG_WOBBLE_SECONDS * 1000,
        easing: Easing.linear,
      }),
      -1,
    );
    return () => {
      cancelAnimation(wobbling);
      wobbling.value = 0;
    };
  }, [reducedMotion, wobbling, waiting]);
  const wobble = useAnimatedStyle(() => ({
    transform: [{ rotate: `${eggWobble(wobbling.value)}deg` }],
  }));

  return (
    <View style={styles.row}>
      <Scootch
        mood={mood}
        attitude={attitude}
        size={size}
        {...(captured ? { reducedMotion: true } : {})}
      />
      {monster ? (
        <View accessible accessibilityRole="image" accessibilityLabel={monster.name}>
          <Monster
            spec={monster.spec}
            sizeFactor={sizeFactor}
            idle
            hatching={waited.current}
            reducedMotion={reducedMotion}
            size={size}
            testID="hatch-monster"
          />
        </View>
      ) : (
        <Animated.View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('hatch.waiting')}
          testID="hatch-egg"
          style={[
            styles.egg,
            { width: size * 0.5, height: size * 0.62, backgroundColor: palette.risoBlob },
            wobble,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  egg: {
    borderRadius: 999,
    alignSelf: 'center',
  },
});
