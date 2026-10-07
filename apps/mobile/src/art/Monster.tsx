import { Group } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  boilFrame,
  buildMonster,
  GROUND_Y,
  HATCH_POP_SECONDS,
  hatchPop,
  moodSquash,
  SHRINK_REACTION_SECONDS,
  SHRINK_SECONDS,
  shrinkFactor,
  shrinkStep,
  VIEW_SIZE,
  type DrawCommand,
  type MonsterLife,
} from '@scootch/art';

import { useForcedVariant } from '../screens/registry/support/forced-variant';

import { FULL_HZ, SMALL_SIZE, type MotionCare } from './motion-plan';
import { CharacterCanvas, CommandLayer } from './skia-commands';
import { useMotionTicks } from './use-motion-ticks';
import { useChangeSquash, useTapReaction } from './use-reactions';

type Mood = NonNullable<MonsterLife['mood']>;

export interface MonsterProps {
  readonly spec: Parameters<typeof buildMonster>[0];
  /** An extra scale on top of the spec's own size, for a shrink step that is not stored yet. */
  readonly sizeFactor?: number;
  /** `idle` unless told otherwise; `nervous` shakes and sweats, `caught` sleeps. */
  readonly mood?: Mood;
  /**
   * Alive while it stands there: it bobs, blinks, boils and does what its body does. On unless
   * told otherwise; `false` holds it still in its mood.
   */
  readonly idle?: boolean;
  /** Pops in when it first appears, as a monster does when it hatches. */
  readonly hatching?: boolean;
  /** Leave unset to follow the system's Reduce Motion setting. */
  readonly reducedMotion?: boolean;
  /** On a serious task or a crisis day a monster does not move. */
  readonly care?: MotionCare;
  /** Gives a squash whenever the mood changes. */
  readonly squashOnChange?: boolean;
  /**
   * Makes the monster something to tap. A tap calls this and, unless the monster is held still,
   * makes it nervous for a moment.
   */
  readonly onPress?: () => void;
  /** Width and height in points. */
  readonly size?: number;
  readonly testID?: string;
}

const FEET = { x: VIEW_SIZE / 2, y: GROUND_Y };
const ENTRANCE_SECONDS = HATCH_POP_SECONDS;
const SHRINK_TOTAL_SECONDS = SHRINK_SECONDS + SHRINK_REACTION_SECONDS;
/** A small monster, as in a grid of them, is redrawn at this rate: enough for the boil and a bob. */
const SMALL_MONSTER_HZ = 8;
// Whether anything moves is decided here, from the prop and the system setting, so the
// animations themselves never consult the system setting a second time.
const ALWAYS = ReduceMotion.Never;
const linear = (seconds: number) =>
  ({ duration: seconds * 1000, easing: Easing.linear, reduceMotion: ALWAYS }) as const;

type Transform = [{ scaleX: number }, { scaleY: number }];

/**
 * One monster, drawn with Skia. Its still is built once per spec, size factor and mood and shows
 * at once. While it is alive a clock rebuilds the drawing for the moment it shows: the bob over
 * its shadow, the blink, the boil and its body's own life. The pop when it hatches, the shrink
 * when its task is made smaller and the squash are transforms about its feet on the UI thread.
 * With reduced motion the hatch is a crossfade and nothing else moves.
 */
export function Monster({
  spec,
  sizeFactor = 1,
  mood = 'idle',
  idle = true,
  hatching = false,
  reducedMotion,
  care = 'none',
  squashOnChange = false,
  onPress,
  size = 200,
  testID,
}: MonsterProps) {
  const systemReducedMotion = useReducedMotion();
  // A registry capture is always the still, whatever the screen passes.
  const captured = useForcedVariant() !== undefined;
  const still = captured || (reducedMotion ?? systemReducedMotion) || care !== 'none';
  const tap = useTapReaction(onPress, !still);
  const shownMood: Mood = tap.reacting ? 'nervous' : mood;
  // A startled monster moves even where it otherwise stands still, as in a list.
  const alive = (idle || tap.reacting) && !still;

  const drawing = useMemo(
    () => ({
      spec,
      sizeFactor,
      mood: shownMood,
      rest: buildMonster(spec, sizeFactor, { mood: shownMood }),
    }),
    [spec, sizeFactor, shownMood],
  );
  const [moved, setMoved] = useState<{ of: typeof drawing; commands: DrawCommand[] } | null>(null);
  const clock = useRef({ now: 0, changedAt: 0 });
  // A new mood starts from its still.
  useEffect(() => {
    clock.current.changedAt = clock.current.now;
  }, [shownMood]);
  useMotionTicks(
    alive,
    (seconds) => {
      clock.current.now = seconds;
      // Idling goes on through a shrink; a mood starts over when it begins.
      const t = shownMood === 'idle' ? seconds : seconds - clock.current.changedAt;
      const life = { mood: shownMood, t, boil: boilFrame(seconds) };
      setMoved({ of: drawing, commands: buildMonster(spec, sizeFactor, life) });
    },
    size >= SMALL_SIZE || tap.reacting ? FULL_HZ : SMALL_MONSTER_HZ,
  );
  useEffect(() => {
    if (!alive) setMoved(null);
  }, [alive]);

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

  const squashing = (squashOnChange || onPress !== undefined) && !still;
  const changed = useChangeSquash(shownMood, squashing);
  const transform = useDerivedValue<Transform>(() => {
    // With reduced motion the entrance is the fade alone.
    const pop = still ? 1 : hatchPop(entered.value).scale;
    const step = shrinkStep(shrinking.value);
    const shrink = shrinkFactor(shrunkFrom.value, 1, step);
    const squash = moodSquash(changed.value);
    return [
      { scaleX: pop * shrink * step.squashX * squash.scaleX },
      { scaleY: pop * shrink * step.squashY * squash.scaleY },
    ];
  });
  const opacity = useDerivedValue<number>(() => hatchPop(entered.value).opacity);

  return (
    <CharacterCanvas size={size} onPress={tap.press} {...(testID ? { testID } : {})}>
      <Group transform={transform} origin={FEET}>
        <CommandLayer
          commands={moved?.of === drawing && alive ? moved.commands : drawing.rest}
          opacity={opacity}
        />
      </Group>
    </CharacterCanvas>
  );
}
