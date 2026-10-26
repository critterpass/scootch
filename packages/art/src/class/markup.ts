/**
 * A small reader and writer for the SVG markup copied from the design boards, and the 2D matrix
 * maths the classroom needs. It reads only what the boards use: elements with double-quoted
 * attributes, text inside `<text>`, and comments (dropped). Anything else is an error, so a board
 * that starts using something new fails loudly instead of drawing wrong.
 */

export interface Element {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly MarkupNode[];
}

export interface TextNode {
  readonly text: string;
}

export type MarkupNode = Element | TextNode;

export const isElement = (node: MarkupNode): node is Element => 'tag' in node;

const TOKEN =
  /<!--[\s\S]*?-->|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([\w:-]+)="([^"]*)"/g;

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};
const decode = (s: string) => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e);
const encode = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Open {
  readonly tag: string;
  readonly attrs: Record<string, string>;
  readonly children: MarkupNode[];
}

/** Reads markup into a tree. Whitespace between elements is dropped; text inside `<text>` is kept. */
export function parseMarkup(source: string): MarkupNode[] {
  const root: Open = { tag: '#root', attrs: {}, children: [] };
  const stack: Open[] = [root];
  let consumed = 0;
  for (const match of source.matchAll(TOKEN)) {
    if (match.index !== consumed) {
      throw new Error(`Unreadable markup at ${consumed}: ${source.slice(consumed, consumed + 40)}`);
    }
    consumed = match.index + match[0].length;
    const [whole, closing, opening, attrText, selfClose, text] = match;
    const top = stack.at(-1) ?? root;
    if (whole.startsWith('<!--')) continue;
    if (closing !== undefined) {
      if (top.tag !== closing) throw new Error(`</${closing}> closes <${top.tag}>`);
      stack.pop();
      continue;
    }
    if (opening !== undefined) {
      const attrs: Record<string, string> = {};
      for (const [, name, value] of (attrText ?? '').matchAll(ATTR)) {
        if (name !== undefined) attrs[name] = decode(value ?? '');
      }
      const element: Open = { tag: opening, attrs, children: [] };
      top.children.push(element);
      if (selfClose !== '/') stack.push(element);
      continue;
    }
    if (text !== undefined && (top.tag === 'text' || text.trim() !== '')) {
      if (top.tag !== 'text') throw new Error(`Stray text "${text.trim()}" in <${top.tag}>`);
      top.children.push({ text: decode(text) });
    }
  }
  if (consumed !== source.length) throw new Error(`Unreadable markup at ${consumed}`);
  if (stack.length !== 1) throw new Error(`<${stack.at(-1)?.tag ?? ''}> is never closed`);
  return root.children;
}

/** Writes a tree back as markup, every element with an explicit closing tag as the boards do. */
export function serialize(nodes: readonly MarkupNode[]): string {
  return nodes
    .map((node) => {
      if (!isElement(node)) return encode(node.text);
      const attrs = Object.entries(node.attrs)
        .map(([name, value]) => ` ${name}="${encode(value)}"`)
        .join('');
      return `<${node.tag}${attrs}>${serialize(node.children)}</${node.tag}>`;
    })
    .join('');
}

/** The six numbers of a 2D affine matrix (a, b, c, d, e, f), as in SVG and canvas. */
export type Matrix = readonly [number, number, number, number, number, number];
export type Point = readonly [x: number, y: number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `left` then `right`: the matrix that applies `right` first, then `left`. */
export function multiply(left: Matrix, right: Matrix): Matrix {
  const [a, b, c, d, e, f] = left;
  const [A, B, C, D, E, F] = right;
  return [
    a * A + c * B,
    b * A + d * B,
    a * C + c * D,
    b * C + d * D,
    a * E + c * F + e,
    b * E + d * F + f,
  ];
}

export const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
export const scale = (x: number, y = x): Matrix => [x, 0, 0, y, 0, 0];
export function rotate(degrees: number, cx = 0, cy = 0): Matrix {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const turn: Matrix = [cos, sin, -sin, cos, 0, 0];
  return cx === 0 && cy === 0
    ? turn
    : multiply(translate(cx, cy), multiply(turn, translate(-cx, -cy)));
}

export const applyMatrix = (m: Matrix, [x, y]: Point): Point => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

/** Reads an SVG `transform` attribute: translate, rotate, scale and matrix, in any order. */
export function parseTransform(value: string): Matrix {
  let out = IDENTITY;
  for (const [, name, args] of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const n = (args ?? '')
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s !== '')
      .map(Number);
    if (n.some((v) => !Number.isFinite(v))) throw new Error(`Bad transform: ${value}`);
    const step =
      name === 'translate'
        ? translate(n[0] ?? 0, n[1] ?? 0)
        : name === 'scale'
          ? scale(n[0] ?? 1, n[1] ?? n[0] ?? 1)
          : name === 'rotate'
            ? rotate(n[0] ?? 0, n[1] ?? 0, n[2] ?? 0)
            : name === 'matrix' && n.length === 6
              ? (n as unknown as Matrix)
              : undefined;
    if (!step) throw new Error(`Unknown transform: ${name}`);
    out = multiply(out, step);
  }
  return out;
}

export const formatMatrix = (m: Matrix) =>
  `matrix(${m.map((v) => Math.round(v * 1e6) / 1e6).join(' ')})`;
