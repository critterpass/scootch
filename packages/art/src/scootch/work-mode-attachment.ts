import type { WorkMode } from '@scootch/domain';

import type { Point } from '../core/geometry';
import type { Pen } from '../core/pen';
import type { Expression } from './expression';

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

type Layer = (pen: Pen, frame: ScootchFrame, beat: number) => void;

/**
 * What a work mode adds to the plain working pose: a change of pose, and drawings on up to five
 * layers. A mode with no attachment draws the plain desk and laptop.
 */
export interface WorkModeAttachment {
  /** Changes the plain working expression before it is drawn. */
  readonly pose?: (expression: Expression, beat: number) => void;
  /** Behind Scootch. */
  readonly behind?: Layer;
  /** Worn on the body, over the face: glasses, a hat. */
  readonly accessory?: Layer;
  /** The prop in front of the body, under the hands. Replaces the plain desk and laptop. */
  readonly prop?: Layer;
  /** Held in or over the hands. */
  readonly held?: Layer;
  /** Floating around, over everything. */
  readonly effect?: Layer;
}

/**
 * The work-mode hook: the prop and accessory of each mode attach here. It is empty, so every
 * mode draws the plain working pose.
 */
export const WORK_MODE_ATTACHMENTS: Partial<Record<WorkMode, WorkModeAttachment>> = {};
