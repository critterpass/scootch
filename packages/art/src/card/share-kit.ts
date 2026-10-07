import type { DrawCommand, Path, PathSegment } from '../core/commands';
import { baseline, fitText, textCommand, type MeasureText, type TextStyle } from '../core/text';
import { fill, rotation, type Box } from './shapes';

// The pieces the five shared pictures are put together from.

export const SHARE_INK = '#1C1A17';
export const SHARE_PAPER = '#F4EBDA';
export const SHARE_MARK = 'SCOOTCH.APP';

/** The stamped face of the shared pictures: small capitals, widely spaced. */
export const STAMP: TextStyle = { font: 'sans', size: 11, weight: 700, tracking: 0.14 };

export const rect = ({ x, y, w, h }: Box): Path => [
  ['M', x, y],
  ['L', x + w, y],
  ['L', x + w, y + h],
  ['L', x, y + h],
  ['Z'],
];

/** Everything drawn by `commands`, turned by `degrees` about a point. */
export function turned(
  commands: readonly DrawCommand[],
  cx: number,
  cy: number,
  degrees: number,
): DrawCommand[] {
  return [
    { op: 'save' },
    { op: 'transform', matrix: rotation(cx, cy, degrees) },
    ...commands,
    { op: 'restore' },
  ];
}

/**
 * A drawing as a die-cut sticker: the same drawing with a thick white edge all round it, as if
 * cut out of a sheet. The edge is every shape of the drawing stroked wide in white, underneath.
 */
export function dieCut(commands: readonly DrawCommand[], edge: number): DrawCommand[] {
  const under: DrawCommand[] = [];
  for (const command of commands) {
    if (command.op === 'fill') {
      under.push(
        { ...command, color: '#FFFFFF', alpha: 1 },
        { op: 'stroke', path: command.path, color: '#FFFFFF', alpha: 1, width: edge * 2 },
      );
    } else if (command.op === 'stroke') {
      under.push({ ...command, color: '#FFFFFF', alpha: 1, width: command.width + edge * 2 });
    } else if (command.op !== 'text' && command.op !== 'paint') under.push(command);
  }
  return [...under, ...commands];
}

/** One fitted line, shrunk until it fits, as a command. `top` is the top of its line box. */
export function line(
  text: string,
  style: TextStyle,
  place: {
    readonly x: number;
    readonly top: number;
    readonly maxWidth: number;
    readonly color: string;
    readonly align?: 'left' | 'center' | 'right';
    readonly alpha?: number;
    readonly minSize?: number;
  },
  measure: MeasureText,
): DrawCommand {
  const fitted = fitText(
    text,
    style,
    { maxWidth: place.maxWidth, minSize: place.minSize ?? 7, maxLines: () => 1 },
    measure,
  );
  return textCommand(fitted.lines[0] ?? '', fitted.style, {
    x: place.x,
    y: baseline(place.top, fitted.style.size, fitted.style.size),
    maxWidth: place.maxWidth,
    color: place.color,
    ...(place.align ? { align: place.align } : {}),
    ...(place.alpha === undefined ? {} : { alpha: place.alpha }),
  });
}

/** A row of fine dots between two ends of a line of facts: a dotted leader. */
export function leader(x0: number, x1: number, y: number): Path {
  const dots: PathSegment[] = [];
  for (let x = x0; x <= x1; x += 4) dots.push(['O', x, y, 0.6]);
  return dots;
}

/** A dashed rule across a receipt. */
export function dashes(x0: number, x1: number, y: number, color: string): DrawCommand {
  const path: PathSegment[] = [];
  for (let x = x0; x < x1; x += 7) path.push(['M', x, y], ['L', Math.min(x + 4, x1), y]);
  return { op: 'stroke', path, color, alpha: 0.5, width: 1.5 };
}

/** A halftone of dots that fades out down the page, in bands of falling strength. */
export function fadingScreen(box: Box, step: number, radius: number, color: string): DrawCommand[] {
  const bands = 10;
  const out: DrawCommand[] = [];
  for (let band = 0; band < bands; band++) {
    const from = box.y + (box.h * band) / bands;
    const to = box.y + (box.h * (band + 1)) / bands;
    const dots: PathSegment[] = [];
    for (let y = box.y + step / 2; y < box.y + box.h; y += step) {
      if (y < from || y >= to) continue;
      for (let x = box.x + step / 2; x < box.x + box.w; x += step) dots.push(['O', x, y, radius]);
    }
    // Full at the top, a seventh of that by a little past half way, and gone by three quarters.
    const at = (band + 0.5) / bands;
    const strength =
      at < 0.55 ? 1 - (at / 0.55) * 0.85 : Math.max(0, 0.15 * (1 - (at - 0.55) / 0.2));
    if (dots.length > 0 && strength > 0) out.push(fill(dots, color, 0.9 * strength));
  }
  return out;
}
