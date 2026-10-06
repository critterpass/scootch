import type { ScootchMood, ScootchProps } from '@scootch/domain';

import { GROUND_Y, type DrawCommand } from '../core/commands';
import { bez, ell, ribbon, type Point } from '../core/geometry';
import { Pen } from '../core/pen';
import { strHash } from '../core/rng';
import { drawEffect, drawLaptop } from './effects';
import {
  ACTING,
  applyMotion,
  neutral,
  scaleActing,
  type MoodPose,
  type ScootchMotion,
} from './expression';
import { drawBrow, drawEye, drawMouth } from './face';
import * as moods from './moods/index.generated';
import { SCOOTCH } from './palette';
import { WORK_MODE_ATTACHMENTS } from './work-mode-attachment';
import type { ScootchFrame, WorkModeAttachment } from './work-mode-kit';

/** Every mood of the contract, one file each in the moods folder. */
export const SCOOTCH_MOODS: Record<ScootchMood, MoodPose> = moods;

const PEN_SEED = strHash('scootch');
const EYE_RADIUS = 13.5;
const SIDES = [-1, 1] as const;
const NO_MOTION: ScootchMotion = {};
const WORK_MODES: Partial<Record<string, WorkModeAttachment>> = WORK_MODE_ATTACHMENTS;

/** Scootch's outline: an egg, wider at the bottom, that leans from the top. */
function bodyPts(cx: number, cy: number, rx: number, ry: number, lean: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    let x = Math.cos(a);
    let y = Math.sin(a);
    if (y > 0) {
      y *= 0.8;
      x *= 1 + 0.07 * y;
    } else x *= 1 - 0.1 * y * y;
    const k = 1 + 0.012 * Math.sin(3 * a) + 0.008 * Math.sin(5 * a);
    pts.push([cx + x * rx * k + Math.max(0, -y) * lean * 1.2, cy + y * ry * k]);
  }
  return pts;
}

/** An arm from the shoulder to the hand, bowed outwards, with the hand on its end. */
function drawArm(pen: Pen, side: -1 | 1, shoulder: Point, hand: Point): void {
  const dx = hand[0] - shoulder[0];
  const dy = hand[1] - shoulder[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * side * 6;
  const ny = (dx / length) * side * 6;
  const centre = bez(
    shoulder,
    [shoulder[0] + dx * 0.3 + nx, shoulder[1] + dy * 0.3 + ny],
    [shoulder[0] + dx * 0.7 + nx * 0.5, shoulder[1] + dy * 0.7 + ny * 0.5],
    hand,
    8,
  );
  pen.fill(ribbon(centre, 4.4, 3.4, 0.6), SCOOTCH.shade);
  pen.fill(ell(hand[0], hand[1], 6.2, 5.6, 12), SCOOTCH.shade);
}

/**
 * Describes Scootch as drawing commands, in the same 200 by 200 space as the monsters. Pure: the
 * same props and motion always give the same list.
 *
 * Without `motion` the drawing is the rest frame of the mood, or of the work mode when the mood is
 * `working` and a mode is given, which is also its Reduce Motion form; with `reducedMotion` set,
 * `motion` is ignored. A missing or unknown work mode draws the plain desk and laptop. Attitude sets how big the acting is and never
 * what Scootch looks like; the serious mood takes no attitude.
 */
export function buildScootch(
  props: ScootchProps,
  motion: ScootchMotion = NO_MOTION,
): DrawCommand[] {
  const moving = props.reducedMotion ? NO_MOTION : motion;
  const beat = Math.min(1, Math.max(0, moving.beat ?? 0));
  const serious = props.mood === 'serious';
  const act = serious ? 1 : ACTING[props.attitude];
  const attachment =
    props.mood === 'working' && props.workMode ? WORK_MODES[props.workMode] : undefined;
  const loop = moving.work;

  const e = { ...neutral(), ...SCOOTCH_MOODS[props.mood](act, beat) };
  if (attachment) {
    e.fx = null;
    e.mouth = 'smile';
    e.mw = 0.7;
    attachment.pose(e, loop);
  }
  scaleActing(e, act);
  applyMotion(e, moving);

  const pen = new Pen(PEN_SEED);
  const rx = 58 * e.sx;
  const ry = 50 * e.sy;
  const cx = 100 + e.lean;
  const cy = GROUND_Y - ry * 0.8 + e.dy - 2;
  const by = GROUND_Y + e.dy;
  const hand = (side: -1 | 1, [hx, hy]: readonly [number, number]): Point => [
    cx + side * hx * rx,
    cy + hy * ry,
  ];
  const faceX = cx + e.lx * 4;
  const faceY = cy + e.ly * 2.5;
  const frame: ScootchFrame = {
    cx,
    cy,
    rx,
    ry,
    by,
    top: cy - ry - 22,
    leftHand: hand(-1, e.hl),
    rightHand: hand(1, e.hr),
    faceX,
    faceY,
    eyeY: faceY + ry * 0.04,
    eyeGap: rx * 0.36,
  };

  pen.fill(ell(100, GROUND_Y + 2, 50 * (1 - e.bounce * 0.45), 5, 14), SCOOTCH.ink, 0.2, 0.08);
  attachment?.behind(pen, frame, loop);

  const cos = Math.cos(e.rot);
  const sin = Math.sin(e.rot);
  pen.commands.push(
    { op: 'save' },
    {
      op: 'transform',
      matrix: [cos, sin, -sin, cos, cx - cx * cos + by * sin, by - cx * sin - by * cos],
    },
  );

  for (const side of SIDES) pen.fill(ell(cx + side * 22, by - 4, 11, 6.5, 12), SCOOTCH.shade);
  const curlX = cx + e.lean * 1.2;
  const curlY = cy - ry + 4;
  const tip = e.tip - e.lean * 0.6;
  const curl = bez(
    [curlX - 2, curlY + 6],
    [curlX - 1, curlY - 10],
    [curlX + 15 + tip, curlY - 16 + e.tip * 0.3],
    [curlX + 12 + tip, curlY - 4],
    8,
  );
  pen.fill(ribbon(curl, 6, 2.2, 1.5), SCOOTCH.body);
  pen.riso(bodyPts(cx, cy, rx, ry, e.lean * 0.4), SCOOTCH.body, SCOOTCH.shade, [cx, cy], 70, 60, {
    offset: 9,
    grains: 120,
  });
  pen.line(
    [
      [cx - rx * 0.62, cy - ry * 0.38],
      [cx - rx * 0.48, cy - ry * 0.62],
      [cx - rx * 0.3, cy - ry * 0.76],
    ],
    4,
    SCOOTCH.highlight,
    0.38,
    0.9,
  );

  for (const side of SIDES) {
    const blush = ell(faceX + side * rx * 0.6, faceY + ry * 0.34, 7.5 * e.blush, 4.4 * e.blush, 12);
    pen.fill(blush, SCOOTCH.blush, 0.2);
  }
  for (const side of SIDES) {
    drawEye(pen, e, faceX + side * frame.eyeGap, frame.eyeY, side, EYE_RADIUS);
  }
  if (e.brows) {
    for (const side of SIDES) {
      const brow = e.brows[side === -1 ? 0 : 1];
      drawBrow(pen, brow, faceX + side * frame.eyeGap, frame.eyeY, side, EYE_RADIUS);
    }
  }
  drawMouth(pen, e, faceX + e.mx * 14, faceY + ry * 0.44);

  attachment?.accessory(pen, frame, loop);
  if (attachment) attachment.prop(pen, frame, loop);
  else if (e.fx === 'laptop') drawLaptop(pen, frame);
  drawArm(pen, -1, [cx - rx * 0.86, cy + ry * 0.16], frame.leftHand);
  drawArm(pen, 1, [cx + rx * 0.86, cy + ry * 0.16], frame.rightHand);
  attachment?.held(pen, frame, loop);
  drawEffect(pen, e, frame, beat);
  attachment?.effect(pen, frame, loop);

  pen.commands.push({ op: 'restore' });
  return pen.commands;
}
