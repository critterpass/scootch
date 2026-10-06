import { describe, expect, it } from '@jest/globals';

import {
  buildMonster,
  buildScootch,
  MONSTER_BODIES,
  SCOOTCH_MOODS,
  specFromSeed,
  WORK_MODE_ATTACHMENTS,
  type DrawCommand,
  type PathSegment,
} from '@scootch/art';

import {
  groupMatrix,
  MAPPED_OPS,
  MAPPED_SEGMENTS,
  svgPath,
  toSkiaNodes,
  type SkiaNode,
} from './skia-nodes';

type ScootchDrawing = Parameters<typeof buildScootch>[0];
type MonsterBody = keyof typeof MONSTER_BODIES;

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
  stroke: { op: 'stroke', path: SQUARE, color: '#1C1A17', alpha: 0.9, width: 2.8 },
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

/** Every drawing the app can ask the art package for. */
function everyDrawing(): DrawCommand[][] {
  const drawings: DrawCommand[][] = [];
  const attitudes: ScootchDrawing['attitude'][] = ['soft', 'cheeky', 'unhinged'];
  for (const mood of Object.keys(SCOOTCH_MOODS) as ScootchDrawing['mood'][]) {
    for (const attitude of attitudes) {
      const props = { mood, attitude, workMode: null, reducedMotion: false };
      drawings.push(buildScootch(props), buildScootch(props, { blink: 1, bob: 1, beat: 0.5 }));
    }
  }
  for (const workMode of Object.keys(WORK_MODE_ATTACHMENTS) as ScootchDrawing['workMode'][]) {
    const props = { mood: 'working', attitude: 'cheeky', workMode, reducedMotion: false } as const;
    drawings.push(buildScootch(props), buildScootch(props, { beat: 0.5 }));
  }
  for (const body of Object.keys(MONSTER_BODIES) as MonsterBody[]) {
    drawings.push(
      buildMonster(specFromSeed(body, body)),
      buildMonster(specFromSeed(body, 'b'), 0.5),
    );
  }
  return drawings;
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

  it('draws every fill and stroke of every Scootch and monster the art package builds', () => {
    const drawings = everyDrawing();
    const emitted = new Set(drawings.flatMap((commands) => commands.map((c) => c.op)));
    for (const op of emitted) expect(MAPPED_OPS).toContain(op);

    for (const commands of drawings) {
      const painted = commands.filter((c) => c.op === 'fill' || c.op === 'stroke');
      expect(drawn(toSkiaNodes(commands))).toHaveLength(painted.length);
    }
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
