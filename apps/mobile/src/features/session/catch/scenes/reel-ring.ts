/** The ring round the reel that fills as it is wound: its box, and its radius inside it. */
export const RING_BOX = 156;
const RING_RADIUS = 73.5;

/** The ring's filled part as a path, for a share of the winding done, from the top clockwise. */
export function arc(share: number): string {
  const c = RING_BOX / 2;
  // A whole circle has no end to draw an arc to, so it stops a hair short.
  const turn = Math.min(0.9999, Math.max(0, share)) * Math.PI * 2;
  const x = c + Math.sin(turn) * RING_RADIUS;
  const y = c - Math.cos(turn) * RING_RADIUS;
  return `M${c} ${c - RING_RADIUS} A${RING_RADIUS} ${RING_RADIUS} 0 ${turn > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}
