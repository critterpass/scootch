import type { DrawCommand, Path } from '../core/commands';
import type { CardFinishInks } from './finish';
import { fill, roundRect, type Box } from './shapes';

/** Where the light falls: -1 to 1 on each axis, 0 with the card held flat. */
export interface CardTilt {
  readonly x: number;
  readonly y: number;
}

export const FLAT: CardTilt = { x: 0, y: 0 };

/** The band runs across the card at this angle, as the design's 115 degree gradient does. */
const AXIS = [Math.sin((115 * Math.PI) / 180), -Math.cos((115 * Math.PI) / 180)] as const;
/** Where each foil colour sits along the band, and how strong it is; the band fades out at 0 and 1. */
const STOPS = [
  [0.26, 0.55],
  [0.38, 0.55],
  [0.5, 0.5],
  [0.62, 0.5],
  [0.74, 0.5],
] as const;
const STRIPES = 32;
const GLARE_RINGS = 8;

const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

function mix(a: string, b: string, t: number): string {
  const part = (i: number): string =>
    Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${part(0)}${part(1)}${part(2)}`;
}

/** The colour and strength of the band at `t`, 0 to 1 across it. */
function bandAt(t: number, colors: CardFinishInks['foil']): [color: string, alpha: number] {
  const first = STOPS[0];
  const last = STOPS[STOPS.length - 1] ?? first;
  if (t <= first[0]) return [colors[0], (first[1] * t) / first[0]];
  if (t >= last[0]) return [colors[4], (last[1] * (1 - t)) / (1 - last[0])];
  for (let i = 1; i < STOPS.length; i++) {
    const from = STOPS[i - 1] ?? first;
    const to = STOPS[i] ?? last;
    if (t <= to[0]) {
      const k = (t - from[0]) / (to[0] - from[0]);
      const a = colors[i - 1] ?? colors[0];
      const b = colors[i] ?? colors[4];
      return [mix(a, b, k), from[1] + (to[1] - from[1]) * k];
    }
  }
  return [colors[4], 0];
}

const clamp = (value: number): number => Math.min(1, Math.max(-1, value));

/**
 * The foil over a card face: a band of colour across it and a soft glare, clipped to the face. The
 * tilt moves both; flat, they sit where the design shows them. The number and kinds of commands
 * never depend on the tilt or the finish.
 */
export function buildFoil(
  face: Box,
  radius: number,
  inks: CardFinishInks,
  tilt: CardTilt,
): DrawCommand[] {
  const tx = clamp(tilt.x);
  const ty = clamp(tilt.y);
  const cx = face.x + face.w * (0.5 + tx * 0.5);
  const cy = face.y + face.h * (0.5 + ty * 0.5);
  const length = 1.3 * (face.w * Math.abs(AXIS[0]) + face.h * Math.abs(AXIS[1]));
  const reach = face.w + face.h;
  const commands: DrawCommand[] = [{ op: 'save' }, { op: 'clip', path: roundRect(face, radius) }];

  for (let i = 0; i < STRIPES; i++) {
    const [color, alpha] = bandAt((i + 0.5) / STRIPES, inks.foil);
    const from = (i / STRIPES - 0.5) * length;
    const to = ((i + 1) / STRIPES - 0.5) * length;
    const at = (along: number, across: number): readonly [number, number] => [
      cx + AXIS[0] * along - AXIS[1] * across,
      cy + AXIS[1] * along + AXIS[0] * across,
    ];
    const path: Path = [
      ['M', ...at(from, -reach)],
      ['L', ...at(to, -reach)],
      ['L', ...at(to, reach)],
      ['L', ...at(from, reach)],
      ['Z'],
    ];
    commands.push(fill(path, color, alpha * inks.foilAlpha));
  }

  const gx = face.x + face.w * (0.5 + tx * 0.5);
  const gy = face.y + face.h * (0.3 + ty * 0.5);
  const glareRadius = Math.hypot(face.w, face.h) * 0.36;
  for (let i = GLARE_RINGS; i >= 1; i--) {
    const ring: Path = [['O', gx, gy, (glareRadius * i) / GLARE_RINGS]];
    commands.push(fill(ring, inks.glare, inks.foilAlpha * 0.09));
  }
  commands.push({ op: 'restore' });
  return commands;
}
