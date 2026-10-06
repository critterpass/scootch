import type { Point } from '../core/geometry';
import type { Pen } from '../core/pen';
import type { Expression, Pair } from './expression';

/** Where Scootch is in the drawing space once the pose is settled, for anything that attaches to it. */
export interface ScootchFrame {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  /** The line under the feet. */
  readonly by: number;
  /** The line above the curl. */
  readonly top: number;
  readonly leftHand: Point;
  readonly rightHand: Point;
  /** Centre of the face, the height of the eyes and half the distance between them. */
  readonly faceX: number;
  readonly faceY: number;
  readonly eyeY: number;
  readonly eyeGap: number;
}

/** The named values of one mode's loop. */
export type LoopValues = Readonly<Record<string, number>>;

type Layer<Loop> = (pen: Pen, frame: ScootchFrame, loop: Loop) => void;

/**
 * What a work mode adds to the plain working pose: a change of pose, and drawings on up to five
 * layers. `Loop` names the values an animator drives; each layer receives all of them.
 */
export interface WorkModeLayers<Loop> {
  /** Changes the plain working expression before it is drawn. */
  readonly pose?: (expression: Expression, loop: Loop) => void;
  /** Behind Scootch. */
  readonly behind?: Layer<Loop>;
  /** Worn on the body, over the face: glasses, a hat. */
  readonly accessory?: Layer<Loop>;
  /** The prop in front of the body, under the hands. */
  readonly prop?: Layer<Loop>;
  /** Held in or over the hands. */
  readonly held?: Layer<Loop>;
  /** Floating around, over everything. */
  readonly effect?: Layer<Loop>;
}

/**
 * One work mode as the builder uses it. `rest` holds every loop value at its rest frame, which is
 * the still drawn without animation and under Reduce Motion; the layers take any subset of those
 * values and leave the others at rest.
 */
export interface WorkModeAttachment {
  readonly rest: LoopValues;
  readonly pose: (expression: Expression, given?: LoopValues) => void;
  readonly behind: Layer<LoopValues | undefined>;
  readonly accessory: Layer<LoopValues | undefined>;
  readonly prop: Layer<LoopValues | undefined>;
  readonly held: Layer<LoopValues | undefined>;
  readonly effect: Layer<LoopValues | undefined>;
}

/** Declares a work mode: its loop values at rest, then what it draws from them. */
export function defineWorkMode<Loop extends LoopValues>(
  rest: Loop,
  layers: WorkModeLayers<Loop>,
): WorkModeAttachment {
  const at = (given: LoopValues | undefined): Loop => (given ? { ...rest, ...given } : rest);
  const layer =
    (draw: Layer<Loop> | undefined): Layer<LoopValues | undefined> =>
    (pen, frame, given) =>
      draw?.(pen, frame, at(given));
  return {
    rest,
    pose: (expression, given) => layers.pose?.(expression, at(given)),
    behind: layer(layers.behind),
    accessory: layer(layers.accessory),
    prop: layer(layers.prop),
    held: layer(layers.held),
    effect: layer(layers.effect),
  };
}

/** Both brows the same: [lift, slant]. */
export function bothBrows(lift: number, slant: number): readonly [Pair, Pair] {
  return [
    [lift, slant],
    [lift, slant],
  ];
}

/** Position in a loop, 0 to 1, for a piece that runs `offset` ahead of the loop value. */
export function phase(value: number, offset = 0): number {
  return (((value + offset) % 1) + 1) % 1;
}
