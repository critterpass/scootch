/**
 * A figure is board markup cut into layers. Still parts stay as SVG markup, exactly as the board
 * drew them; every part that moves on its own (a foot, his head, the ruler, the fan) is a layer
 * with an id, a pivot and its placement, so the app can move it without redrawing the rest.
 *
 * A renderer walks the tree in order: an `svg` piece is drawn as SVG (Skia's SVG module in the app
 * and in node), a `text` piece with the handwriting font, a `layer` piece under its matrix and
 * opacity. Text is never left inside the SVG: Skia's SVG module cannot reach a font the app loads.
 */
import {
  IDENTITY,
  isElement,
  parseTransform,
  serialize,
  type Element,
  type Matrix,
  type MarkupNode,
  type Point,
} from './markup';

export type FontRole = 'hand' | 'sans';

/** One line of text, in its layer's units. `y` is the alphabetic baseline. */
export interface TextItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly weight: number;
  readonly font: FontRole;
  readonly color: string;
  readonly opacity: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly letterSpacing: number;
  readonly underline?: { readonly offset: number; readonly thickness: number };
  /** The text's own transform, applied in its layer's units. */
  readonly matrix?: Matrix;
}

export type Piece =
  | { readonly kind: 'svg'; readonly markup: string }
  | { readonly kind: 'text'; readonly item: TextItem }
  | { readonly kind: 'layer'; readonly layer: Layer };

export interface Layer {
  readonly id: string;
  /** Where the layer sits in its parent's units. */
  readonly matrix?: Matrix;
  /** Composited as one group, as SVG and CSS opacity do. */
  readonly opacity?: number;
  /** Presentation attributes (fill, stroke, linecap...) the layer's markup inherits. */
  readonly attrs?: Readonly<Record<string, string>>;
  /** The point an animation turns or scales the layer about, in the layer's own units. */
  readonly pivot?: Point;
  /** The name of the loop that moves this layer, from `motion.ts`. */
  readonly motion?: string;
  readonly pieces: readonly Piece[];
}

export interface Figure {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** What a screen reader says. */
  readonly label: string;
  /** Clip paths and gradients every `svg` piece may refer to. */
  readonly defs: string;
  readonly root: Layer;
}

export interface LayerRule {
  readonly id: string;
  readonly pivot?: Point;
  readonly motion?: string;
}

export interface BuildOptions {
  /** The value for a `{{hole}}`; undefined drops the attribute. */
  readonly values?: (hole: string) => string | number | undefined;
  /** Whether an element (attributes still raw, holes unfilled) is a layer of its own. */
  readonly layer?: (
    element: Element,
    path: readonly number[],
    ancestors: readonly Element[],
  ) => LayerRule | undefined;
}

const HOLE = /\{\{\s*([\w.]+)\s*\}\}/g;
/** Attributes that only meant something to the board's browser. */
const BROWSER_ONLY = new Set(['class', 'style', 'role', 'aria-label', 'aria-hidden']);

function fill(value: string, values: BuildOptions['values']): string | undefined {
  const whole = value.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
  if (whole) {
    const v = whole[1] === undefined ? undefined : values?.(whole[1]);
    return v === undefined ? undefined : String(v);
  }
  return value.replace(HOLE, (_, hole: string) => String(values?.(hole) ?? ''));
}

function textItem(element: Element, attrs: Record<string, string>): TextItem {
  const text = element.children.map((c) => (isElement(c) ? '' : c.text)).join('');
  const anchor = attrs['text-anchor'];
  const transform = attrs.transform;
  return {
    text,
    x: Number(attrs.x ?? 0),
    y: Number(attrs.y ?? 0),
    size: Number(attrs['font-size'] ?? 16),
    weight: Number(attrs['font-weight'] ?? 400),
    font: (attrs['font-family'] ?? '').includes('Kithfield') ? 'hand' : 'sans',
    color: attrs.fill ?? '#000000',
    opacity: Number(attrs.opacity ?? 1),
    anchor: anchor === 'middle' || anchor === 'end' ? anchor : 'start',
    letterSpacing: Number(attrs['letter-spacing'] ?? 0),
    ...(transform ? { matrix: parseTransform(transform) } : {}),
  };
}

/** Joins neighbouring markup pieces, so a renderer draws as few SVG documents as it can. */
function joined(pieces: readonly Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const piece of pieces) {
    const last = out[out.length - 1];
    if (piece.kind === 'svg' && last?.kind === 'svg') {
      out[out.length - 1] = { kind: 'svg', markup: last.markup + piece.markup };
    } else if (
      piece.kind === 'layer' &&
      last?.kind === 'layer' &&
      last.layer.id === piece.layer.id &&
      sameFrame(last.layer, piece.layer)
    ) {
      // Siblings that share an id (both halves of the mustache) are one layer.
      out[out.length - 1] = {
        kind: 'layer',
        layer: { ...last.layer, pieces: joined([...last.layer.pieces, ...piece.layer.pieces]) },
      };
    } else {
      out.push(piece);
    }
  }
  return out;
}

const sameFrame = (a: Layer, b: Layer) =>
  JSON.stringify([a.matrix, a.opacity, a.attrs, a.pivot, a.motion]) ===
  JSON.stringify([b.matrix, b.opacity, b.attrs, b.pivot, b.motion]);

/**
 * Cuts board markup into a figure. Holes are filled first; an element whose opacity comes out 0
 * is left out, which draws exactly what the board draws. `defs` are lifted out for every piece.
 */
export function buildFigure(
  meta: {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly label: string;
  },
  nodes: readonly MarkupNode[],
  options: BuildOptions = {},
): Figure {
  const defs: string[] = [];

  const walk = (
    list: readonly MarkupNode[],
    path: readonly number[],
    parentId: string,
    ancestors: readonly Element[],
  ): Piece[] => {
    const pieces: Piece[] = [];
    list.forEach((node, index) => {
      if (!isElement(node)) throw new Error(`Text outside <text> in ${meta.name}`);
      const here = [...path, index];
      const attrs: Record<string, string> = {};
      for (const [name, raw] of Object.entries(node.attrs)) {
        if (BROWSER_ONLY.has(name)) continue;
        const value = fill(raw, options.values);
        if (value !== undefined && value !== '') attrs[name] = value;
      }
      const rule = options.layer?.(node, here, ancestors);
      // A part the pose turned off is left out. A moving part that starts invisible (steam that
      // fades in) is kept, at opacity 0, for its animation.
      const hidden = attrs.opacity !== undefined && Number(attrs.opacity) === 0;
      if (hidden && (!rule || (node.attrs.opacity ?? '').includes('{{'))) return;
      if (node.tag === 'defs') {
        defs.push(serialize(node.children));
        return;
      }
      if (node.tag === 'text') {
        pieces.push({ kind: 'text', item: textItem(node, attrs) });
        return;
      }
      const id = rule?.id ?? `${parentId}.${index}`;
      const inner = node.tag === 'g' ? walk(node.children, here, id, [...ancestors, node]) : [];
      const isStill = !rule && inner.every((p) => p.kind === 'svg');
      if (isStill) {
        const body =
          node.tag === 'g' ? inner.map((p) => (p.kind === 'svg' ? p.markup : '')).join('') : '';
        const children = node.tag === 'g' ? [] : node.children;
        const markup = serialize([{ tag: node.tag, attrs, children }]).replace(
          `></${node.tag}>`,
          `>${body}</${node.tag}>`,
        );
        pieces.push({ kind: 'svg', markup });
        return;
      }
      const { transform, opacity, ...rest } = attrs;
      if (rest['clip-path'] !== undefined && node.tag === 'g') {
        throw new Error(`A clipped group cannot be a layer (${id})`);
      }
      const ownPieces: Piece[] =
        node.tag === 'g'
          ? inner
          : [
              {
                kind: 'svg',
                markup: serialize([{ tag: node.tag, attrs: rest, children: node.children }]),
              },
            ];
      const layer: Layer = {
        id,
        ...(transform ? { matrix: parseTransform(transform) } : {}),
        ...(opacity !== undefined && Number(opacity) !== 1 ? { opacity: Number(opacity) } : {}),
        ...(node.tag === 'g' && Object.keys(rest).length > 0 ? { attrs: rest } : {}),
        ...(rule?.pivot ? { pivot: rule.pivot } : {}),
        ...(rule?.motion ? { motion: rule.motion } : {}),
        pieces: joined(ownPieces),
      };
      pieces.push({ kind: 'layer', layer });
    });
    return joined(pieces);
  };

  const pieces = walk(nodes, [], meta.name, []);
  return { ...meta, defs: defs.join(''), root: { id: meta.name, pieces } };
}

/** Every layer in the tree, depth first, in drawing order. */
export function* layers(layer: Layer): Generator<Layer> {
  yield layer;
  for (const piece of layer.pieces) if (piece.kind === 'layer') yield* layers(piece.layer);
}

export const findLayer = (figure: Figure, id: string): Layer | undefined => {
  for (const layer of layers(figure.root)) if (layer.id === id) return layer;
  return undefined;
};

/** Places a figure inside another figure's units as one layer. */
export function placed(
  figure: Figure,
  id: string,
  matrix: Matrix,
  extra: Partial<Layer> = {},
): Layer {
  return { ...extra, id, matrix, pieces: [{ kind: 'layer', layer: figure.root }] };
}

/** The figure as one SVG document. Text is written as `<text>` here; renderers draw it themselves. */
export function toSvg(figure: Figure, extraDefs = ''): string {
  const write = (layer: Layer): string => {
    const body = layer.pieces
      .map((piece) => {
        if (piece.kind === 'svg') return piece.markup;
        if (piece.kind === 'layer') return write(piece.layer);
        const t = piece.item;
        const attrs: Record<string, string> = {
          x: String(t.x),
          y: String(t.y),
          'font-family': t.font === 'hand' ? 'Kithfield Hand' : 'Inter, system-ui, sans-serif',
          'font-weight': String(t.weight),
          'font-size': String(t.size),
          fill: t.color,
          ...(t.anchor === 'start' ? {} : { 'text-anchor': t.anchor }),
          ...(t.opacity === 1 ? {} : { opacity: String(t.opacity) }),
          ...(t.letterSpacing ? { 'letter-spacing': String(t.letterSpacing) } : {}),
          ...(t.matrix ? { transform: `matrix(${t.matrix.join(' ')})` } : {}),
        };
        return serialize([{ tag: 'text', attrs, children: [{ text: t.text }] }]);
      })
      .join('');
    const attrs: Record<string, string> = {
      ...(layer.attrs ?? {}),
      ...(layer.matrix && layer.matrix !== IDENTITY
        ? { transform: `matrix(${layer.matrix.join(' ')})` }
        : {}),
      ...(layer.opacity === undefined ? {} : { opacity: String(layer.opacity) }),
    };
    return serialize([{ tag: 'g', attrs, children: [] }]).replace('></g>', `>${body}</g>`);
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${figure.width}" height="${figure.height}" viewBox="0 0 ${figure.width} ${figure.height}"><defs>${figure.defs}${extraDefs}</defs>${write(figure.root)}</svg>`;
}
