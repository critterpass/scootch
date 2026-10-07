import * as bodies from '../monsters/index.generated';
import { monsterHop, monsterIdle } from '../motion/monster-idle';
import type { BodyFrame, MonsterBody } from './body';
import { GROUND_Y, type DrawCommand } from './commands';
import { drawEye, drawMoodMouth, drawMouth, drawShutEye, type EyeLook } from './face';
import { drop, ell } from './geometry';
import { INKS } from './inks';
import { drawAntennae, drawHorns, drawLegs, LEG_HEIGHT } from './parts';
import { INK, Pen, WHITE, type BoilFrame } from './pen';
import { hash, strHash } from './rng';
import type { MonsterBodyType, MonsterMood, MonsterSpec } from './spec';

/** Every body type, one file each in the monsters folder. */
export const MONSTER_BODIES: Record<MonsterBodyType, MonsterBody> = bodies;

/** The point a monster shrinks towards: its feet. */
const ANCHOR = { x: 100, y: 174 } as const;

/** The seeded dice of one monster: the same seed and slot always roll the same value. */
export function seededRoll(seed: string): (slot: number) => number {
  const base = strHash(seed);
  return (slot) => hash(base + slot * 101);
}

const SWEAT = '#9FC4DE';

/** What a monster is doing and when. Everything left out gives the still. */
export interface MonsterLife {
  /** `idle` stands there; `nervous` shakes, wide-eyed and sweating; `caught` sleeps. */
  readonly mood?: MonsterMood;
  /**
   * Seconds it has been alive on screen. Drives the bob (or the hop, or the hover), the drifting
   * eyes and blink, swaying stalks and whatever its body does: a ringing phone, a rattling lid.
   */
  readonly t?: number;
  /** Which of the three stroke sets to draw with. Zero, the still, when absent. */
  readonly boil?: BoilFrame;
  /** Leaves out the drifting letter of a caught monster, as in a crowd of them. */
  readonly quiet?: boolean;
}

/**
 * Describes one monster as drawing commands. Pure: the same spec, size factor and life always give
 * the same list. The first two commands are a save and the scale; nothing else depends on size, so
 * a shrunken monster is the same monster, smaller, standing on the same spot. Its shadow stays on
 * the ground while the body bobs, hops or shakes above it.
 *
 * @param sizeFactor An extra scale on top of `spec.size`, for drawing a shrink step before the
 *   new size is stored.
 */
export function buildMonster(
  spec: MonsterSpec,
  sizeFactor = 1,
  life: MonsterLife = {},
): DrawCommand[] {
  const body = MONSTER_BODIES[spec.bodyType];
  const ink = INKS[spec.ink];
  const seed = strHash(spec.seed);
  const roll = seededRoll(spec.seed);
  const pen = new Pen(seed, life.boil ?? 0);
  const t = Math.max(0, life.t ?? 0);
  const nervous = life.mood === 'nervous';
  const caught = life.mood === 'caught';

  const scale = spec.size * sizeFactor;
  pen.commands.push(
    { op: 'save' },
    {
      op: 'transform',
      matrix: [scale, 0, 0, scale, ANCHOR.x * (1 - scale), ANCHOR.y * (1 - scale)],
    },
  );

  const idle = monsterIdle(t, spec.seed, body.hover === true);
  // Asleep it sits down on its tucked legs and only breathes; awake it bobs, hovers or hops.
  const lift = caught ? 3 + Math.sin(t * 1.2) : body.hop ? monsterHop(t, spec.seed) : idle.bob;
  const standing = caught ? 0 : LEG_HEIGHT[spec.legs] + (body.hover ? 7 : 0);
  const w = body.width * 1.12 * (0.9 + roll(12) * 0.2);
  const h = body.height * 1.12 * (0.9 + roll(13) * 0.2);
  const cx = 100 + (nervous ? Math.sin(t * 40) * 1.6 : 0);
  const y1 = GROUND_Y - standing + lift;
  const y0 = y1 - h;
  const frame: BodyFrame = { cx, y0, y1, w, h, seed, t, caught };

  pen.fill(ell(100, GROUND_Y + 2, w * 0.46 * (body.hover ? 0.7 : 1), 5, 14), INK, 0.2, 0.08);
  // Asleep, the legs are tucked away.
  if (!caught) drawLegs(pen, spec.legs, frame, ink, 2 + Math.floor(roll(4) * 2));
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
  const open = body.sleepy ? 0.38 : 0.55 + roll(18) * 0.25;
  const look: EyeLook = nervous
    ? { open: 1.15, tilt: 0, gaze: Math.sin(t * 9) * 0.5, gazeY: -0.2, pupil: 0.42 }
    : {
        open: open + (0.06 - open) * idle.blink,
        tilt: roll(19) > 0.5 ? 0.35 : -0.2,
        gaze: Math.sin(t * 0.7 + roll(9) * 6) * 0.6,
        pupil: 0.5 + roll(21) * 0.12,
      };
  for (let i = 0; i < count; i++) {
    const r = eyeRadius * (mismatched ? (i === 0 ? 1.25 : 0.78) : 1);
    const ex = count === 1 ? fx : fx - fw * 0.32 + i * ((fw * 0.64) / (count - 1));
    let ey = fy - (count === 3 && i === 1 ? r * 0.7 : 0);
    if (stalks) {
      ey = y0 - 12 - i * 3;
      // The stalks sway; the still is taken with them upright.
      const sway = (Math.sin(t * 2 + i) - Math.sin(i)) * 3;
      pen.line(
        [
          [ex, y0 + 6],
          [ex + sway, ey],
        ],
        2.6,
        ink.shade,
      );
    }
    if (caught) drawShutEye(pen, ex, ey, r, stalks || ink.light ? INK : WHITE);
    else drawEye(pen, look, ex, ey, i < count / 2 ? -1 : 1, r, ink.body);
  }
  const mouthY = (stalks ? fy - 4 : fy + eyeRadius * 1.25) + 6;
  const mouthWidth = Math.min(fw * 0.36, 18);
  if (caught || nervous) {
    drawMoodMouth(pen, caught ? 'caught' : 'nervous', fx, mouthY, mouthWidth, ink);
  } else drawMouth(pen, spec.mouth, fx, mouthY, mouthWidth, ink);

  if (nervous) pen.fill(drop(cx + w * 0.5, y0 + 6 + Math.sin(t * 3) * 2, 1), SWEAT, 0.2);
  if (caught && life.quiet !== true) {
    const k = (t * 0.6) % 1;
    const x = cx + w * 0.45 + k * 10;
    const y = y0 - 6 - k * 16;
    pen.line(
      [
        [x - 6, y - 6],
        [x + 6, y - 6],
        [x - 6, y + 6],
        [x + 6, y + 6],
      ],
      2.4,
      INK,
      0.38,
      1 - k,
    );
  }

  pen.commands.push({ op: 'restore' });
  return pen.commands;
}
