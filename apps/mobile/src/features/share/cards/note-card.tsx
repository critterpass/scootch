import {
  DashPathEffect,
  Group,
  Line,
  Rect,
  RoundedRect,
  Shadow,
  Text,
} from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

import { Brand, CARD_WIDTH, RED, Signature } from './card-parts';
import { handText, lineCount, Spaced, Words } from './card-text';
import type { CardProps } from './card-props';

const BROWN = '#8A6A4A';
const LINE = 28;

/**
 * Sổ liên lạc: a note home in his hand (ShareCard board, third card). His words come from the
 * voice pack; the white-out covers the task inside his sentence.
 */
export function NoteCard({ copy, fonts, height }: CardProps): ReactElement {
  const n = copy.note;
  const x = 34;
  const top = 66;
  const width = CARD_WIDTH - x - 16;
  const bottom = height - 70;
  const textLeft = x + 22;
  const textWidth = width - 22 - 18;
  const footTop = bottom - 16 - 52;
  const firstBaseline = top + 14 + LINE + 20;
  const maxLines = Math.max(1, Math.floor((footTop - 8 - (firstBaseline - 20)) / LINE));
  // A long task makes a long note: his hand gets smaller before any of it is cut.
  const body = handText(n.body);
  const bodySize =
    [20, 18, 16, 14].find((size) => lineCount(body, fonts('hand', size), textWidth) <= maxLines) ??
    14;

  return (
    <Group>
      <Rect x={0} y={0} width={CARD_WIDTH} height={height} color="#2B5BA8" />
      <Rect x={0} y={0} width={22} height={height} color="#234C8E" />
      <Spaced
        text={n.heading}
        x={x}
        y={46}
        font={fonts('sansBold', 12)}
        color="#FFFFFF"
        spacing={0.14}
      />
      {fonts('hand', 16) !== null ? (
        <Text
          x={CARD_WIDTH - 22 - (fonts('hand', 16)?.getTextWidth(handText(n.klass)) ?? 0)}
          y={46}
          text={handText(n.klass)}
          font={fonts('hand', 16)}
          color="#FFD86B"
        />
      ) : null}

      <RoundedRect x={x} y={top} width={width} height={bottom - top} r={8} color="#FFFDF6">
        <Shadow dx={0} dy={10} blur={12} color="rgba(0,0,0,0.25)" />
      </RoundedRect>
      {Array.from({ length: Math.floor((bottom - top) / LINE) }, (_, index) => (
        <Line
          key={index}
          p1={{ x, y: top + 14 + (index + 1) * LINE - 1 }}
          p2={{ x: x + width, y: top + 14 + (index + 1) * LINE - 1 }}
          color="rgba(106,69,184,0.16)"
          strokeWidth={1}
        />
      ))}
      <Rect x={x + 12} y={top} width={2} height={bottom - top} color="rgba(226,69,62,0.35)" />

      <Spaced
        text={n.from}
        x={textLeft}
        y={top + 14 + 18}
        font={fonts('sansBold', 10)}
        color={BROWN}
        spacing={0.1}
      />
      <Words
        text={body}
        x={textLeft}
        y={firstBaseline}
        width={textWidth}
        lineHeight={LINE}
        font={fonts('hand', bodySize)}
        color={RED}
        tape={copy.tape}
        tapeFont={fonts('hand', 18)}
        maxLines={maxLines}
      />

      <Text x={textLeft} y={footTop + 12} text={n.teacher} font={fonts('sans', 10)} color={BROWN} />
      <Signature x={textLeft} y={footTop + 18} width={70} color={RED} stroke={2.6} />
      <RoundedRect
        x={x + width - 18 - 104}
        y={footTop}
        width={104}
        height={52}
        r={6}
        color="rgba(74,68,62,0.4)"
        style="stroke"
        strokeWidth={1.5}
      >
        <DashPathEffect intervals={[4, 3]} />
      </RoundedRect>
      <Text
        x={x + width - 18 - 98}
        y={footTop + 13}
        text={n.parent}
        font={fonts('sans', 9)}
        color={BROWN}
      />

      <Brand
        x={22}
        y={height - 22}
        label={copy.brand}
        font={fonts('sansBold', 14)}
        color="#FFFFFF"
      />
    </Group>
  );
}
