import {
  Group,
  matchFont,
  Paint,
  Picture,
  Rect,
  Skia,
  Text,
  vec,
  type SkFont,
  type SkTypeface,
} from '@shopify/react-native-skia';
import { memo, useMemo, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { LOOPS, type Layer, type Loop, type Piece, type TextItem } from '@phusclass/art/class';

import { groupMatrix } from '../art/skia-nodes';

import { sampleLoopWorklet } from './loop-worklet';
import { svgPicture } from './svg-pictures';

/** What every layer of one drawing shares. */
export interface DrawContext {
  /** Clip paths and gradients the drawing's SVG refers to. */
  readonly defs: string;
  /** Milliseconds of motion so far, on the UI thread. */
  readonly clock: SharedValue<number>;
  /** Which loops run now: none under Reduce Motion. */
  readonly running: ReadonlySet<string>;
  /** Loops given to layers the drawing names by id, over their own. */
  readonly overrides: Readonly<
    Record<string, { readonly loop: string; readonly pivot: readonly [number, number] }>
  >;
  /** The handwriting face; until it loads, text waits. */
  readonly hand: SkTypeface | null;
  /** 0 with his eyes open, 1 shut for a blink. */
  readonly blink?: SharedValue<number>;
  /** His eyes shut, for the blink. */
  readonly shutEyes?: Layer;
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

/** One line of text: its anchor, its underline, its own turn. */
const TextPiece = memo(function TextPiece({
  item,
  hand,
}: {
  readonly item: TextItem;
  readonly hand: SkTypeface | null;
}) {
  const font = useMemo(() => fontFor(item, hand), [item, hand]);
  if (!font) return null;
  const width = font.getTextWidth(item.text) + item.letterSpacing * item.text.length;
  const left =
    item.anchor === 'middle' ? item.x - width / 2 : item.anchor === 'end' ? item.x - width : item.x;
  const line = (
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
  return item.matrix ? <Group matrix={groupMatrix(item.matrix)}>{line}</Group> : line;
});

/** A layer that moves: its loop, sampled each frame on the UI thread, about its pivot. */
function Moving({
  loop,
  pivot,
  clock,
  children,
}: {
  readonly loop: Loop;
  readonly pivot: readonly [number, number];
  readonly clock: SharedValue<number>;
  readonly children: ReactElement;
}) {
  const values = useDerivedValue(() => sampleLoopWorklet(loop, clock.get()));
  const transform = useDerivedValue(() => {
    const v = values.get();
    return [
      { translateX: v.x },
      { translateY: v.y },
      { rotate: (v.rotate * Math.PI) / 180 },
      { scaleX: v.scaleX },
      { scaleY: v.scaleY },
    ];
  });
  const opacity = useDerivedValue(() => values.get().opacity);
  const fades = loop.frames.some((f) => f.opacity !== undefined);
  return (
    <Group
      transform={transform}
      origin={vec(pivot[0], pivot[1])}
      {...(fades ? { layer: <Paint opacity={opacity} /> } : {})}
    >
      {children}
    </Group>
  );
}

/** His eyes, open or shut by the blink value. */
function Blinking({
  open,
  shut,
  blink,
}: {
  readonly open: ReactElement;
  readonly shut: ReactElement;
  readonly blink: SharedValue<number>;
}) {
  const openOpacity = useDerivedValue(() => 1 - blink.get());
  return (
    <>
      <Group layer={<Paint opacity={openOpacity} />}>{open}</Group>
      <Group layer={<Paint opacity={blink} />}>{shut}</Group>
    </>
  );
}

function pieceView(piece: Piece, index: number, inherited: string, ctx: DrawContext): ReactElement {
  if (piece.kind === 'layer') {
    return <LayerView key={index} layer={piece.layer} inherited={inherited} ctx={ctx} />;
  }
  if (piece.kind === 'text') return <TextPiece key={index} item={piece.item} hand={ctx.hand} />;
  const picture = svgPicture(
    inherited.replace('@', () => piece.markup),
    ctx.defs,
  );
  return picture ? <Picture key={index} picture={picture} /> : <Group key={index} />;
}

/**
 * One layer of a classroom drawing, and everything in it, in order. `inherited` is the SVG groups
 * of the presentation attributes the layer's ancestors hand down, with `@` where markup goes.
 */
export const LayerView = memo(function LayerView({
  layer,
  inherited = '@',
  ctx,
}: {
  readonly layer: Layer;
  readonly inherited?: string;
  readonly ctx: DrawContext;
}): ReactElement {
  const attrs = layer.attrs;
  const wrap = attrs ? inherited.replace('@', () => `<g${attrText(attrs)}>@</g>`) : inherited;
  let body: ReactElement = <>{layer.pieces.map((piece, i) => pieceView(piece, i, wrap, ctx))}</>;

  if (layer.id === 'eyes' && ctx.blink && ctx.shutEyes) {
    const shut = <>{ctx.shutEyes.pieces.map((piece, i) => pieceView(piece, i, wrap, ctx))}</>;
    body = <Blinking open={body} shut={shut} blink={ctx.blink} />;
  }

  const override = ctx.overrides[layer.id];
  const loopName = override?.loop ?? layer.motion;
  const loop =
    loopName && ctx.running.has(loopName) ? (LOOPS as Record<string, Loop>)[loopName] : undefined;
  const pivot = override?.pivot ?? layer.pivot ?? [0, 0];
  if (loop) {
    body = (
      <Moving loop={loop} pivot={pivot} clock={ctx.clock}>
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
