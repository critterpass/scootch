import {
  ClipOp,
  createPicture,
  FillType,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type SkPaint,
  type SkPicture,
} from '@shopify/react-native-skia';

import type { DrawCommand } from '@scootch/art';

import { toSkiaNodes, type SkiaNode } from '../../art/skia-nodes';

function inked(paint: SkPaint, color: string, opacity: number): SkPaint {
  const [red = 0, green = 0, blue = 0, alpha = 1] = Skia.Color(color);
  paint.setColor(Float32Array.of(red, green, blue, alpha * opacity));
  return paint;
}

function replay(
  canvas: SkCanvas,
  nodes: readonly SkiaNode[],
  fill: SkPaint,
  stroke: SkPaint,
): void {
  for (const node of nodes) {
    if (node.kind === 'group') {
      canvas.save();
      if (node.matrix) {
        // The group's matrix is 4 by 4 in row order; a canvas takes the 3 by 3 of the same move.
        const m = node.matrix;
        const at = (index: number, otherwise: number) => m[index] ?? otherwise;
        canvas.concat(
          Skia.Matrix([at(0, 1), at(1, 0), at(3, 0), at(4, 0), at(5, 1), at(7, 0), 0, 0, 1]),
        );
      }
      if (node.clip !== undefined) {
        const clip = Skia.Path.MakeFromSVGString(node.clip);
        if (clip) canvas.clipPath(clip, ClipOp.Intersect, true);
      }
      replay(canvas, node.children, fill, stroke);
      canvas.restore();
    } else if (node.kind === 'fill') {
      const path = Skia.Path.MakeFromSVGString(node.path);
      if (!path) continue;
      path.setFillType(node.fillType === 'evenOdd' ? FillType.EvenOdd : FillType.Winding);
      canvas.drawPath(path, inked(fill, node.color, node.opacity));
    } else if (node.kind === 'stroke') {
      const path = Skia.Path.MakeFromSVGString(node.path);
      if (!path) continue;
      stroke.setStrokeWidth(node.width);
      canvas.drawPath(path, inked(stroke, node.color, node.opacity));
    }
    // The island has no lettering, so a text node has nothing to draw here.
  }
}

/**
 * A command list recorded once as a Skia picture, at `scale` points to the unit. A picture is
 * replayed by the canvas as one node: sixty residents cost the screen the same as one, and
 * nothing is rebuilt until the list itself changes.
 */
export function recordPicture(commands: readonly DrawCommand[], scale: number): SkPicture {
  const nodes = toSkiaNodes(commands);
  return createPicture((canvas) => {
    const fill = Skia.Paint();
    fill.setAntiAlias(true);
    const stroke = Skia.Paint();
    stroke.setAntiAlias(true);
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeCap(StrokeCap.Round);
    stroke.setStrokeJoin(StrokeJoin.Round);
    canvas.save();
    canvas.scale(scale, scale);
    replay(canvas, nodes, fill, stroke);
    canvas.restore();
  });
}
