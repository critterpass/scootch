/** The dock's inner padding, and the gap between the round button and the capsule. */
export const DOCK_PADDING = 7;
/** How far the held dock swells. */
export const DOCK_HELD_SCALE = 1.025;
/** How much of the finger's slide the live row follows. */
export const DRAG_FOLLOW = 0.35;

/**
 * Where the capsule's left edge sits, measured from the dock's inner left edge. At rest it stands
 * clear of the round button (`slot` is the button's width and its gap); fully held it is at 0, so
 * the capsule fills the dock from edge to edge. It never leaves that range: past either end the
 * capsule would uncover the dock on one side.
 */
export function capsuleEdge(fold: number, slot: number): number {
  'worklet';
  const held = Math.min(1, Math.max(0, fold));
  return slot * (1 - held);
}

/** How far the live row is drawn from its place while the finger slides: left only. */
export function liveRowShift(dx: number): number {
  'worklet';
  return Math.min(0, dx) * DRAG_FOLLOW;
}
