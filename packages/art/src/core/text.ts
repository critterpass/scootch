import type { FontRole, TextAlign, TextCommand } from './commands';

/** How a piece of text is set, before it has a place. */
export interface TextStyle {
  readonly font: FontRole;
  readonly size: number;
  readonly weight: number;
  readonly italic?: boolean;
  /** Extra space after every character, as a share of the font size. */
  readonly tracking?: number;
}

/**
 * The width of one line set in a style, in drawing units, including its letter spacing. The
 * renderer supplies it (a canvas, Skia's paragraph measure), so the drawing model itself needs no
 * font.
 */
export type MeasureText = (text: string, style: TextStyle) => number;

const NARROW = new Set("iIjl.,:;'!|·“”‘’ ".split(''));
const WIDE = new Set('mwMW@%—'.split(''));

/**
 * A measure that needs no font: wide on purpose, so text fitted with it also fits in a real face.
 * For the places that have no renderer at hand; a renderer should pass its own.
 */
export const estimateTextWidth: MeasureText = (text, style) => {
  let units = 0;
  for (const char of text) {
    if (NARROW.has(char)) units += 0.36;
    else if (WIDE.has(char)) units += 0.95;
    else if (char >= '0' && char <= '9') units += 0.64;
    else units += char === char.toLowerCase() ? 0.6 : 0.74;
    units += style.tracking ?? 0;
  }
  return units * style.size * (style.weight >= 700 ? 1.04 : 1);
};

const ELLIPSIS = '…';

/** Cuts a line until it fits, ending it with an ellipsis. */
function truncate(text: string, style: TextStyle, maxWidth: number, measure: MeasureText): string {
  const chars = [...text];
  while (chars.length > 0) {
    chars.pop();
    const cut = chars.join('').trimEnd() + ELLIPSIS;
    if (measure(cut, style) <= maxWidth) return cut;
  }
  return '';
}

/** Splits a word that is wider than the line on its own into pieces that fit. */
function breakWord(
  word: string,
  style: TextStyle,
  maxWidth: number,
  measure: MeasureText,
): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const char of word) {
    if (piece !== '' && measure(piece + char, style) > maxWidth) {
      pieces.push(piece);
      piece = char;
    } else piece += char;
  }
  if (piece !== '') pieces.push(piece);
  return pieces;
}

/** Wraps text at spaces into lines no wider than `maxWidth`. */
export function wrapText(
  text: string,
  style: TextStyle,
  maxWidth: number,
  measure: MeasureText,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter((w) => w !== '')) {
    const joined = line === '' ? word : `${line} ${word}`;
    if (measure(joined, style) <= maxWidth) {
      line = joined;
      continue;
    }
    if (line !== '') lines.push(line);
    if (measure(word, style) <= maxWidth) line = word;
    else {
      const pieces = breakWord(word, style, maxWidth, measure);
      line = pieces.pop() ?? '';
      lines.push(...pieces);
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

export interface TextBox {
  readonly maxWidth: number;
  /** The most lines the box holds at a given font size. */
  readonly maxLines: (size: number) => number;
  /** The text shrinks in half-unit steps down to this size before it is cut. */
  readonly minSize: number;
}

export interface FittedText {
  readonly lines: readonly string[];
  readonly style: TextStyle;
}

/**
 * Fits text into a box: wraps it, shrinks it while it has too many lines, and as a last resort
 * cuts the last line with an ellipsis. The result never exceeds the box.
 */
export function fitText(
  text: string,
  style: TextStyle,
  box: TextBox,
  measure: MeasureText,
): FittedText {
  let fitted = style;
  let lines = wrapText(text, fitted, box.maxWidth, measure);
  while (lines.length > box.maxLines(fitted.size) && fitted.size - 0.5 >= box.minSize) {
    fitted = { ...fitted, size: fitted.size - 0.5 };
    lines = wrapText(text, fitted, box.maxWidth, measure);
  }
  const limit = Math.max(1, box.maxLines(fitted.size));
  if (lines.length > limit) {
    const rest = lines.slice(limit - 1).join(' ');
    lines = [...lines.slice(0, limit - 1), truncate(rest, fitted, box.maxWidth, measure)];
  }
  return { lines, style: fitted };
}

/** One line of fitted text as a drawing command. */
export function textCommand(
  text: string,
  style: TextStyle,
  place: {
    readonly x: number;
    readonly y: number;
    readonly maxWidth: number;
    readonly color: string;
    readonly align?: TextAlign;
    readonly alpha?: number;
  },
): TextCommand {
  return {
    op: 'text',
    text,
    x: place.x,
    y: place.y,
    font: style.font,
    size: style.size,
    weight: style.weight,
    italic: style.italic ?? false,
    align: place.align ?? 'left',
    letterSpacing: (style.tracking ?? 0) * style.size,
    maxWidth: place.maxWidth,
    color: place.color,
    alpha: place.alpha ?? 1,
  };
}

/** The baseline of a line whose box starts at `top`, for a CSS-like line height. */
export function baseline(top: number, size: number, lineHeight: number): number {
  return top + (lineHeight - size) / 2 + size * 0.82;
}
