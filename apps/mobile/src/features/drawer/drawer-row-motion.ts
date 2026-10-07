/** A drawer row's swipe, in points and milliseconds. */
export const ROW = {
  /** A finger has to travel this far sideways before the row takes the drag. */
  takesAfter: 12,
  /** A drag that goes this far up or down first is the list's. */
  scrollsAfter: 10,
  /** Let go past this share of its width, it is removed. */
  removesPast: 0.45,
  /** A flick to the left faster than this, in points a second, removes it from anywhere. */
  flick: 800,
  offMs: 180,
  closeMs: 220,
  /** How long a ticked row shows its tick before it closes up. */
  tickedMs: 420,
  settle: { damping: 20, stiffness: 260, mass: 0.8 },
} as const;

/** Whether a row `wide` points across is removed when let go `slid` points along at `velocity`. */
export function removesOnRelease(slid: number, velocity: number, wide: number): boolean {
  'worklet';
  if (slid >= 0 || wide <= 0) return false;
  return velocity < -ROW.flick || -slid > wide * ROW.removesPast;
}
