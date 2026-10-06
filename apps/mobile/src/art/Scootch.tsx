import { Group } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { buildScootch, GROUND_Y, VIEW_SIZE, type DrawCommand } from '@scootch/art';

import { useScootchIdle } from './scootch-idle';
import { CharacterCanvas, CommandLayer } from './skia-commands';

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
  /** Width and height in points. */
  readonly size?: number;
  readonly testID?: string;
}

const FEET = { x: VIEW_SIZE / 2, y: GROUND_Y };
const EYES_SHUT = { blink: 1 };

function sameDrawing(a: readonly DrawCommand[], b: readonly DrawCommand[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Scootch, drawn with Skia. Both frames of the idle (eyes as the mood holds them, and shut) are
 * built once per set of props; the breath is a transform about the feet and the blink swaps the
 * two frames, both driven on the UI thread, so nothing is rebuilt or rendered by React per frame.
 * With reduced motion the drawing is the mood's still form and nothing moves.
 */
export function Scootch({
  mood,
  attitude = 'cheeky',
  workMode = null,
  reducedMotion,
  size = 200,
  testID,
}: ScootchProps) {
  const systemReducedMotion = useReducedMotion();
  const still = reducedMotion ?? systemReducedMotion;

  const frames = useMemo(() => {
    const props: ScootchDrawing = { mood, attitude, workMode, reducedMotion: still };
    const open = buildScootch(props);
    if (still) return { open, shut: null };
    const shut = buildScootch(props, EYES_SHUT);
    // A mood whose eyes are already closed or smiling has no blink to draw.
    return { open, shut: sameDrawing(open, shut) ? null : shut };
  }, [mood, attitude, workMode, still]);

  const idle = useScootchIdle(!still);

  return (
    <CharacterCanvas size={size} accessibilityLabel="Scootch" {...(testID ? { testID } : {})}>
      <Group transform={idle.breath} origin={FEET}>
        {frames.shut ? (
          <>
            <CommandLayer commands={frames.open} opacity={idle.eyesOpen} />
            <CommandLayer commands={frames.shut} opacity={idle.eyesShut} />
          </>
        ) : (
          <CommandLayer commands={frames.open} />
        )}
      </Group>
    </CharacterCanvas>
  );
}
