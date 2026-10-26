import { Glyphs, Group, RoundedRect, Shadow, Text, type SkFont } from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

import { TAPE_END, TAPE_START } from '../share-copy';

/** How a card asks for a face: the handwriting, the plain sans (regular or bold) or the serif. */
export type FontRole = 'hand' | 'sans' | 'sansBold' | 'serif';

/** The faces a card is drawn with. `null` while a face is loading: its words wait. */
export type CardFonts = (role: FontRole, size: number) => SkFont | null;

/** Kithfield Hand's curly apostrophe is drawn far too wide; the straight one sits right. */
export function handText(text: string): string {
  return text.replace(/[‘’]/g, "'");
}

/** One run of a laid-out line: words, or a strip of white-out over words. */
export type Run = {
  readonly text: string;
  readonly tape: boolean;
  readonly x: number;
  readonly width: number;
};
export type Line = readonly Run[];

type Token = {
  readonly text: string;
  readonly tape: boolean;
  /** Written straight after the token before it, with no space: a full stop after the tape. */
  readonly glued: boolean;
};

function tokensOf(text: string): Token[] {
  const tokens: Token[] = [];
  const parts = text.split(new RegExp(`(${TAPE_START}[^${TAPE_END}]*${TAPE_END})`, 'u'));
  let spaceBefore = true;
  for (const part of parts) {
    if (part === '') continue;
    if (part.startsWith(TAPE_START)) {
      tokens.push({ text: part.slice(1, -1), tape: true, glued: !spaceBefore });
      spaceBefore = false;
      continue;
    }
    const words = part.split(/\s+/u);
    words.forEach((word, index) => {
      if (word !== '') tokens.push({ text: word, tape: false, glued: index === 0 && !spaceBefore });
    });
    spaceBefore = /\s$/u.test(part);
  }
  return tokens;
}

/**
 * Lays text out in lines no wider than `width`. Words break at spaces; a taped run stays whole and
 * is cut to the line when it is longer. At most `maxLines`: the last line ends in an ellipsis when
 * there was more.
 */
export function layoutLines(
  text: string,
  measure: (words: string) => number,
  width: number,
  maxLines = Infinity,
): Line[] {
  const space = measure(' ');
  const lines: Run[][] = [];
  let line: Run[] = [];
  let x = 0;
  const push = () => {
    lines.push(line);
    line = [];
    x = 0;
  };
  for (const token of tokensOf(text)) {
    const full = measure(token.text);
    const tokenWidth = token.tape ? Math.min(full, width) : full;
    const gap = line.length === 0 || token.glued ? 0 : space;
    if (line.length > 0 && !token.glued && x + gap + tokenWidth > width) push();
    const start = line.length === 0 ? 0 : x + gap;
    const last = line[line.length - 1];
    if (last !== undefined && !last.tape && !token.tape) {
      // Words of one run stay one run, so a line draws in as few pieces as it can.
      const joined = token.glued ? `${last.text}${token.text}` : `${last.text} ${token.text}`;
      line[line.length - 1] = { ...last, text: joined, width: start + tokenWidth - last.x };
    } else {
      line.push({ text: token.text, tape: token.tape, x: start, width: tokenWidth });
    }
    x = start + tokenWidth;
  }
  if (line.length > 0) push();
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const end = kept[maxLines - 1] ?? [];
  const tail = end[end.length - 1];
  if (tail !== undefined && !tail.tape) {
    let words = tail.text;
    while (words.length > 1 && tail.x + measure(`${words}…`) > width) words = words.slice(0, -1);
    kept[maxLines - 1] = [...end.slice(0, -1), { ...tail, text: `${words.trimEnd()}…` }];
  }
  return kept;
}

/** A strip of white correction tape over words, with a word written on it. */
export function Tape({
  x,
  y,
  width,
  height,
  label,
  labelFont,
}: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly labelFont: SkFont | null;
}): ReactElement {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <Group transform={[{ rotate: (-1.2 * Math.PI) / 180 }]} origin={{ x: cx, y: cy }}>
      <RoundedRect x={x - 4} y={y} width={width + 8} height={height} r={2} color="#FFFFFF">
        <Shadow dx={0} dy={1} blur={1.5} color="rgba(60,40,20,0.25)" />
      </RoundedRect>
      {labelFont !== null ? (
        <Text
          x={x + 8}
          y={cy + labelFont.getSize() * 0.32}
          text={handText(label)}
          font={labelFont}
          color="#6A45B8"
        />
      ) : null}
    </Group>
  );
}

/**
 * Text in lines from `(x, y)`, `y` being the first baseline. Taped runs are drawn as white-out
 * with `tape` written on them. `align` places each line in `width`.
 */
export function Words({
  text,
  x,
  y,
  width,
  lineHeight,
  font,
  color,
  tape,
  tapeFont,
  align = 'left',
  maxLines,
}: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly lineHeight: number;
  readonly font: SkFont | null;
  readonly color: string;
  readonly tape: string;
  readonly tapeFont: SkFont | null;
  readonly align?: 'left' | 'center' | 'right';
  readonly maxLines?: number;
}): ReactElement | null {
  if (font === null) return null;
  const lines = layoutLines(text, (words) => font.getTextWidth(words), width, maxLines);
  const size = font.getSize();
  return (
    <Group>
      {lines.map((line, row) => {
        const used = line.reduce((end, run) => Math.max(end, run.x + run.width), 0);
        const left =
          x + (align === 'center' ? (width - used) / 2 : align === 'right' ? width - used : 0);
        const baseline = y + row * lineHeight;
        return line.map((run, index) =>
          run.tape ? (
            <Tape
              key={`${row}-${index}`}
              x={left + run.x}
              y={baseline - size * 0.95}
              width={run.width}
              height={size * 1.25}
              label={tape}
              labelFont={tapeFont}
            />
          ) : (
            <Text
              key={`${row}-${index}`}
              x={left + run.x}
              y={baseline}
              text={run.text}
              font={font}
              color={color}
            />
          ),
        );
      })}
    </Group>
  );
}

/** How many lines `Words` will draw. */
export function lineCount(
  text: string,
  font: SkFont | null,
  width: number,
  maxLines?: number,
): number {
  if (font === null) return 1;
  return layoutLines(text, (words) => font.getTextWidth(words), width, maxLines).length;
}

/**
 * Capitals with the boards' tracking, glyph by glyph: `spacing` is a share of the size. `x` is
 * the left edge, or the centre with `center`.
 */
export function Spaced({
  text,
  x,
  y,
  font,
  color,
  spacing,
  center = false,
}: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly font: SkFont | null;
  readonly color: string;
  readonly spacing: number;
  readonly center?: boolean;
}): ReactElement | null {
  if (font === null || text === '') return null;
  const ids = font.getGlyphIDs(text);
  const widths = font.getGlyphWidths(ids);
  const extra = spacing * font.getSize();
  let at = 0;
  const glyphs = ids.map((id, index) => {
    const glyph = { id, pos: { x: at, y: 0 } };
    at += (widths[index] ?? 0) + extra;
    return glyph;
  });
  const total = at - extra;
  return <Glyphs x={center ? x - total / 2 : x} y={y} glyphs={glyphs} font={font} color={color} />;
}
