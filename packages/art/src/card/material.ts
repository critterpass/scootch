import type { BlendMode, GradientStop } from '../core/commands';

/**
 * One layer of a material. Its geometry is in shares of the box it is laid on (0 to 1), so the
 * same finish dresses a small tile and a full card; only dots keep their size in points, as print
 * does.
 */
export type MaterialLayer =
  | { readonly kind: 'solid'; readonly color: string; readonly alpha: number }
  /** A CSS-style linear gradient: 0 degrees runs to the top, 90 to the right. */
  | { readonly kind: 'linear'; readonly angle: number; readonly stops: readonly GradientStop[] }
  /** An oval gradient: where its centre sits, and its two radii as shares of the box. */
  | {
      readonly kind: 'oval';
      readonly at: readonly [number, number];
      readonly size: readonly [number, number];
      readonly stops: readonly GradientStop[];
    }
  /** A round gradient that reaches the box's farthest corner. */
  | {
      readonly kind: 'round';
      readonly at: readonly [number, number];
      readonly stops: readonly GradientStop[];
    }
  /** A halftone screen: dots on a square grid, in points. */
  | {
      readonly kind: 'dots';
      readonly step: number;
      readonly radius: number;
      readonly offset: readonly [number, number];
      readonly color: string;
      readonly alpha: number;
    };

export type Tint = readonly [color: string, alpha: number];

/**
 * A finish as a material: what the stock is, how light slides over it and what ink reads on it.
 * It is built from light, not pictures, so it can answer the phone's tilt.
 */
export interface FinishMaterial {
  /** The stock itself, bottom layer first. It does not move. */
  readonly base: readonly MaterialLayer[];
  /** The light on it, laid on a box three times the face and slid as the card leans. */
  readonly sheen: readonly MaterialLayer[];
  readonly sheenAlpha: number;
  readonly sheenBlend: BlendMode;
  /** How strongly the fine sparkle prints, 0 for none. */
  readonly spark: number;
  /** How much paper tooth shows, 0 for none. */
  readonly grain: number;
  /** The ink that reads on it, and the quieter one for small labels. */
  readonly text: string;
  readonly sub: Tint;
  /** The hairline round its edge and the colour of the shadow it throws. */
  readonly edge: Tint;
  readonly shadow: Tint;
  /** The halo behind it when it is shown off. */
  readonly glow: Tint;
}
