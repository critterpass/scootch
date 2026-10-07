/** The sheet's distances, in points, and its springs. */
export const SHEET = {
  /** The gap around the floating card. */
  margin: 8,
  /** The sheet never comes closer than this to the notch. */
  topGap: 48,
  bottomPad: 22,
  /** A finger has to travel this far before the sheet takes the drag. */
  takesAfter: 6,
  /** A drag that goes this far sideways first is not the sheet's. */
  sidewaysFails: 24,
  /** Let go past this share of its height, it closes. */
  closesPast: 1 / 3,
  /** A flick down faster than this, in points a second, closes it from anywhere. */
  flick: 900,
  /** The list pulled this far past its top closes it too. */
  pullCloses: 56,
  /** How much of a pull upwards the sheet gives to. */
  give: 0.16,
  closeMs: 240,
  open: { damping: 22, stiffness: 240, mass: 0.9 },
  settle: { damping: 20, stiffness: 260, mass: 0.8 },
} as const;

/** Where the sheet sits for a finger `travel` points from where it went down: up gives a little. */
export function rubberBand(travel: number): number {
  'worklet';
  return travel >= 0 ? travel : travel * SHEET.give;
}

/** Whether a sheet `tall` points high closes when let go `drag` points down at `velocity`. */
export function closesOnRelease(drag: number, velocity: number, tall: number): boolean {
  'worklet';
  if (drag <= 0) return false;
  return velocity > SHEET.flick || drag > tall * SHEET.closesPast;
}
