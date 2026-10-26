/**
 * Draws a classroom figure onto a node canvas: runs of shapes as SVG documents through Skia's SVG
 * module (at the destination's resolution, so nothing is resampled), text with the canvas and the
 * handwriting font. Used by render-class.ts.
 */
import { Image, type SKRSContext2D } from '@napi-rs/canvas';

import type { Figure, Layer, TextItem } from '../src/class/figure';
import { IDENTITY, multiply, scale, translate, type Matrix } from '../src/class/markup';

type Op =
  | { readonly kind: 'svg'; readonly markup: string }
  | {
      readonly kind: 'text';
      readonly item: TextItem;
      readonly matrix: Matrix;
      readonly opacity: number;
    };

const attrText = (attrs: Readonly<Record<string, string>>) =>
  Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v.replace(/"/g, '&quot;')}"`)
    .join('');

/** The figure as a list of SVG runs and text, every run wrapped in its layers' groups. */
function flatten(layer: Layer, open: string[], matrix: Matrix, opacity: number, ops: Op[]): void {
  const m = layer.matrix ? multiply(matrix, layer.matrix) : matrix;
  const o = opacity * (layer.opacity ?? 1);
  const attrs = {
    ...(layer.attrs ?? {}),
    ...(layer.matrix ? { transform: `matrix(${layer.matrix.join(' ')})` } : {}),
    ...(layer.opacity === undefined ? {} : { opacity: String(layer.opacity) }),
  };
  const wrap = [...open, `<g${attrText(attrs)}>`];
  for (const piece of layer.pieces) {
    if (piece.kind === 'svg') {
      ops.push({ kind: 'svg', markup: wrap.join('') + piece.markup + '</g>'.repeat(wrap.length) });
    } else if (piece.kind === 'layer') {
      flatten(piece.layer, wrap, m, o, ops);
    } else {
      ops.push({ kind: 'text', item: piece.item, matrix: m, opacity: o });
    }
  }
}

function drawText(ctx: SKRSContext2D, view: Matrix, op: Extract<Op, { kind: 'text' }>) {
  const t = op.item;
  const m = multiply(view, t.matrix ? multiply(op.matrix, t.matrix) : op.matrix);
  ctx.save();
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.globalAlpha = op.opacity * t.opacity;
  ctx.fillStyle = t.color;
  ctx.font = `${t.weight} ${t.size}px ${t.font === 'hand' ? "'Kithfield Hand'" : 'Helvetica'}`;
  ctx.textAlign = t.anchor === 'middle' ? 'center' : t.anchor === 'end' ? 'right' : 'left';
  ctx.letterSpacing = `${t.letterSpacing}px`;
  ctx.fillText(t.text, t.x, t.y);
  if (t.underline) {
    const width = ctx.measureText(t.text).width;
    const left = t.anchor === 'middle' ? t.x - width / 2 : t.anchor === 'end' ? t.x - width : t.x;
    ctx.fillRect(left, t.y + t.underline.offset, width, t.underline.thickness);
  }
  ctx.restore();
}

/**
 * Draws the part of a figure inside `region` (figure units) into `dest` (pixels). Each run of
 * shapes is one SVG document drawn at the destination's own resolution, so nothing is resampled.
 */
export function drawFigure(
  ctx: SKRSContext2D,
  figure: Figure,
  region: { x: number; y: number; w: number; h: number },
  dest: { x: number; y: number; w: number; h: number },
) {
  const ops: Op[] = [];
  flatten(figure.root, [], IDENTITY, 1, ops);
  const s = dest.w / region.w;
  const view = multiply(
    translate(dest.x, dest.y),
    multiply(scale(s), translate(-region.x, -region.y)),
  );
  const pw = Math.ceil(dest.w);
  const ph = Math.ceil(dest.h);
  let run: string[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${region.x} ${region.y} ${region.w} ${region.h}"><defs>${figure.defs}</defs>${run.join('')}</svg>`;
    const image = new Image();
    image.src = Buffer.from(doc);
    ctx.save();
    ctx.beginPath();
    ctx.rect(dest.x, dest.y, dest.w, dest.h);
    ctx.clip();
    ctx.drawImage(image, dest.x, dest.y, pw, ph);
    ctx.restore();
    run = [];
  };
  for (const op of ops) {
    if (op.kind === 'svg') {
      run.push(op.markup);
    } else {
      flush();
      ctx.save();
      ctx.beginPath();
      ctx.rect(dest.x, dest.y, dest.w, dest.h);
      ctx.clip();
      drawText(ctx, view, op);
      ctx.restore();
    }
  }
  flush();
}

export function label(ctx: SKRSContext2D, text: string, x: number, y: number, size = 14) {
  ctx.save();
  ctx.fillStyle = '#6B655E';
  ctx.font = `600 ${size}px Helvetica`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}
