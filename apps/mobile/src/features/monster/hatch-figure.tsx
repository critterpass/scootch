import { useEffect, useRef, useState } from 'react';
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

import { Monster, type MonsterProps } from '../../art/Monster';
import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

const FIGURE_SIZE = 150;
const FIGURE_SIZE_LARGE_TEXT = 96;
/** How long the egg wobbles before a monster that is already here breaks out of it. */
const EGG_MS = 1100;

// The monsters whose hatch has been shown since the app was opened: each hatches once.
const hatched = new Set<string>();

export interface HatchFigureProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: Attitude;
  /** `null` while the monster is still on its way: its place wobbles, as an egg does. */
  readonly monster: MonsterRow | null;
  /** An extra scale on the stored size, for a morning when it is drawn a size down. */
  readonly sizeFactor?: number;
  /** How the monster feels: nervous once its task has been shrunk. */
  readonly monsterMood?: MonsterProps['mood'];
  /**
   * This is the monster's hatch: it is met as an egg that wobbles and breaks, once, whether its
   * name arrived a moment ago or before this screen was drawn. Elsewhere it simply stands there.
   */
  readonly hatches?: boolean;
  /** The moment the monster breaks out, for its sound. */
  readonly onHatch?: () => void;
  /** Scootch's size and the monster's, where a board draws them other than side by side at 150. */
  readonly scootchSize?: number;
  readonly monsterSize?: number;
  /** How far the monster tucks in behind Scootch. */
  readonly overlap?: number;
  /** A tap on Scootch, and a tap on the monster. Each answers with its own small reaction. */
  readonly onSqueak?: () => void;
  readonly onGrumble?: () => void;
}

/** Scootch and the task's monster, side by side. The monster is drawn from its stored spec. */
export function HatchFigure({
  mood,
  attitude,
  monster,
  sizeFactor = 1,
  monsterMood = 'idle',
  hatches = false,
  scootchSize = FIGURE_SIZE,
  monsterSize = FIGURE_SIZE,
  overlap = 0,
  onHatch,
  onSqueak,
  onGrumble,
}: HatchFigureProps) {
  const { palette, largeText, reducedMotion } = useScreenStyle();
  const character = useCharacterMotion();
  const t = useT();
  // At the large text sizes both are small, so the words keep the screen.
  const shrink = largeText ? FIGURE_SIZE_LARGE_TEXT / Math.max(scootchSize, monsterSize) : 1;
  const scootch = Math.round(scootchSize * shrink);
  const size = Math.round(monsterSize * shrink);
  const tuck = { marginLeft: -Math.round(overlap * shrink) };
  const seed = monster?.spec.seed ?? null;
  // A monster met for the first time on its hatch starts as its egg, unless nothing may move.
  const [inEgg, setInEgg] = useState(
    () => hatches && seed !== null && !hatched.has(seed) && !reducedMotion,
  );
  const waiting = monster === null || inEgg;
  // A monster that takes the egg's place pops out of it; one that was simply there does not.
  const fromEgg = useRef(waiting);
  if (waiting) fromEgg.current = true;
  const hatchNow = useRef(onHatch);
  hatchNow.current = onHatch;

  useEffect(() => {
    if (!hatches || seed === null || hatched.has(seed)) {
      // Nothing is left to hatch (a shrink took over, or it is out already): no egg stays behind.
      if (inEgg) setInEgg(false);
      return undefined;
    }
    const out = () => {
      hatched.add(seed);
      setInEgg(false);
      hatchNow.current?.();
    };
    // It arrived while its egg was already wobbling, or nothing may move: it is out at once.
    if (!inEgg) {
      out();
      return undefined;
    }
    const timer = setTimeout(out, EGG_MS);
    return () => clearTimeout(timer);
  }, [hatches, seed, inEgg]);

  // Seconds into one wobble of the egg.
  const wobbling = useSharedValue(0);
  useEffect(() => {
    if (!waiting || reducedMotion) return undefined;
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
        size={scootch}
        squashOnChange
        {...(onSqueak ? { onPress: onSqueak } : {})}
        {...character}
      />
      {monster && !inEgg ? (
        <View accessible accessibilityRole="image" accessibilityLabel={monster.name} style={tuck}>
          <Monster
            spec={monster.spec}
            sizeFactor={sizeFactor}
            mood={monsterMood}
            squashOnChange
            hatching={fromEgg.current}
            {...(onGrumble ? { onPress: onGrumble } : {})}
            {...character}
            size={size}
            testID="hatch-monster"
          />
        </View>
      ) : (
        <Animated.View
          accessible
          accessibilityRole="image"
          accessibilityLabel={monster?.name ?? t('hatch.waiting')}
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
