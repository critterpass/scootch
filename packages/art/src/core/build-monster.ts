import * as bodies from '../monsters/index.generated';
import type { BodyFrame, MonsterBody } from './body';
import { GROUND_Y, type DrawCommand } from './commands';
import { drawEye, drawMouth, type EyeLook } from './face';
import { ell } from './geometry';
import { INKS } from './inks';
import { drawAntennae, drawHorns, drawLegs, LEG_HEIGHT } from './parts';
import { INK, Pen } from './pen';
import { hash, strHash } from './rng';
import type { MonsterBodyType, MonsterSpec } from './spec';

/** Every body type, one file each in the monsters folder. */
export const MONSTER_BODIES: Record<MonsterBodyType, MonsterBody> = bodies;

/** The point a monster shrinks towards: its feet. */
const ANCHOR = { x: 100, y: 174 } as const;

/** The seeded dice of one monster: the same seed and slot always roll the same value. */
export function seededRoll(seed: string): (slot: number) => number {
  const base = strHash(seed);
  return (slot) => hash(base + slot * 101);
}

/**
 * Describes one monster as drawing commands. Pure: the same spec and size factor always give the
 * same list. The first two commands are a save and the scale; nothing else depends on size, so a
 * shrunken monster is the same monster, smaller, standing on the same spot.
 *
 * @param sizeFactor An extra scale on top of `spec.size`, for drawing a shrink step before the
 *   new size is stored.
 */
export function buildMonster(spec: MonsterSpec, sizeFactor = 1): DrawCommand[] {
  const body = MONSTER_BODIES[spec.bodyType];
  const ink = INKS[spec.ink];
  const seed = strHash(spec.seed);
  const roll = seededRoll(spec.seed);
  const pen = new Pen(seed);

  const scale = spec.size * sizeFactor;
  pen.commands.push(
    { op: 'save' },
    {
      op: 'transform',
      matrix: [scale, 0, 0, scale, ANCHOR.x * (1 - scale), ANCHOR.y * (1 - scale)],
    },
  );

  const w = body.width * 1.12 * (0.9 + roll(12) * 0.2);
  const h = body.height * 1.12 * (0.9 + roll(13) * 0.2);
  const cx = 100;
  const y1 = GROUND_Y - LEG_HEIGHT[spec.legs] - (body.hover ? 7 : 0);
  const y0 = y1 - h;
  const frame: BodyFrame = { cx, y0, y1, w, h, seed, t: 0 };

  pen.fill(ell(cx, GROUND_Y + 2, w * 0.46 * (body.hover ? 0.7 : 1), 5, 14), INK, 0.2, 0.08);
  drawLegs(pen, spec.legs, frame, ink, 2 + Math.floor(roll(4) * 2));
  body.under?.(pen, frame, ink);
  if (body.tops) {
    drawHorns(pen, spec.horns, frame);
    drawAntennae(pen, spec.antennae, frame, ink);
  }
  pen.riso(body.outline(frame), ink.body, ink.shade, [cx, y0 + h / 2], w, h);
  body.deco?.(pen, frame, ink);

  const [fx, fy] = body.face(frame);
  const fw = w * body.faceWidth;
  // Three eyes do not fit a narrow face.
  const count = fw < 40 && spec.eyes.count > 2 ? 2 : spec.eyes.count;
  const eyeRadius = (count === 1 ? 15 : count === 2 ? 11 : 8.5) * Math.min(1.1, fw / 62);
  const mismatched = spec.eyes.style === 'mismatched' && count === 2;
  const stalks = spec.eyes.style === 'stalks' && count <= 2 && body.tops;
  const look: EyeLook = {
    open: body.sleepy ? 0.38 : 0.55 + roll(18) * 0.25,
    tilt: roll(19) > 0.5 ? 0.35 : -0.2,
    gaze: Math.sin(roll(9) * 6) * 0.6,
    pupil: 0.5 + roll(21) * 0.12,
  };
  for (let i = 0; i < count; i++) {
    const r = eyeRadius * (mismatched ? (i === 0 ? 1.25 : 0.78) : 1);
    const ex = count === 1 ? fx : fx - fw * 0.32 + i * ((fw * 0.64) / (count - 1));
    let ey = fy - (count === 3 && i === 1 ? r * 0.7 : 0);
    if (stalks) {
      ey = y0 - 12 - i * 3;
      pen.line(
        [
          [ex, y0 + 6],
          [ex, ey],
        ],
        2.6,
        ink.shade,
      );
    }
    drawEye(pen, look, ex, ey, i < count / 2 ? -1 : 1, r, ink.body);
  }
  const mouthY = (stalks ? fy - 4 : fy + eyeRadius * 1.25) + 6;
  drawMouth(pen, spec.mouth, fx, mouthY, Math.min(fw * 0.36, 18), ink);

  pen.commands.push({ op: 'restore' });
  return pen.commands;
}
