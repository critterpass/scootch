import { Group } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDerivedValue, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import {
  buildScootch,
  easeGaze,
  GAZE_AT_REST,
  gazeTarget,
  GROUND_Y,
  moodSquash,
  VIEW_SIZE,
  type DrawCommand,
  type Gaze,
  type ScootchGround,
  type ScootchTone,
} from '@scootch/art';

import { useForcedVariant } from '../screens/registry/support/forced-variant';

import {
  scootchFrameAt,
  scootchMotionPlan,
  tickHz,
  type MotionCare,
  type ScootchMotionInput,
} from './motion-plan';
import { CharacterCanvas, CommandLayer } from './skia-commands';
import { useMotionTicks } from './use-motion-ticks';
import { useChangeSquash, useTapReaction } from './use-reactions';

/** The contract's Scootch props, as the drawing takes them. */
type ScootchDrawing = Parameters<typeof buildScootch>[0];

/** In the app the confetti falls behind Scootch and never across his face. */
const DRAWN_IN_APP = { confettiBehind: true } as const;

export interface ScootchProps {
  readonly mood: ScootchDrawing['mood'];
  /** Cheeky unless told otherwise, as at first launch. */
  readonly attitude?: ScootchDrawing['attitude'];
  /** Read only when the mood is `working`. */
  readonly workMode?: ScootchDrawing['workMode'];
  /** Worn in place of the curl. */
  readonly hat?: ScootchDrawing['hat'];
  /** `paper` is the pale Scootch who sits on the session's disc. Tomato unless told otherwise. */
  readonly tone?: ScootchTone;
  /** On a dark ground the marks around a tomato Scootch are drawn light. */
  readonly ground?: ScootchGround;
  /** Leave unset to follow the system's Reduce Motion setting. */
  readonly reducedMotion?: boolean;
  /** A serious task only breathes; on a crisis day nothing moves. */
  readonly care?: MotionCare;
  /** False keeps the mood's or the work mode's own motion off: idle only, as at a table. */
  readonly ownLoop?: boolean;
  /** Makes one Scootch blink and glance at other moments than the next one. */
  readonly seed?: string;
  /** Gives a squash whenever the mood or the work mode changes. */
  readonly squashOnChange?: boolean;
  /**
   * Makes Scootch something to tap. A tap calls this and, unless the moment asks for care or for
   * stillness, pops a short celebration with a squash in and out of it.
   */
  readonly onPress?: () => void;
  /**
   * A point for the eyes to follow, in points from the centre of this component (x to the right,
   * y down). `null` or absent lets go of it. Only the watching moods follow.
   */
  readonly gaze?: { readonly x: number; readonly y: number } | null;
  /** Width and height in points. */
  readonly size?: number;
  readonly testID?: string;
}

const FEET = { x: VIEW_SIZE / 2, y: GROUND_Y };
// The same stretch the drawing model gives a full breath (its `bob` motion input).
const BREATH_TALLER = 0.014;
const BREATH_NARROWER = 0.0084;
/** The face sits a little above the middle of the box. */
const FACE_ABOVE_CENTRE = 0.05;

interface Clock {
  /** The runner's seconds at the last tick, and at the last change of mood or work mode. */
  now: number;
  changedAt: number;
  gaze: Gaze;
  key: string;
}

/**
 * Scootch, drawn with Skia. The still is built once per set of props and shows at once. While
 * something moves, a clock rebuilds the drawing for the moment it shows, with the idle, the mood's
 * own motion, the line boil and the gaze all in it together; the breath and the squash are
 * transforms of the whole figure on the UI thread. Off the screen, in the background, with
 * reduced motion or on a crisis day the clock does not run at all.
 */
export function Scootch({
  mood,
  attitude = 'cheeky',
  workMode = null,
  hat = null,
  tone = 'tomato',
  ground = 'light',
  reducedMotion,
  care = 'none',
  ownLoop = true,
  seed = 'scootch',
  squashOnChange = false,
  onPress,
  gaze = null,
  size = 200,
  testID,
}: ScootchProps) {
  const systemReducedMotion = useReducedMotion();
  // A registry capture is always the still, whatever the screen passes.
  const captured = useForcedVariant() !== undefined;
  const still = captured || (reducedMotion ?? systemReducedMotion);
  // A celebration is not for a heavy moment, and a still does not jump.
  const mayReact = !still && care === 'none' && mood !== 'serious';
  const tap = useTapReaction(onPress, mayReact);
  const shownMood = tap.reacting ? 'celebrating' : mood;
  const shownWork = tap.reacting ? null : workMode;

  const drawing = useMemo(() => {
    const props: ScootchDrawing = {
      mood: shownMood,
      attitude,
      workMode: shownWork,
      reducedMotion: still,
      hat,
    };
    const input: ScootchMotionInput = {
      mood: shownMood,
      workMode: shownWork,
      reducedMotion: still,
      care,
      ownLoop,
    };
    const drawn = { ...DRAWN_IN_APP, tone, ground };
    return {
      props,
      input,
      drawn,
      plan: scootchMotionPlan(input),
      rest: buildScootch(props, undefined, drawn),
    };
  }, [shownMood, shownWork, attitude, hat, still, care, ownLoop, tone, ground]);
  const { plan, rest } = drawing;

  const [moved, setMoved] = useState<{ of: typeof drawing; commands: DrawCommand[] } | null>(null);
  const bob = useSharedValue(0);
  const clock = useRef<Clock>({ now: 0, changedAt: 0, gaze: GAZE_AT_REST, key: '' });
  // A new drawing starts from its still, and its own motion from the beginning.
  useEffect(() => {
    clock.current.changedAt = clock.current.now;
    clock.current.key = '';
    // The breath carries on through a change of mood; only a still lets it out.
    if (!drawing.plan.breath) bob.value = 0;
  }, [drawing, bob]);

  useMotionTicks(
    plan.breath,
    (seconds) => {
      const state = clock.current;
      const dt = Math.max(0, seconds - state.now);
      state.now = seconds;
      const target = gaze ? gazeTarget(gaze.x, gaze.y + size * FACE_ABOVE_CENTRE) : null;
      state.gaze = easeGaze(state.gaze, target, dt);
      const frame = scootchFrameAt(drawing.input, plan, {
        seconds,
        sinceChange: seconds - state.changedAt,
        seed,
        look: state.gaze,
      });
      bob.value = frame.bob;
      // The same moment drawn twice costs nothing the second time.
      if (frame.key === state.key) return;
      state.key = frame.key;
      if (frame.key === '') setMoved(null);
      else {
        const options = { ...drawing.drawn, boil: frame.boil };
        setMoved({ of: drawing, commands: buildScootch(drawing.props, frame.motion, options) });
      }
    },
    tickHz(plan, size),
  );

  const squashing = (squashOnChange || onPress !== undefined) && mayReact;
  const changed = useChangeSquash(`${shownMood}|${shownWork ?? ''}`, squashing);
  const transform = useDerivedValue<[{ scaleX: number }, { scaleY: number }]>(() => {
    const squash = moodSquash(changed.value);
    return [
      { scaleX: (1 - bob.value * BREATH_NARROWER) * squash.scaleX },
      { scaleY: (1 + bob.value * BREATH_TALLER) * squash.scaleY },
    ];
  });

  return (
    <CharacterCanvas
      size={size}
      accessibilityLabel="Scootch"
      onPress={tap.press}
      {...(testID ? { testID } : {})}
    >
      <Group transform={transform} origin={FEET}>
        <CommandLayer commands={moved?.of === drawing ? moved.commands : rest} />
      </Group>
    </CharacterCanvas>
  );
}
