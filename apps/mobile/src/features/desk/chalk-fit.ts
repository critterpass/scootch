import { Skia, type SkTypeface } from '@shopify/react-native-skia';

/** The chalk's sizes on the board, in room units: today's task, then the next ones. */
const MAIN_SIZE = 26;
const NEXT_SIZE = 20;
const ELLIPSIS = '…';

/** How wide a line of chalk is, in room units, at a size. */
export type MeasureChalk = (text: string, size: number) => number;

/** Measures with Kithfield Hand once it has loaded; until then nothing is cut. */
export function handMeasure(hand: SkTypeface | null): MeasureChalk | null {
  if (hand === null) return null;
  const fonts = new Map<number, ReturnType<typeof Skia.Font>>();
  return (text, size) => {
    let font = fonts.get(size);
    if (font === undefined) {
      font = Skia.Font(hand, size);
      fonts.set(size, font);
    }
    return font.getTextWidth(text);
  };
}

function fit(text: string, size: number, maxWidth: number, measure: MeasureChalk): string {
  if (measure(text, size) <= maxWidth) return text;
  const chars = [...text.trimEnd()];
  while (chars.length > 1) {
    chars.pop();
    const cut = `${chars.join('').trimEnd()}${ELLIPSIS}`;
    if (measure(cut, size) <= maxWidth) return cut;
  }
  return ELLIPSIS;
}

/**
 * The chalk lines cut to end before his speech bubble, as the Desk board keeps them clear of it:
 * the first at the underlined size, the rest smaller. A line that fits is left as said.
 */
export function fitChalk(
  lines: readonly string[],
  maxWidth: number,
  measure: MeasureChalk | null,
): string[] {
  if (measure === null || maxWidth <= 0) return [...lines];
  return lines.map((line, i) => fit(line, i === 0 ? MAIN_SIZE : NEXT_SIZE, maxWidth, measure));
}
