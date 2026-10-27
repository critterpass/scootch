import {
  Group,
  matchFont,
  Paint,
  Picture,
  Rect,
  Skia,
  Text,
  type SkFont,
  type SkTypeface,
} from '@shopify/react-native-skia';
import { memo, useMemo, type ReactElement } from 'react';
import { Platform } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { LOOPS, type Layer, type Loop, type Piece, type TextItem } from '@phusclass/art/class';

import { groupMatrix } from '../art/skia-nodes';

import { Blinking, Landing, Moving, Walking, WallTint, type ChalkLanding } from './moving';
import { svgPicture } from './svg-pictures';

/** Which chalk lines are new in this telling, and the line under them that bumps. */
export interface ChalkNews {
  readonly fresh: ReadonlySet<string>;
  readonly more: string | null;
  readonly telling: number;
}

/**
 * What every layer of one drawing shares. It stays the same object while the room is on screen,
 * so a layer that did not change is never drawn again by React: what changes from moment to
 * moment is in shared values.
 */
export interface DrawContext {
  /** Clip paths and gradients the drawing's SVG refers to. */
  readonly defs: string;
  /** Milliseconds of motion so far, on the UI thread. */
  readonly clock: SharedValue<number>;
  /** Which loops run now: none under Reduce Motion. */
  readonly running: ReadonlySet<string>;
  /**
   * Loops given to layers the drawing names by id, over their own; `walking` is the loop it runs
   * instead while he walks or paces.
   */
  readonly overrides: Readonly<
    Record<
      string,
      {
        readonly loop: string;
        readonly walking?: string;
        readonly pivot?: readonly [number, number];
      }
    >
  >;
  /** The handwriting face; until it loads, text waits. */
  readonly hand: SkTypeface | null;
  /** 0 with his eyes open, 1 shut for a blink. */
  readonly blink?: SharedValue<number>;
  /** His eyes shut, for the blink, by the open eyes of each pose drawn. */
  readonly shutEyes?: WeakMap<Layer, Layer>;
  /** Moves played once, by layer id, each on its own clock (the pop into a new pose). */
  readonly oneShots?: Readonly<
    Record<
      string,
      {
        readonly loop: Loop;
        readonly ms: SharedValue<number>;
        readonly pivot: readonly [number, number];
      }
    >
  >;
  /** 1 while he walks or paces. */
  readonly walking?: SharedValue<number>;
  /** His pacing across the front, on its own clock, and whether he is pacing now. */
  readonly pacing?: { readonly on: SharedValue<number>; readonly clock: SharedValue<number> };
  /** Where his middle is, in room units, as he walks between spots. */
  readonly walkTo?: { readonly x: SharedValue<number>; readonly y: SharedValue<number> };
  /** The wall's colour, warmed by the pressure. */
  readonly wall?: SharedValue<string>;
  /** The clock new chalk lands on. */
  readonly landing?: ChalkLanding;
}

const attrText = (attrs: Readonly<Record<string, string>>) =>
  Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
    .join('');

function fontFor(item: TextItem, hand: SkTypeface | null): SkFont | null {
  if (item.font === 'hand') return hand ? Skia.Font(hand, item.size) : null;
  return matchFont({
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontSize: item.size,
    fontWeight: item.weight >= 700 ? 'bold' : 'normal',
  });
}

/** One line of text: its anchor, its underline, its own turn; new chalk lands as it is drawn. */
const TextPiece = memo(function TextPiece({
  item,
  hand,
  lands,
  landing,
  telling = 0,
}: {
  readonly item: TextItem;
  readonly hand: SkTypeface | null;
  readonly lands?: 'write' | 'bump' | undefined;
  readonly landing?: ChalkLanding | undefined;
  readonly telling?: number;
}) {
  const font = useMemo(() => fontFor(item, hand), [item, hand]);
  if (!font) return null;
  const width = font.getTextWidth(item.text) + item.letterSpacing * item.text.length;
  const left =
    item.anchor === 'middle' ? item.x - width / 2 : item.anchor === 'end' ? item.x - width : item.x;
  let line = (
    <>
      <Text
        x={left}
        y={item.y}
        text={item.text}
        font={font}
        color={item.color}
        opacity={item.opacity}
      />
      {item.underline ? (
        <Rect
          x={left}
          y={item.y + item.underline.offset}
          width={width}
          height={item.underline.thickness}
          color={item.color}
          opacity={item.opacity}
        />
      ) : null}
    </>
  );
  if (lands && landing) {
    const box = { x: left - 2, y: item.y - item.size, width: width + 4, height: item.size * 1.5 };
    line = (
      <Landing how={lands} landing={landing} telling={telling} box={box}>
        {line}
      </Landing>
    );
  }
  return item.matrix ? <Group matrix={groupMatrix(item.matrix)}>{line}</Group> : line;
});

function textView(
  item: TextItem,
  index: number,
  news: ChalkNews | undefined,
  ctx: DrawContext,
): ReactElement {
  const lands = !news
    ? undefined
    : news.fresh.has(item.text)
      ? 'write'
      : news.more === item.text
        ? 'bump'
        : undefined;
  if (!lands || !news) return <TextPiece key={index} item={item} hand={ctx.hand} />;
  return (
    <TextPiece
      key={index}
      item={item}
      hand={ctx.hand}
      lands={lands}
      landing={ctx.landing}
      telling={news.telling}
    />
  );
}

function pieceView(
  piece: Piece,
  index: number,
  inherited: string,
  news: ChalkNews | undefined,
  ctx: DrawContext,
): ReactElement {
  if (piece.kind === 'layer') {
    return <LayerView key={index} layer={piece.layer} inherited={inherited} ctx={ctx} />;
  }
  if (piece.kind === 'text') return textView(piece.item, index, news, ctx);
  const picture = svgPicture(
    inherited.replace('@', () => piece.markup),
    ctx.defs,
  );
  return picture ? <Picture key={index} picture={picture} /> : <Group key={index} />;
}

const loopNamed = (name: string | undefined, ctx: DrawContext): Loop | undefined =>
  name && ctx.running.has(name) ? (LOOPS as Record<string, Loop>)[name] : undefined;

/**
 * One layer of a classroom drawing, and everything in it, in order. `inherited` is the SVG groups
 * of the presentation attributes the layer's ancestors hand down, with `@` where markup goes.
 * `news` is given to the chalk: the lines that land as it is drawn.
 */
export const LayerView = memo(function LayerView({
  layer,
  inherited = '@',
  ctx,
  news,
}: {
  readonly layer: Layer;
  readonly inherited?: string;
  readonly ctx: DrawContext;
  readonly news?: ChalkNews | undefined;
}): ReactElement {
  const attrs = layer.attrs;
  const wrap = attrs ? inherited.replace('@', () => `<g${attrText(attrs)}>@</g>`) : inherited;
  const draw = (l: Layer) => (
    <>{l.pieces.map((piece, i) => pieceView(piece, i, wrap, news, ctx))}</>
  );
  let body: ReactElement = draw(layer);

  const shutEyes = layer.id === 'eyes' ? ctx.shutEyes?.get(layer) : undefined;
  if (ctx.blink && shutEyes) {
    body = <Blinking open={body} shut={draw(shutEyes)} blink={ctx.blink} />;
  }
  if (layer.id === 'wall' && ctx.wall) body = <WallTint color={ctx.wall}>{body}</WallTint>;

  const override = ctx.overrides[layer.id];
  const loop = loopNamed(override?.loop ?? layer.motion, ctx);
  const walkLoop = ctx.walking ? loopNamed(override?.walking, ctx) : undefined;
  const pivot = override?.pivot ?? layer.pivot ?? [0, 0];
  if (loop || walkLoop) {
    body = (
      <Moving loop={loop} walkLoop={walkLoop} walking={ctx.walking} pivot={pivot} clock={ctx.clock}>
        {body}
      </Moving>
    );
  }

  const once = ctx.oneShots?.[layer.id];
  if (once) {
    body = (
      <Moving loop={once.loop} pivot={once.pivot} clock={once.ms}>
        {body}
      </Moving>
    );
  }

  const paces = layer.id === 'phu.place' && ctx.pacing && ctx.running.has('paceWide');
  if (paces && ctx.pacing) {
    body = (
      <Moving
        loop={undefined}
        walkLoop={LOOPS.paceWide}
        walking={ctx.pacing.on}
        pivot={pivot}
        clock={ctx.pacing.clock}
      >
        {body}
      </Moving>
    );
  }

  if (layer.id === 'phu.place' && ctx.walkTo && layer.pivot) {
    body = (
      <Walking at={ctx.walkTo} pivot={layer.pivot}>
        {body}
      </Walking>
    );
  }

  // A running loop that fades sets the opacity itself, as a CSS animation overrides the attribute.
  const opacity = loop?.frames.some((f) => f.opacity !== undefined) ? undefined : layer.opacity;
  return (
    <Group
      {...(layer.matrix ? { matrix: groupMatrix(layer.matrix) } : {})}
      {...(opacity !== undefined && opacity !== 1 ? { layer: <Paint opacity={opacity} /> } : {})}
    >
      {body}
    </Group>
  );
});
