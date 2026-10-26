/**
 * The geometry box of board shapes, as CSS's `transform-box: fill-box` measures it: the shape
 * itself, without its stroke or the control points of its curves. The boards turn their moving
 * parts about a point given as a fraction of this box; the classroom keeps those points.
 */
import { isElement, type Element } from './markup';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

type Acc = { minX: number; minY: number; maxX: number; maxY: number };

const add = (acc: Acc, x: number, y: number) => {
  acc.minX = Math.min(acc.minX, x);
  acc.minY = Math.min(acc.minY, y);
  acc.maxX = Math.max(acc.maxX, x);
  acc.maxY = Math.max(acc.maxY, y);
};

const STEPS = 64;

/** Walks an SVG path's outline (M L H V C S Q T Z, absolute and relative), sampling the curves. */
function pathPoints(d: string, acc: Acc) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastCtrl: [number, number] | null = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const token = tokens[i] ?? '';
    if (/[a-zA-Z]/.test(token)) {
      cmd = token;
      i += 1;
    }
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + num();
        y = oy + num();
        startX = x;
        startY = y;
        add(acc, x, y);
        cmd = rel ? 'l' : 'L';
        lastCtrl = null;
        break;
      case 'L':
        x = ox + num();
        y = oy + num();
        add(acc, x, y);
        lastCtrl = null;
        break;
      case 'H':
        x = (rel ? x : 0) + num();
        add(acc, x, y);
        lastCtrl = null;
        break;
      case 'V':
        y = (rel ? y : 0) + num();
        add(acc, x, y);
        lastCtrl = null;
        break;
      case 'C':
      case 'S': {
        const c1: [number, number] =
          cmd.toUpperCase() === 'C'
            ? [ox + num(), oy + num()]
            : lastCtrl
              ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]]
              : [x, y];
        const c2: [number, number] = [ox + num(), oy + num()];
        const end: [number, number] = [ox + num(), oy + num()];
        for (let s = 1; s <= STEPS; s += 1) {
          const t = s / STEPS;
          const u = 1 - t;
          add(
            acc,
            u * u * u * x + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
            u * u * u * y + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
          );
        }
        lastCtrl = c2;
        [x, y] = end;
        break;
      }
      case 'Q': {
        const c: [number, number] = [ox + num(), oy + num()];
        const end: [number, number] = [ox + num(), oy + num()];
        for (let s = 1; s <= STEPS; s += 1) {
          const t = s / STEPS;
          const u = 1 - t;
          add(
            acc,
            u * u * x + 2 * u * t * c[0] + t * t * end[0],
            u * u * y + 2 * u * t * c[1] + t * t * end[1],
          );
        }
        lastCtrl = null;
        [x, y] = end;
        break;
      }
      case 'Z':
        x = startX;
        y = startY;
        lastCtrl = null;
        break;
      default:
        throw new Error(`Path command ${cmd} is not measured`);
    }
  }
}

function measure(element: Element, acc: Acc) {
  const a = element.attrs;
  const n = (k: string) => Number(a[k] ?? 0);
  if (a.transform) throw new Error('A transformed shape is not measured');
  switch (element.tag) {
    case 'rect':
      add(acc, n('x'), n('y'));
      add(acc, n('x') + n('width'), n('y') + n('height'));
      return;
    case 'circle':
      add(acc, n('cx') - n('r'), n('cy') - n('r'));
      add(acc, n('cx') + n('r'), n('cy') + n('r'));
      return;
    case 'ellipse':
      add(acc, n('cx') - n('rx'), n('cy') - n('ry'));
      add(acc, n('cx') + n('rx'), n('cy') + n('ry'));
      return;
    case 'path':
      pathPoints(a.d ?? '', acc);
      return;
    case 'g':
      for (const child of element.children) if (isElement(child)) measure(child, acc);
      return;
    default:
      throw new Error(`<${element.tag}> is not measured`);
  }
}

export function fillBox(element: Element): Box {
  const acc: Acc = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  measure(element, acc);
  return { x: acc.minX, y: acc.minY, w: acc.maxX - acc.minX, h: acc.maxY - acc.minY };
}

/** A point given as fractions of the box, as `transform-origin: 50% 100%` is. */
export const boxPoint = (box: Box, fx: number, fy: number): readonly [number, number] => [
  Math.round((box.x + box.w * fx) * 100) / 100,
  Math.round((box.y + box.h * fy) * 100) / 100,
];
