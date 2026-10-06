import { Group } from '@shopify/react-native-skia';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDerivedValue, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { buildScootch, GROUND_Y, VIEW_SIZE, type DrawCommand } from '@scootch/art';

import { useForcedVariant } from '../screens/registry/support/forced-variant';

import {
  scootchFrameSet,
  scootchMotionPlan,
  scootchTick,
  uniqueLayers,
  type MotionCare,
  type ScootchMotionInput,
} from './motion-plan';
import { runInSlices } from './motion-runner';
import { CharacterCanvas, CommandLayer } from './skia-commands';
import { useMotionTicks } from './use-motion-ticks';

/** The contract's Scootch props, as the drawing takes them. */
type ScootchDrawing = Parameters<typeof buildScootch>[0];

export interface ScootchProps {
  readonly mood: ScootchDrawing['mood'];
  /** Cheeky unless told otherwise, as at first launch. */
  readonly attitude?: ScootchDrawing['attitude'];
  /** Read only when the mood is `working`. */
  readonly workMode?: ScootchDrawing['workMode'];
  /** Leave unset to follow the system's Reduce Motion setting. */
  readonly reducedMotion?: boolean;
  /** A serious task only breathes; on a crisis day nothing moves. */
  readonly care?: MotionCare;
  /** False keeps the mood's or the work mode's own loop off: idle only, as at a table. */
  readonly ownLoop?: boolean;
  /** Makes one Scootch blink and glance at other moments than the next one. */
  readonly seed?: string;
  /** Width and height in points. */
  readonly size?: number;
  readonly testID?: string;
}

const FEET = { x: VIEW_SIZE / 2, y: GROUND_Y };
// The same stretch the drawing model gives a full breath (its `bob` motion input).
const BREATH_TALLER = 0.014;
const BREATH_NARROWER = 0.0084;
/** Frames built between two pauses. One frame is a few milliseconds of work on a phone. */
const FRAMES_PER_SLICE = 4;

interface Layers {
  readonly layers: readonly (readonly DrawCommand[])[];
  readonly layerOf: readonly number[];
}

const FrameLayer = memo(function FrameLayer({
  commands,
  index,
  shown,
}: {
  readonly commands: readonly DrawCommand[];
  readonly index: number;
  readonly shown: SharedValue<number>;
}) {
  // Layers swap rather than fade: they hold see-through ink that would double up.
  const opacity = useDerivedValue<number>(() => (shown.value === index ? 1 : 0));
  return <CommandLayer commands={commands} opacity={opacity} />;
});

/**
 * Scootch, drawn with Skia. The still is built once per set of props. When something moves, the
 * few frames of its loop (and of the blink and the glance) are built once, a few at a time, and
 * kept as layers; a slow clock then only says which layer shows and how deep the breath is, so
 * nothing is rebuilt or rendered by React per frame. Off the screen, in the background, with
 * reduced motion or on a crisis day the clock does not run at all.
 */
export function Scootch({
  mood,
  attitude = 'cheeky',
  workMode = null,
  reducedMotion,
  care = 'none',
  ownLoop = true,
  seed = 'scootch',
  size = 200,
  testID,
}: ScootchProps) {
  const systemReducedMotion = useReducedMotion();
  // A registry capture is always the still, whatever the screen passes.
  const captured = useForcedVariant() !== undefined;
  const still = captured || (reducedMotion ?? systemReducedMotion);

  const drawing = useMemo(() => {
    const props: ScootchDrawing = { mood, attitude, workMode, reducedMotion: still };
    const input: ScootchMotionInput = { mood, workMode, reducedMotion: still, care, ownLoop };
    const plan = scootchMotionPlan(input);
    return { props, plan, set: scootchFrameSet(input, plan), rest: buildScootch(props) };
  }, [mood, attitude, workMode, still, care, ownLoop]);
  const { plan, set, rest } = drawing;
  const frameCount = set.motions.length;

  const [built, setBuilt] = useState<{ of: typeof drawing; layers: Layers } | null>(null);
  useEffect(() => {
    if (frameCount <= 1) return;
    const jobs = set.motions.map(
      (motion, i) => () => (i === 0 ? drawing.rest : buildScootch(drawing.props, motion)),
    );
    return runInSlices(jobs, FRAMES_PER_SLICE, (frames) =>
      setBuilt({ of: drawing, layers: uniqueLayers(frames) }),
    );
  }, [drawing, set, frameCount]);
  const layers = built?.of === drawing ? built.layers : null;

  const shown = useSharedValue(0);
  const bob = useSharedValue(0);
  const last = useRef({ layer: 0, bob: 0 });
  // Writes only what changed, so a tick that shows the same frame costs the canvas nothing.
  const put = useCallback(
    (layer: number, depth: number): void => {
      if (last.current.layer !== layer) shown.value = layer;
      if (last.current.bob !== depth) bob.value = depth;
      last.current = { layer, bob: depth };
    },
    [shown, bob],
  );
  // A new drawing starts from its still.
  useEffect(() => put(0, 0), [drawing, put]);

  useMotionTicks(plan.breath, (seconds) => {
    const tick = scootchTick(set, plan, { mood }, seconds, seed);
    put(layers?.layerOf[tick.frame] ?? 0, tick.bob);
  });

  const breath = useDerivedValue<[{ scaleX: number }, { scaleY: number }]>(() => [
    { scaleX: 1 - bob.value * BREATH_NARROWER },
    { scaleY: 1 + bob.value * BREATH_TALLER },
  ]);

  return (
    <CharacterCanvas size={size} accessibilityLabel="Scootch" {...(testID ? { testID } : {})}>
      <Group transform={breath} origin={FEET}>
        {layers ? (
          layers.layers.map((commands, index) => (
            <FrameLayer key={index} commands={commands} index={index} shown={shown} />
          ))
        ) : (
          <CommandLayer commands={rest} />
        )}
      </Group>
    </CharacterCanvas>
  );
}
