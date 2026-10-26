import { Circle, Group, Path, Rect, RoundedRect, Text, TextPath } from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

import { SITE } from '../share-copy';

import { BLUE_INK, Brand, CARD_WIDTH, RED, Signature } from './card-parts';
import { handText, lineCount, Spaced, Words } from './card-text';
import type { CardProps } from './card-props';

const SEAL_RED = '#C8312A';
const GOLD = '#D9A63C';
const BROWN = '#8A6A4A';
const INK = '#4A443E';

/** The seal's ring of words, as a circle path starting at its left. */
function ring(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`;
}

/** His red seal, from the ShareCard board: two rings, the class around them, a star. */
function Seal({
  cx,
  cy,
  r,
  text,
  fonts,
}: {
  cx: number;
  cy: number;
  r: number;
  text: string;
  fonts: CardProps['fonts'];
}) {
  const k = r / 50;
  // The ring of words goes once round, whatever the language: the size is fitted to the ring.
  const probe = fonts('sansBold', 10);
  const around = 2 * Math.PI * 38 * k * 0.97;
  const font =
    probe === null
      ? null
      : fonts('sansBold', Math.min(10.5 * k, (10 * around) / probe.getTextWidth(text)));
  const star =
    `M ${cx} ${cy - 18 * k} L ${cx + 5 * k} ${cy - 5 * k} L ${cx + 19 * k} ${cy - 5 * k} L ${cx + 8 * k} ${cy + 3 * k} ` +
    `L ${cx + 12 * k} ${cy + 17 * k} L ${cx} ${cy + 9 * k} L ${cx - 12 * k} ${cy + 17 * k} L ${cx - 8 * k} ${cy + 3 * k} ` +
    `L ${cx - 19 * k} ${cy - 5 * k} L ${cx - 5 * k} ${cy - 5 * k} Z`;
  return (
    <Group transform={[{ rotate: (-12 * Math.PI) / 180 }]} origin={{ x: cx, y: cy }} opacity={0.86}>
      <Circle cx={cx} cy={cy} r={r} color={RED} style="stroke" strokeWidth={4 * k} />
      <Circle cx={cx} cy={cy} r={30 * k} color={RED} style="stroke" strokeWidth={2 * k} />
      {font !== null ? (
        <TextPath path={ring(cx, cy, 38 * k)} text={text} font={font} color={RED} />
      ) : null}
      <Path path={star} color={RED} />
    </Group>
  );
}

/** A gold flourish in one corner, mirrored by `sx` and `sy`. */
function Corner({ x, y, sx, sy }: { x: number; y: number; sx: number; sy: number }) {
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: sx }, { scaleY: sy }]}>
      <Path path="M0 0 q20 2 22 22 q-12 -8 -22 -22 z" color={GOLD} />
    </Group>
  );
}

/**
 * Giấy khen: the certificate of merit with his red seal (ShareCard board, second card). Only
 * offered when the finish earned one.
 */
export function CertificateCard({ copy, fonts, height }: CardProps): ReactElement {
  const c = copy.certificate;
  const compact = height < 600;
  const titleSize = compact ? 40 : 50;
  const tapeFont = fonts('hand', 18);
  const reasonFont = fonts('sans', 13);
  const taskFont = fonts('serif', compact ? 18 : 20);
  const nameFont = fonts('hand', compact ? 30 : 34);

  let y = compact ? 50 : 66;
  const kickerY = y;
  y += titleSize + (compact ? 6 : 12);
  const titleY = y;
  y += 14;
  const ornamentY = y;
  y += compact ? 24 : 32;
  const awardedY = y;
  y += c.name !== null ? (compact ? 34 : 40) : 0;
  const nameY = y;
  y += compact ? 26 : 32;
  const reasonY = y;
  const reasonLines = lineCount(c.reason, reasonFont, 250, 3);
  y += reasonLines * 20 + (compact ? 8 : 14);
  const taskY = y;

  const sealR = compact ? 40 : 50;
  const sealCx = CARD_WIDTH - 40 - sealR;
  const sealCy = height - (compact ? 74 : 92) - sealR;
  const taskLines = Math.max(1, Math.floor((sealCy - sealR - taskY + 18) / 24));
  // A long title ("GIẤY KHEN") is fitted inside the gold frame.
  const titleProbe = fonts('serif', titleSize);
  const titleRoom = CARD_WIDTH - 90;
  const titleFont =
    titleProbe === null || titleProbe.getTextWidth(c.title) <= titleRoom
      ? titleProbe
      : fonts('serif', (titleSize * titleRoom) / titleProbe.getTextWidth(c.title));
  const titleWidth = titleFont?.getTextWidth(c.title) ?? 0;

  return (
    <Group>
      <Rect x={0} y={0} width={CARD_WIDTH} height={height} color="#FFF8E8" />
      <RoundedRect
        x={17}
        y={17}
        width={CARD_WIDTH - 34}
        height={height - 34}
        r={16}
        color={SEAL_RED}
        style="stroke"
        strokeWidth={6}
      />
      <RoundedRect
        x={27}
        y={27}
        width={CARD_WIDTH - 54}
        height={height - 54}
        r={10}
        color={GOLD}
        style="stroke"
        strokeWidth={2}
      />
      <Corner x={34} y={34} sx={1} sy={1} />
      <Corner x={CARD_WIDTH - 34} y={34} sx={-1} sy={1} />
      <Corner x={34} y={height - 34} sx={1} sy={-1} />
      <Corner x={CARD_WIDTH - 34} y={height - 34} sx={-1} sy={-1} />

      <Spaced
        text={c.kicker}
        x={CARD_WIDTH / 2}
        y={kickerY}
        font={fonts('sansBold', 10)}
        color={BROWN}
        spacing={0.2}
        center
      />
      {titleFont !== null ? (
        <Text
          x={(CARD_WIDTH - titleWidth) / 2}
          y={titleY}
          text={c.title}
          font={titleFont}
          color={SEAL_RED}
        />
      ) : null}
      <Path
        path={`M${CARD_WIDTH / 2 - 68} ${ornamentY} H${CARD_WIDTH / 2 - 14} M${CARD_WIDTH / 2 + 14} ${ornamentY} H${CARD_WIDTH / 2 + 68}`}
        style="stroke"
        strokeWidth={2}
        color={GOLD}
      />
      <Path
        path={`M${CARD_WIDTH / 2} ${ornamentY - 6} L${CARD_WIDTH / 2 + 4} ${ornamentY} L${CARD_WIDTH / 2} ${ornamentY + 6} L${CARD_WIDTH / 2 - 4} ${ornamentY} Z`}
        color={GOLD}
      />
      <Words
        text={c.awarded}
        x={40}
        y={awardedY}
        width={CARD_WIDTH - 80}
        lineHeight={18}
        font={fonts('sans', 13)}
        color={INK}
        tape={copy.tape}
        tapeFont={tapeFont}
        align="center"
        maxLines={1}
      />
      {c.name !== null ? (
        <Words
          text={handText(c.name)}
          x={30}
          y={nameY}
          width={CARD_WIDTH - 60}
          lineHeight={36}
          font={nameFont}
          color={BLUE_INK}
          tape={copy.tape}
          tapeFont={tapeFont}
          align="center"
          maxLines={1}
        />
      ) : null}
      <Words
        text={c.reason}
        x={55}
        y={reasonY}
        width={250}
        lineHeight={20}
        font={reasonFont}
        color={INK}
        tape={copy.tape}
        tapeFont={tapeFont}
        align="center"
        maxLines={3}
      />
      <Words
        text={c.task}
        x={50}
        y={taskY}
        width={260}
        lineHeight={24}
        font={taskFont}
        color="#1C1A18"
        tape={copy.tape}
        tapeFont={tapeFont}
        align="center"
        maxLines={taskLines}
      />

      <Text x={44} y={sealCy - 6} text={c.date} font={fonts('sans', 11)} color={BROWN} />
      <Signature x={44} y={sealCy} width={84} color={BLUE_INK} stroke={2.4} />
      <Text x={44} y={sealCy + 50} text="Thầy Phú" font={fonts('hand', 16)} color={INK} />
      <Seal cx={sealCx} cy={sealCy} r={sealR} text={c.seal} fonts={fonts} />

      <Brand x={66} y={height - 44} label={SITE} font={fonts('sans', 12)} color={BROWN} size={20} />
    </Group>
  );
}
