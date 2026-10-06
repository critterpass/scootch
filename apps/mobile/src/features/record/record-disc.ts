import { buildMonster, VIEW_SIZE, type DrawCommand, type Path } from '@scootch/art';
import type { MonsterSpec } from '@scootch/domain';

import { fill, placedIn, stroke } from '../world/piece-kit';

/** The record is drawn in a square of this side. */
export const DISC_SPACE = 200;
const CENTRE = DISC_SPACE / 2;
const DISC_RADIUS = 92;
const RING_RADIUS = 43;
const LABEL_RADIUS = 37;
const SEGMENTS = 7;
/** The gap between two segments of the ring, in degrees. */
const GAP_DEG = 3;

const TOMATO = '#F0562E';
const VINYL = '#1B1816';
const GROOVE = '#26221F';
const UNLIT = '#4A433D';
const HOLE = '#F6F3EE';

/** An arc of the ring as a line of short steps, clockwise from twelve o'clock. */
function arc(fromDeg: number, toDeg: number): Path {
  const points: [number, number][] = [];
  for (let deg = fromDeg; deg <= toDeg; deg += 4) {
    const angle = ((deg - 90) * Math.PI) / 180;
    points.push([CENTRE + Math.cos(angle) * RING_RADIUS, CENTRE + Math.sin(angle) * RING_RADIUS]);
  }
  return points.map(([x, y], index) => [index === 0 ? 'M' : 'L', x, y] as const);
}

/**
 * The record: the vinyl, a ring with one segment lit for each bar the week has, and a label whose
 * cover is printed from the monsters that played on it. A week with no monsters has a plain label.
 */
export function recordDiscCommands(barCount: number, cover: readonly MonsterSpec[]): DrawCommand[] {
  const commands: DrawCommand[] = [fill([['O', CENTRE, CENTRE, DISC_RADIUS]], VINYL)];
  for (let radius = 50; radius < DISC_RADIUS; radius += 5) {
    commands.push(stroke([['O', CENTRE, CENTRE, radius]], GROOVE, 1.4));
  }
  for (let index = 0; index < SEGMENTS; index += 1) {
    const from = (index / SEGMENTS) * 360 + GAP_DEG / 2;
    const to = ((index + 1) / SEGMENTS) * 360 - GAP_DEG / 2;
    commands.push(stroke(arc(from, to), index < barCount ? TOMATO : UNLIT, 5));
  }
  commands.push(fill([['O', CENTRE, CENTRE, LABEL_RADIUS]], TOMATO));

  // The cover: up to seven monsters standing in a row across the label, the first in the middle.
  const band = cover.slice(0, SEGMENTS);
  const size = band.length <= 1 ? 46 : Math.max(18, 62 / Math.sqrt(band.length));
  const step =
    band.length <= 1 ? 0 : Math.min(size * 0.7, (LABEL_RADIUS * 1.5 - size) / (band.length - 1));
  commands.push({ op: 'save' }, { op: 'clip', path: [['O', CENTRE, CENTRE, LABEL_RADIUS]] });
  band.forEach((spec, index) => {
    const x = CENTRE - size / 2 + (index - (band.length - 1) / 2) * step;
    commands.push(...placedIn(buildMonster(spec), x, CENTRE - size * 0.55, size, VIEW_SIZE));
  });
  commands.push({ op: 'restore' }, fill([['O', CENTRE, CENTRE, 2.6]], HOLE));
  return commands;
}
