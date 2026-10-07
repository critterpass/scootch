import type { Point } from './geometry';
import type { InkPair } from './inks';
import type { Pen } from './pen';
import type { MonsterInk, MonsterLegs } from './spec';

/** Where one monster sits in the drawing space. */
export interface BodyFrame {
  readonly cx: number;
  /** Top of the body. */
  readonly y0: number;
  /** Bottom of the body. */
  readonly y1: number;
  readonly w: number;
  readonly h: number;
  /** The seed as a number, for details a body varies by itself. */
  readonly seed: number;
  /** Seconds into the idle loop. A still drawing is taken at zero. */
  readonly t: number;
  /** True once the monster is caught: asleep, with nothing about it ringing or rattling. */
  readonly caught: boolean;
}

/** One body type: its outline, where its face goes and what it carries. */
export interface MonsterBody {
  readonly width: number;
  readonly height: number;
  /** The legs this body hatches with. */
  readonly legs: MonsterLegs;
  /** False when the body's own top (a lid, bells, flaps) leaves no room for horns, antennae or eye stalks. */
  readonly tops: boolean;
  /** Share of the body width the face may use. */
  readonly faceWidth: number;
  /** Floats above the ground. */
  readonly hover?: true;
  /** Has no legs and gets about by hopping. */
  readonly hop?: true;
  /** Eyes nearly shut. */
  readonly sleepy?: true;
  /** A fixed eye count this body hatches with. */
  readonly eyes?: 1 | 2 | 3;
  /** The inks this body hatches in; all the common inks when absent. */
  readonly inks?: readonly MonsterInk[];
  outline(frame: BodyFrame): Point[];
  face(frame: BodyFrame): Point;
  /** Drawn behind the body. */
  under?(pen: Pen, frame: BodyFrame, ink: InkPair): void;
  /** Drawn on the body, under the face. */
  deco?(pen: Pen, frame: BodyFrame, ink: InkPair): void;
}
