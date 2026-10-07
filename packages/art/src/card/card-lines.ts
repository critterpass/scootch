import type { DrawCommand } from '../core/commands';
import {
  baseline,
  fitText,
  textCommand,
  type MeasureText,
  type TextBox,
  type TextStyle,
} from '../core/text';

export interface LinePlace {
  readonly x: number;
  readonly top: number;
  /** Line height as a share of the font size. */
  readonly leading: number;
  readonly color: string;
  readonly align?: 'right' | 'center';
}

/** Fits `text` into `box`, adds its lines to `out` from `place.top` down, and returns their height. */
export function pushLines(
  out: DrawCommand[],
  measure: MeasureText,
  text: string,
  style: TextStyle,
  box: TextBox,
  place: LinePlace,
): number {
  const fitted = fitText(text, style, box, measure);
  const lineHeight = fitted.style.size * place.leading;
  fitted.lines.forEach((line, i) => {
    out.push(
      textCommand(line, fitted.style, {
        x: place.x,
        y: baseline(place.top + i * lineHeight, fitted.style.size, lineHeight),
        maxWidth: box.maxWidth,
        color: place.color,
        ...(place.align ? { align: place.align } : {}),
      }),
    );
  });
  return fitted.lines.length * lineHeight;
}

export const oneLine = (minSize: number, maxWidth: number): TextBox => ({
  maxWidth,
  minSize,
  maxLines: () => 1,
});
