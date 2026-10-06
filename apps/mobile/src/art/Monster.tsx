import { Group } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  buildMonster,
  GROUND_Y,
  HATCH_POP_SECONDS,
  hatchPop,
  MONSTER_BODIES,
  monsterIdle,
  SHRINK_REACTION_SECONDS,
  SHRINK_SECONDS,
  shrinkFactor,
  shrinkStep,
  VIEW_SIZE,
} from '@scootch/art';

import { useForcedVariant } from '../screens/registry/support/forced-variant';

import type { MotionCare } from './motion-plan';
import { CharacterCanvas, CommandLayer } from './skia-commands';
import { useMotionTicks } from './use-motion-ticks';

export interface MonsterProps {
  readonly spec: Parameters<typeof buildMonster>[0];
  /** An extra scale on top of the spec's own size, for a shrink step that is not stored yet. */
  readonly sizeFactor?: number;
  /** A small bob and sway while it stands there. Off unless asked for: lists stay still. */
  readonly idle?: boolean;
  /** Pops in when it first appears, as a monster does when it hatches. */
  readonly hatching?: boolean;
  /** Leave unset to follow the system's Reduce Motion setting. */
  readonly reducedMotion?: boolean;
  /** On a serious task or a crisis day a monster does not move. */
  readonly care?: MotionCare;
  /** Width and height in points. */
  readonly size?: number;
  readonly testID?: string;
}

const FEET = { x: VIEW_SIZE / 2, y: GROUND_Y };
const ENTRANCE_SECONDS = HATCH_POP_SECONDS;
const SHRINK_TOTAL_SECONDS = SHRINK_SECONDS + SHRINK_REACTION_SECONDS;
// Whether anything moves is decided here, from the prop and the system setting, so the
// animations themselves never consult the system setting a second time.
const ALWAYS = ReduceMotion.Never;
const linear = (seconds: number) =>
  ({ duration: seconds * 1000, easing: Easing.linear, reduceMotion: ALWAYS }) as const;

type Transform = [
  { translateY: number },
  { rotate: number },
  { scaleX: number },
  { scaleY: number },
];

/**
 * One monster, drawn with Skia. Its commands are built once per spec and size factor; everything
 * that moves is a transform about its feet: the idle's bob and sway, the pop when it hatches and
 * the shrink when its task is made smaller. With reduced motion the hatch is a crossfade and
 * nothing else moves.
 */
export function Monster({
  spec,
  sizeFactor = 1,
  idle = false,
  hatching = false,
  reducedMotion,
  care = 'none',
  size = 200,
  testID,
}: MonsterProps) {
  const systemReducedMotion = useReducedMotion();
  // A registry capture is always the still, whatever the screen passes.
  const captured = useForcedVariant() !== undefined;
  const still = captured || (reducedMotion ?? systemReducedMotion) || care !== 'none';
  const commands = useMemo(() => buildMonster(spec, sizeFactor), [spec, sizeFactor]);
  const hover = MONSTER_BODIES[spec.bodyType].hover === true;

  const bob = useSharedValue(0);
  const sway = useSharedValue(0);
  useMotionTicks(idle && !still, (seconds) => {
    const now = monsterIdle(seconds, spec.seed, hover);
    bob.value = now.bob;
    sway.value = now.sway;
  });
  useEffect(() => {
    if (idle && !still) return;
    bob.value = 0;
    sway.value = 0;
  }, [idle, still, bob, sway]);

  // Seconds into the entrance; it starts settled unless the monster is hatching right now. A
  // capture never shows an entrance: it would be caught halfway.
  const entering = hatching && !captured;
  const entered = useSharedValue(entering ? 0 : ENTRANCE_SECONDS);
  useEffect(() => {
    if (!entering) return;
    entered.value = withTiming(ENTRANCE_SECONDS, linear(ENTRANCE_SECONDS));
    return () => cancelAnimation(entered);
  }, [entering, entered]);

  // A shrink: the same monster drawn smaller than a moment ago grows down from its old size.
  const scale = spec.size * sizeFactor;
  const drawn = useRef({ seed: spec.seed, scale });
  const shrunkFrom = useSharedValue(1);
  const shrinking = useSharedValue(SHRINK_TOTAL_SECONDS);
  useEffect(() => {
    const before = drawn.current;
    drawn.current = { seed: spec.seed, scale };
    if (still || before.seed !== spec.seed || scale >= before.scale) return;
    shrunkFrom.value = before.scale / scale;
    shrinking.value = 0;
    shrinking.value = withTiming(SHRINK_TOTAL_SECONDS, linear(SHRINK_TOTAL_SECONDS));
    return () => cancelAnimation(shrinking);
  }, [spec.seed, scale, still, shrunkFrom, shrinking]);

  const transform = useDerivedValue<Transform>(() => {
    // With reduced motion the entrance is the fade alone.
    const pop = still ? 1 : hatchPop(entered.value).scale;
    const step = shrinkStep(shrinking.value);
    const shrink = shrinkFactor(shrunkFrom.value, 1, step);
    return [
      { translateY: bob.value },
      { rotate: sway.value },
      { scaleX: pop * shrink * step.squashX },
      { scaleY: pop * shrink * step.squashY },
    ];
  });
  const opacity = useDerivedValue<number>(() => hatchPop(entered.value).opacity);

  return (
    <CharacterCanvas size={size} {...(testID ? { testID } : {})}>
      <Group transform={transform} origin={FEET}>
        <CommandLayer commands={commands} opacity={opacity} />
      </Group>
    </CharacterCanvas>
  );
}
