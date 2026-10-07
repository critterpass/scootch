import type { CardFinish } from '@scootch/domain';

import type { BlendMode, DrawCommand, GradientStop, Path, PathSegment } from '../core/commands';
import type { FinishMaterial, MaterialLayer } from './material';
import * as materials from './materials/index.generated';
import { fill, roundRect, type Box } from './shapes';

/** Every finish of the contract as a material, one file each in the materials folder. */
export const CARD_MATERIALS: Record<CardFinish, FinishMaterial> = materials;

/** How a card is held: its lean about each axis, in degrees. Flat is nought and nought. */
export interface CardLean {
  readonly rx: number;
  readonly ry: number;
}

export const LEVEL: CardLean = { rx: 0, ry: 0 };

/**
 * The board's own numbers. The sheen is laid on a box three times the face, and both it and the
 * glare slide 2.6% of the face for every degree the card leans; the glare rests a fifth above
 * the middle and reaches half way to the far corner.
 */
export const MATERIAL_LIGHT = {
  sheenSize: 3,
  perDegree: 0.026,
  glare: { above: 0.2, alpha: 0.75, reach: 0.5 },
  /** The two screens of sparkle, in points. */
  spark: [
    { step: 13, radius: 1.3, offset: [0, 0], alpha: 0.95 },
    { step: 7, radius: 1.05, offset: [3, 5], alpha: 0.7 },
  ],
  /** One speck of paper tooth, in points. */
  grainSize: 1.2,
} as const;

/** A material laid on one face, as the parts that move differently when the card leans. */
export interface MaterialParts {
  /** Clips everything to the face. Draw every part inside it. */
  readonly clip: Path;
  /** The stock. Still. */
  readonly base: readonly DrawCommand[];
  /** The light, drawn where it rests. Move it by `materialShift(...).sheen`. */
  readonly sheen: readonly DrawCommand[];
  /** Sparkle and grain. Still. */
  readonly over: readonly DrawCommand[];
  /** The glare, drawn where it rests. Move it by `materialShift(...).glare`. */
  readonly glare: readonly DrawCommand[];
  /** The hairline round the edge, drawn last and unclipped. */
  readonly edge: readonly DrawCommand[];
}

const rect = ({ x, y, w, h }: Box): Path => [
  ['M', x, y],
  ['L', x + w, y],
  ['L', x + w, y + h],
  ['L', x, y + h],
  ['Z'],
];

/** The two ends of a CSS linear gradient at `angle` across a box. */
function gradientLine(box: Box, angle: number): [[number, number], [number, number]] {
  const turn = (angle * Math.PI) / 180;
  const dx = Math.sin(turn);
  const dy = -Math.cos(turn);
  const half = (Math.abs(box.w * dx) + Math.abs(box.h * dy)) / 2;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return [
    [cx - dx * half, cy - dy * half],
    [cx + dx * half, cy + dy * half],
  ];
}

const faded = (stops: readonly GradientStop[], by: number): GradientStop[] =>
  stops.map(([offset, color, alpha]) => [offset, color, alpha * by]);

/** A unit square large enough to cover any face once an oval's transform has stretched it. */
const FAR = 60;
const EVERYWHERE: Path = rect({ x: -FAR, y: -FAR, w: FAR * 2, h: FAR * 2 });

/** One layer on one box. `unit` is how many drawing units a point is, for the dots. */
function layer(
  one: MaterialLayer,
  box: Box,
  unit: number,
  strength: number,
  blend: BlendMode,
): DrawCommand[] {
  switch (one.kind) {
    case 'solid':
      return [fill(rect(box), one.color, one.alpha * strength)];
    case 'linear': {
      const [from, to] = gradientLine(box, one.angle);
      return [
        {
          op: 'paint',
          path: rect(box),
          paint: { kind: 'linear', from, to, stops: faded(one.stops, strength) },
          alpha: 1,
          blend,
        },
      ];
    }
    case 'oval':
      // A round gradient of radius one, stretched to the oval and set on its centre.
      return [
        { op: 'save' },
        {
          op: 'transform',
          matrix: [
            one.size[0] * box.w,
            0,
            0,
            one.size[1] * box.h,
            box.x + one.at[0] * box.w,
            box.y + one.at[1] * box.h,
          ],
        },
        {
          op: 'paint',
          path: EVERYWHERE,
          paint: { kind: 'radial', centre: [0, 0], radius: 1, stops: faded(one.stops, strength) },
          alpha: 1,
          blend,
        },
        { op: 'restore' },
      ];
    case 'round': {
      const cx = box.x + one.at[0] * box.w;
      const cy = box.y + one.at[1] * box.h;
      const radius = Math.hypot(
        Math.max(cx - box.x, box.x + box.w - cx),
        Math.max(cy - box.y, box.y + box.h - cy),
      );
      return [
        {
          op: 'paint',
          path: rect(box),
          paint: {
            kind: 'radial',
            centre: [cx, cy],
            radius,
            stops: faded(one.stops, strength),
          },
          alpha: 1,
          blend,
        },
      ];
    }
    case 'dots':
      return [
        fill(
          dots(box, one.step * unit, one.radius * unit, one.offset[0] * unit, one.offset[1] * unit),
          one.color,
          one.alpha * strength,
        ),
      ];
  }
}

/** A screen of dots whose first one sits `dx`, `dy` past half a step from the box's corner. */
function dots(box: Box, step: number, radius: number, dx: number, dy: number): Path {
  const out: PathSegment[] = [];
  for (let y = box.y + step / 2 + (dy % step); y < box.y + box.h + radius; y += step) {
    for (let x = box.x + step / 2 + (dx % step); x < box.x + box.w + radius; x += step) {
      out.push(['O', x, y, radius]);
    }
  }
  return out;
}

/**
 * A material laid on a face, in parts. `unit` is how many drawing units make one point on the
 * board, so sparkle and halftone keep their size when the drawing space is not the board's own.
 */
export function buildMaterialParts(
  face: Box,
  radius: number,
  material: FinishMaterial,
  unit = 1,
): MaterialParts {
  const clip = roundRect(face, radius);
  const { sheenSize, glare, spark, grainSize } = MATERIAL_LIGHT;
  const wide: Box = {
    x: face.x - (face.w * (sheenSize - 1)) / 2,
    y: face.y - (face.h * (sheenSize - 1)) / 2,
    w: face.w * sheenSize,
    h: face.h * sheenSize,
  };
  const over: DrawCommand[] = [];
  if (material.spark > 0) {
    for (const screen of spark) {
      // White in screen is white laid on at its strength, so a plain fill prints the same.
      over.push(
        fill(
          dots(
            face,
            screen.step * unit,
            screen.radius * unit,
            screen.offset[0] * unit,
            screen.offset[1] * unit,
          ),
          '#FFFFFF',
          screen.alpha * material.spark,
        ),
      );
    }
  }
  if (material.grain > 0) {
    over.push({
      op: 'paint',
      path: rect(face),
      paint: { kind: 'grain', size: grainSize * unit },
      alpha: material.grain,
      blend: 'overlay',
    });
  }
  const gx = face.x + face.w / 2;
  const gy = face.y + face.h * (0.5 - glare.above);
  return {
    clip,
    base: material.base.flatMap((one) => layer(one, face, unit, 1, 'normal')),
    sheen: material.sheen.flatMap((one) =>
      layer(one, wide, unit, material.sheenAlpha, material.sheenBlend),
    ),
    over,
    glare: [
      {
        op: 'paint',
        // Wide enough that the glare never shows an edge of its own as it slides.
        path: rect({ x: face.x - face.w, y: face.y - face.h, w: face.w * 3, h: face.h * 3 }),
        paint: {
          kind: 'radial',
          centre: [gx, gy],
          radius: Math.hypot(face.w * 0.5, face.h * (0.5 + glare.above)) * glare.reach,
          stops: [
            [0, '#FFFFFF', glare.alpha],
            [1, '#FFFFFF', 0],
          ],
        },
        alpha: 1,
        blend: 'soft-light',
      },
    ],
    edge: [
      {
        op: 'stroke',
        path: roundRect(
          { x: face.x + unit / 2, y: face.y + unit / 2, w: face.w - unit, h: face.h - unit },
          Math.max(0, radius - unit / 2),
        ),
        color: material.edge[0],
        alpha: material.edge[1],
        width: unit,
      },
    ],
  };
}

/** How far the sheen and the glare have slid for a lean, in drawing units. */
export function materialShift(
  face: Box,
  lean: CardLean,
): { readonly sheen: readonly [number, number]; readonly glare: readonly [number, number] } {
  const { perDegree, sheenSize } = MATERIAL_LIGHT;
  const along = lean.ry * perDegree;
  const up = lean.rx * perDegree;
  return {
    sheen: [-(sheenSize - 1) * face.w * along, (sheenSize - 1) * face.h * up],
    glare: [face.w * along, -face.h * up],
  };
}

const moved = (commands: readonly DrawCommand[], [dx, dy]: readonly [number, number]) =>
  [
    { op: 'save' },
    { op: 'transform', matrix: [1, 0, 0, 1, dx, dy] },
    ...commands,
    { op: 'restore' },
  ] satisfies DrawCommand[];

/**
 * A material on a face as one flat list, for a picture: the stock, the light where the lean puts
 * it, sparkle and grain, the glare and the edge. The number and kinds of commands never depend on
 * the lean.
 */
export function buildMaterial(
  face: Box,
  radius: number,
  material: FinishMaterial,
  options: { readonly lean?: CardLean; readonly unit?: number } = {},
): DrawCommand[] {
  const parts = buildMaterialParts(face, radius, material, options.unit ?? 1);
  const shift = materialShift(face, options.lean ?? LEVEL);
  return [
    { op: 'save' },
    { op: 'clip', path: parts.clip },
    ...parts.base,
    ...moved(parts.sheen, shift.sheen),
    ...parts.over,
    ...moved(parts.glare, shift.glare),
    { op: 'restore' },
    ...parts.edge,
  ];
}

/** The soft shadow a card throws on what is under it: a few widening, fading copies of its shape. */
export function buildCardShadow(
  face: Box,
  radius: number,
  material: FinishMaterial,
  unit = 1,
): DrawCommand[] {
  const [color, alpha] = material.shadow;
  const steps = 6;
  return Array.from({ length: steps }, (_, index) => {
    const spread = (index + 1) * 2.5 * unit;
    return fill(
      roundRect(
        {
          x: face.x + 6 * unit - spread,
          y: face.y + 14 * unit - spread / 2,
          w: face.w - 12 * unit + spread * 2,
          h: face.h - 8 * unit + spread,
        },
        radius + spread,
      ),
      color,
      (alpha * 0.32) / (index + 1),
    );
  });
}
