import type { CardData } from '@scootch/domain';

/**
 * The foil as a screen lights it: a band of five colours laid over the face in colour dodge, and
 * a white glare in overlay, both following the card's tilt. These are the board's own numbers; a
 * shared picture keeps the flat foil of `buildFoil`.
 */
export const FOIL_LIGHT = {
  /** The band's direction, in CSS degrees. */
  angle: 115,
  /** Where the band's clear edges and its five colours sit along the gradient. */
  stops: [0, 0.25, 0.38, 0.44, 0.5, 0.56, 0.62, 0.75, 1],
  /** The strength of each of the five colours. */
  alphas: [0.55, 0.55, 0.5, 0.5, 0.5],
  /** The band is drawn this many times the size of the face, and slides inside it. */
  size: 2.6,
  /** How far the band and the glare slide for each degree the card turns, in percent. */
  perDegree: 2.4,
  glare: { alpha: 0.6, radius: 0.48, opacity: 0.7, above: 0.2 },
} as const;

export interface FoilStrength {
  /** How strongly the band prints. */
  readonly band: number;
  /** How strongly the glare prints. */
  readonly glare: number;
  /** Whether the band keeps sweeping across the card by itself. */
  readonly shimmer: boolean;
}

/**
 * How much foil a rarity earns. A rare card has the board's full foil and shimmers by itself; the
 * other two keep the same foil, quieter.
 */
export const FOIL_BY_RARITY: Record<CardData['rarity'], FoilStrength> = {
  common: { band: 0.14, glare: 0.45, shimmer: false },
  uncommon: { band: 0.22, glare: 0.58, shimmer: false },
  rare: { band: 0.32, glare: 0.7, shimmer: true },
};

/** The shimmer of a rare tile in the zoo: a narrower, brighter band that sweeps from side to side. */
export const TILE_SHIMMER = {
  angle: 115,
  colors: ['#FFB496', '#AAEBD2', '#AAC8FF'],
  alphas: [0.7, 0.6, 0.6],
  stops: [0, 0.3, 0.42, 0.5, 0.58, 0.7, 1],
  size: 3,
  opacity: 0.6,
  /** The sweep: 50% either way by this much, at this many radians a second. */
  sweep: 45,
  speed: 0.8,
} as const;
