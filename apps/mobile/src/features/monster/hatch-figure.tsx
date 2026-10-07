import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EGG_BURST_SECONDS, EGG_SHAKE_SECONDS } from '@scootch/art';
import type { Attitude, MonsterRow } from '@scootch/domain';

import { HatchEgg } from '../../art/hatch-egg';
import { Monster, type MonsterProps } from '../../art/Monster';
import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

const FIGURE_SIZE = 150;
const FIGURE_SIZE_LARGE_TEXT = 96;
/** The ring left where a shrunk monster used to reach, as shares of its space on the board. */
const RING = { side: 30 / 180, top: 40 / 180, bottom: 12 / 180, radius: 55 / 180 } as const;
/** From the monster being here to its breaking out: the egg's one hard shake. */
const SHAKE_MS = EGG_SHAKE_SECONDS * 1000;
/** The shell's pieces go on flying this long over the monster that has popped out. */
const BURST_MS = EGG_BURST_SECONDS * 1000;

// The monsters whose hatch has been shown since the app was opened: each hatches once.
const hatched = new Set<string>();

export interface HatchFigureProps {
  readonly mood: ScootchProps['mood'];
  readonly attitude: Attitude;
  /** `null` while the monster is still on its way: its egg rocks and hops in its place. */
  readonly monster: MonsterRow | null;
  /** An extra scale on the stored size, for a morning when it is drawn a size down. */
  readonly sizeFactor?: number;
  /** How the monster feels: nervous once its task has been shrunk. */
  readonly monsterMood?: MonsterProps['mood'];
  /**
   * This is the monster's hatch: it is met as an egg that shakes and bursts, once, whether its
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
  /** The monster has been made smaller: a faint ring stays where it used to reach. */
  readonly outgrown?: boolean;
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
  outgrown = false,
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
  // The shell's pieces are still in the air for a moment after the monster is out.
  const [bursting, setBursting] = useState(false);
  useEffect(() => {
    if (!bursting) return undefined;
    const timer = setTimeout(() => setBursting(false), BURST_MS);
    return () => clearTimeout(timer);
  }, [bursting]);

  useEffect(() => {
    if (!hatches || seed === null || hatched.has(seed)) {
      // Nothing is left to hatch (a shrink took over, or it is out already): no egg stays behind.
      if (inEgg) setInEgg(false);
      return undefined;
    }
    const out = () => {
      hatched.add(seed);
      setInEgg(false);
      setBursting(!reducedMotion);
      hatchNow.current?.();
    };
    if (!inEgg) {
      // It arrived while its egg was already waiting: the egg gives its last shake first. Where
      // nothing may move it is out at once.
      if (fromEgg.current && !reducedMotion) setInEgg(true);
      else out();
      return undefined;
    }
    const timer = setTimeout(out, SHAKE_MS);
    return () => clearTimeout(timer);
  }, [hatches, seed, inEgg, reducedMotion]);

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
      {/* One box for the egg and the monster, so nothing beside them moves as it hatches. */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={monster?.name ?? t('hatch.waiting')}
        style={[tuck, { width: size, height: size }]}
      >
        {monster && !inEgg ? (
          <>
            {outgrown ? (
              <View
                pointerEvents="none"
                style={[
                  styles.ring,
                  {
                    left: size * RING.side,
                    right: size * RING.side,
                    top: size * RING.top,
                    bottom: size * RING.bottom,
                    borderRadius: size * RING.radius,
                    borderColor: `${palette.ink}2E`,
                  },
                ]}
              />
            ) : null}
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
          </>
        ) : null}
        {waiting || bursting ? (
          <View testID="hatch-egg" pointerEvents="none" style={StyleSheet.absoluteFill}>
            <HatchEgg
              size={size}
              phase={monster === null ? 'waiting' : inEgg ? 'cracking' : 'burst'}
              still={reducedMotion}
            />
          </View>
        ) : null}
      </View>
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
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
});
