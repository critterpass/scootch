import type { DrawCommand, Matrix, Path, PathSegment } from '@scootch/art';

/**
 * What the Skia canvas draws, as plain data: the art package's flat command list turned into the
 * tree Skia's declarative nodes need. Nothing here touches Skia itself, so the mapping can be
 * checked without a canvas.
 */
export type SkiaNode =
  | {
      readonly kind: 'group';
      /** A 4 by 4 matrix in row order, as Skia's group takes it. */
      readonly matrix?: readonly number[];
      /** An SVG path that clips everything inside the group. */
      readonly clip?: string;
      readonly children: readonly SkiaNode[];
    }
  | {
      readonly kind: 'fill';
      readonly path: string;
      readonly color: string;
      readonly opacity: number;
      readonly fillType: 'winding' | 'evenOdd';
    }
  | {
      /** Round caps and round joins, always. */
      readonly kind: 'stroke';
      readonly path: string;
      readonly color: string;
      readonly opacity: number;
      readonly width: number;
    }
  | {
      /** One line, already wrapped and fitted by the art package. `y` is the baseline. */
      readonly kind: 'text';
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly font: 'rounded' | 'sans';
      readonly size: number;
      readonly weight: number;
      readonly italic: boolean;
      readonly align: 'left' | 'center' | 'right';
      readonly letterSpacing: number;
      readonly color: string;
      readonly opacity: number;
    };

type Group = Extract<SkiaNode, { kind: 'group' }> & { children: SkiaNode[] };

type SegmentKind = PathSegment[0];
type SegmentWriters = {
  readonly [K in SegmentKind]: (segment: Extract<PathSegment, readonly [K, ...number[]]>) => string;
};

/** One writer per path segment kind; a new kind in the model does not compile until it is here. */
const SEGMENT_WRITERS: SegmentWriters = {
  M: ([, x, y]) => `M${x} ${y}`,
  L: ([, x, y]) => `L${x} ${y}`,
  Q: ([, cx, cy, x, y]) => `Q${cx} ${cy} ${x} ${y}`,
  // A full circle as two half arcs, closed, the way the SVG backend writes it.
  O: ([, x, y, r]) => `M${x + r} ${y}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`,
  Z: () => 'Z',
};

export const MAPPED_SEGMENTS = Object.keys(SEGMENT_WRITERS);

function writeSegment(segment: PathSegment): string {
  const write = SEGMENT_WRITERS[segment[0]] as ((segment: PathSegment) => string) | undefined;
  if (!write) throw new Error(`No Skia mapping for the path segment "${String(segment[0])}"`);
  return write(segment);
}

/** The path as SVG path data, which Skia parses natively. */
export function svgPath(path: Path): string {
  return path.map(writeSegment).join('');
}

/** Canvas order (a, b, c, d, e, f) to the 4 by 4 row-order matrix of a Skia group. */
export function groupMatrix([a, b, c, d, e, f]: Matrix): number[] {
  return [a, c, 0, e, b, d, 0, f, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * Where the commands are being written. A save remembers the current group; a transform or a clip
 * opens a group inside the current one, which then holds everything up to the matching restore.
 */
class Tree {
  readonly root: Group = { kind: 'group', children: [] };
  private current: Group = this.root;
  private readonly saved: Group[] = [];

  add(node: SkiaNode): void {
    this.current.children.push(node);
  }

  open(group: Group): void {
    this.current.children.push(group);
    this.current = group;
  }

  save(): void {
    this.saved.push(this.current);
  }

  restore(): void {
    this.current = this.saved.pop() ?? this.root;
  }
}

type Mappers = {
  readonly [K in DrawCommand['op']]: (command: Extract<DrawCommand, { op: K }>, tree: Tree) => void;
};

/** One mapper per command kind; a new kind in the model does not compile until it is here. */
const MAPPERS: Mappers = {
  save: (_command, tree) => tree.save(),
  restore: (_command, tree) => tree.restore(),
  transform: (command, tree) =>
    tree.open({ kind: 'group', matrix: groupMatrix(command.matrix), children: [] }),
  clip: (command, tree) => tree.open({ kind: 'group', clip: svgPath(command.path), children: [] }),
  fill: (command, tree) =>
    tree.add({
      kind: 'fill',
      path: svgPath(command.path),
      color: command.color,
      opacity: command.alpha,
      fillType: command.rule === 'evenodd' ? 'evenOdd' : 'winding',
    }),
  stroke: (command, tree) =>
    tree.add({
      kind: 'stroke',
      path: svgPath(command.path),
      color: command.color,
      opacity: command.alpha,
      width: command.width,
    }),
  text: (command, tree) =>
    tree.add({
      kind: 'text',
      text: command.text,
      x: command.x,
      y: command.y,
      font: command.font,
      size: command.size,
      weight: command.weight,
      italic: command.italic,
      align: command.align,
      letterSpacing: command.letterSpacing,
      color: command.color,
      opacity: command.alpha,
    }),
};

/** The command kinds this backend draws. */
export const MAPPED_OPS = Object.keys(MAPPERS);

/**
 * Turns a command list into the nodes a Skia canvas draws, in the same 200 by 200 space. Pure: the
 * same list always gives the same tree. A command kind without a mapper throws rather than being
 * skipped, so a drawing is never silently missing a part.
 */
export function toSkiaNodes(commands: readonly DrawCommand[]): readonly SkiaNode[] {
  const tree = new Tree();
  for (const command of commands) {
    const map = MAPPERS[command.op] as ((command: DrawCommand, tree: Tree) => void) | undefined;
    if (!map) throw new Error(`No Skia mapping for the drawing command "${String(command.op)}"`);
    map(command, tree);
  }
  return tree.root.children;
}
