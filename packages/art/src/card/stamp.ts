import type { DrawCommand } from '../core/commands';
import { baseline, fitText, textCommand, type MeasureText, type TextStyle } from '../core/text';
import type { CardFinishInks } from './finish';
import { fill, rotation, roundRect, type Box } from './shapes';

const STAMP: TextStyle = { font: 'sans', size: 13, weight: 800, tracking: 0.08 };
const MAX_WIDTH = 120;
/** The width of the card the stamp hangs off, and how far it hangs over the right edge. */
const CARD_RIGHT = 330;
const OVERHANG = 14;

const fitStamp = (label: string, measure: MeasureText) =>
  fitText(label, STAMP, { maxWidth: MAX_WIDTH, minSize: 9, maxLines: () => 1 }, measure);

/** The middle of the stamp, which it leans and lands about. */
export function stampCentre(label: string, measure: MeasureText): { x: number; y: number } {
  const stamp = fitStamp(label, measure);
  const w = measure(stamp.lines[0] ?? '', stamp.style) + 24;
  return { x: CARD_RIGHT + OVERHANG - w / 2, y: 108 + 31 / 2 };
}

/** The stamp struck across the top right corner of a caught card, leaning nine degrees. */
export function buildStamp(
  label: string,
  inks: CardFinishInks,
  measure: MeasureText,
): DrawCommand[] {
  const stamp = fitStamp(label, measure);
  const text = stamp.lines[0] ?? '';
  const w = measure(text, stamp.style) + 24;
  const box: Box = { x: CARD_RIGHT + OVERHANG - w, y: 108, w, h: 31 };
  return [
    { op: 'save' },
    { op: 'transform', matrix: rotation(box.x + w / 2, box.y + box.h / 2, 9) },
    fill(roundRect({ ...box, y: box.y + 5 }, 8), '#1C1A17', 0.18),
    fill(roundRect({ x: box.x - 2.5, y: box.y - 2.5, w: w + 5, h: box.h + 5 }, 9.5), inks.paper),
    fill(roundRect(box, 7), inks.accent),
    textCommand(text, stamp.style, {
      x: box.x + w / 2,
      y: baseline(box.y + 9, STAMP.size, STAMP.size),
      maxWidth: MAX_WIDTH,
      color: inks.onAccent,
      align: 'center',
    }),
    { op: 'restore' },
  ];
}
