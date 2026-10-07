/** The plain geometry of the foil: no drawing, so it can be checked by itself. */

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** `#RRGGBB` at a strength, as Skia reads a colour. */
export function inkAt(hex: string, alpha: number): string {
  const channel = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgba(${channel(0)},${channel(1)},${channel(2)},${alpha})`;
}

/** The two ends of a CSS linear gradient at `degrees` across a box, as the browser lays it. */
export function gradientEnds(
  box: Box,
  degrees: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  'worklet';
  const angle = (degrees * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const half = (box.w * Math.abs(dx) + box.h * Math.abs(dy)) / 2;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return {
    start: { x: cx - dx * half, y: cy - dy * half },
    end: { x: cx + dx * half, y: cy + dy * half },
  };
}

/** A CSS background of `size` times the box, placed at a percentage, as the box it is drawn in. */
export function slidBox(box: Box, size: number, px: number, py: number): Box {
  'worklet';
  const w = box.w * size;
  const h = box.h * size;
  return { x: box.x + ((box.w - w) * px) / 100, y: box.y + ((box.h - h) * py) / 100, w, h };
}
