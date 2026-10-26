import { describe, expect, it } from '@jest/globals';

import { ell, Pen, type BoilFrame, type DrawCommand, type PathSegment } from '@phusclass/art';

import {
  groupMatrix,
  MAPPED_OPS,
  MAPPED_SEGMENTS,
  svgPath,
  toSkiaNodes,
  type SkiaNode,
} from './skia-nodes';

const SQUARE = [['M', 0, 0], ['L', 10, 0], ['L', 10, 10], ['Z']] as const;

// One command of every kind in the model's union. The record's type makes a kind added to the
// model a compile error here until it has a sample, and the first test then fails until the
// backend maps it.
const ONE_OF_EACH: { readonly [K in DrawCommand['op']]: Extract<DrawCommand, { op: K }> } = {
  save: { op: 'save' },
  restore: { op: 'restore' },
  transform: { op: 'transform', matrix: [1, 2, 3, 4, 5, 6] },
  clip: { op: 'clip', path: SQUARE },
  fill: { op: 'fill', path: SQUARE, color: '#F0562E', alpha: 0.5, rule: 'evenodd' },
  paint: {
    op: 'paint',
    path: SQUARE,
    paint: {
      kind: 'linear',
      from: [0, 0],
      to: [10, 10],
      stops: [
        [0, '#FF69B4', 0.5],
        [1, '#64D7FF', 0],
      ],
    },
    alpha: 0.9,
    blend: 'soft-light',
  },
  stroke: { op: 'stroke', path: SQUARE, color: '#1C1A17', alpha: 0.9, width: 2.8 },
  text: {
    op: 'text',
    text: 'Molar',
    x: 10,
    y: 20,
    font: 'rounded',
    size: 12,
    weight: 700,
    italic: false,
    align: 'left',
    letterSpacing: 0,
    maxWidth: 100,
    color: '#1C1A17',
    alpha: 1,
  },
};

const ONE_SEGMENT_OF_EACH: {
  readonly [K in PathSegment[0]]: Extract<PathSegment, readonly [K, ...number[]]>;
} = {
  M: ['M', 1, 2],
  L: ['L', 3, 4],
  Q: ['Q', 5, 6, 7, 8],
  O: ['O', 10, 20, 5],
  Z: ['Z'],
};

/** Drawings made the way the art package makes them: by its pen, nested in a transform and a clip. */
function sampleDrawings(): DrawCommand[][] {
  const frames: BoilFrame[] = [0, 1, 2];
  return frames.map((frame) => {
    const pen = new Pen(7, frame);
    const blob = ell(100, 100, 40, 30);
    pen.riso(blob, '#F3E6D3', '#E2CDB0', [100, 100], 80, 60);
    pen.fill(ell(90, 95, 6, 6), '#1C1A17');
    pen.line(blob, 2.8);
    return [
      { op: 'save' },
      ONE_OF_EACH.transform,
      ONE_OF_EACH.clip,
      ...pen.commands,
      { op: 'restore' },
      ONE_OF_EACH.fill,
      ONE_OF_EACH.stroke,
    ];
  });
}

function drawn(nodes: readonly SkiaNode[]): SkiaNode[] {
  return nodes.flatMap((node) => (node.kind === 'group' ? drawn(node.children) : [node]));
}

describe('drawing commands as Skia nodes', () => {
  it('maps every command kind and every path segment kind of the model', () => {
    expect([...MAPPED_OPS].sort()).toEqual(Object.keys(ONE_OF_EACH).sort());
    expect([...MAPPED_SEGMENTS].sort()).toEqual(Object.keys(ONE_SEGMENT_OF_EACH).sort());
    for (const command of Object.values(ONE_OF_EACH)) {
      expect(() => toSkiaNodes([command])).not.toThrow();
    }
  });

  it('refuses a command or a segment it has no mapping for, rather than skipping it', () => {
    const unknown = { op: 'glow' } as unknown as DrawCommand;
    expect(() => toSkiaNodes([unknown])).toThrow(/glow/);
    const arc = ['A', 1, 2] as unknown as PathSegment;
    expect(() => svgPath([arc])).toThrow(/"A"/);
  });

  it('draws every fill and stroke of a drawing the art package makes', () => {
    const drawings = sampleDrawings();
    const emitted = new Set(drawings.flatMap((commands) => commands.map((c) => c.op)));
    for (const op of emitted) expect(MAPPED_OPS).toContain(op);

    for (const commands of drawings) {
      const painted = commands.filter((c) => c.op === 'fill' || c.op === 'stroke');
      expect(drawn(toSkiaNodes(commands))).toHaveLength(painted.length);
    }
  });

  it('hands Skia a paint with its colours written out, its blend named and its grain as a frequency', () => {
    const [linear] = toSkiaNodes([ONE_OF_EACH.paint]);
    expect(linear).toEqual({
      kind: 'paint',
      path: 'M0 0L10 0L10 10Z',
      paint: {
        kind: 'linear',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
        colors: ['rgba(255,105,180,0.5)', 'rgba(100,215,255,0)'],
        positions: [0, 1],
      },
      opacity: 0.9,
      blend: 'softLight',
    });
    const [round] = toSkiaNodes([
      {
        ...ONE_OF_EACH.paint,
        blend: 'normal',
        paint: { kind: 'radial', centre: [5, 6], radius: 7, stops: [[0.25, '#FFFFFF', 1]] },
      },
    ]);
    expect(round).toMatchObject({
      blend: 'srcOver',
      paint: { kind: 'radial', centre: { x: 5, y: 6 }, radius: 7, positions: [0.25] },
    });
    const [grain] = toSkiaNodes([{ ...ONE_OF_EACH.paint, paint: { kind: 'grain', size: 4 } }]);
    expect(grain).toMatchObject({ paint: { kind: 'grain', frequency: 0.25 } });
  });

  it('writes each segment kind as SVG path data, a circle as its own closed subpath', () => {
    expect(svgPath(Object.values(ONE_SEGMENT_OF_EACH))).toBe(
      'M1 2L3 4Q5 6 7 8M15 20a5 5 0 1 0 -10 0a5 5 0 1 0 10 0ZZ',
    );
  });

  it('keeps a transform and a clip around exactly what is drawn before the matching restore', () => {
    const { save, restore, transform, clip, fill, stroke } = ONE_OF_EACH;
    const nodes = toSkiaNodes([fill, save, transform, clip, stroke, restore, fill]);

    expect(nodes.map((node) => node.kind)).toEqual(['fill', 'group', 'fill']);
    const moved = nodes[1];
    if (moved?.kind !== 'group') throw new Error('expected the transform to open a group');
    // Canvas order (a, b, c, d, e, f) in the row order of a 4 by 4 matrix.
    expect(moved.matrix).toEqual([1, 3, 0, 5, 2, 4, 0, 6, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(moved.matrix).toEqual(groupMatrix(transform.matrix));
    expect(moved.children).toHaveLength(1);
    const clipped = moved.children[0];
    if (clipped?.kind !== 'group') throw new Error('expected the clip to open a group');
    expect(clipped.clip).toBe('M0 0L10 0L10 10Z');
    expect(clipped.children.map((node) => node.kind)).toEqual(['stroke']);
  });

  it('carries colour, opacity, fill rule and stroke width onto the node', () => {
    const [filled, stroked, plain] = toSkiaNodes([
      ONE_OF_EACH.fill,
      ONE_OF_EACH.stroke,
      { ...ONE_OF_EACH.fill, rule: 'nonzero' },
    ]);
    expect(filled).toEqual({
      kind: 'fill',
      path: 'M0 0L10 0L10 10Z',
      color: '#F0562E',
      opacity: 0.5,
      fillType: 'evenOdd',
    });
    expect(stroked).toEqual({
      kind: 'stroke',
      path: 'M0 0L10 0L10 10Z',
      color: '#1C1A17',
      opacity: 0.9,
      width: 2.8,
    });
    expect(plain).toMatchObject({ fillType: 'winding' });
  });
});
