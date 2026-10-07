/**
 * The rules of turning a card over, as plain arithmetic the UI thread can run. The card's side is
 * counted in half turns from face up; a turn to the right adds one and a turn to the left takes
 * one away, so a card flicked back the way it came unwinds instead of spinning on.
 */

/** Where the card is after a turn: its new side, and the angle that side rests at. */
export function turnedBy(side: number, direction: number): { side: number; degrees: number } {
  'worklet';
  const next = side + direction;
  return { side: next, degrees: next * 180 };
}

/** Whether the face is towards the reader at an angle about the vertical axis, in degrees. */
export function facesFront(degrees: number): boolean {
  'worklet';
  return Math.cos((degrees * Math.PI) / 180) >= 0;
}

/**
 * How lively a card left alone is, 0 to 1: full for `restAfter` seconds after it was last touched
 * or tilted, then fading out over `fade` seconds, so an untouched card comes to rest.
 */
export function liveliness(sinceActive: number, restAfter: number, fade: number): number {
  'worklet';
  return Math.min(1, Math.max(0, 1 - (sinceActive - restAfter) / fade));
}
