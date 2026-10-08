// The grounds of the app's ten icons, from the System Surfaces board: an attitude's own colour or
// a card finish's material. `render-app-icon.ts` stands Scootch on each.
import type { SKRSContext2D } from '@napi-rs/canvas';

import type { ScootchMood } from '@scootch/domain';

export const SIZE = 1024;

export type Ground = (ctx: SKRSContext2D) => void;

export const fill = (ctx: SKRSContext2D, style: string | CanvasGradient) => {
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, SIZE, SIZE);
};

export interface AppIcon {
  /** The file name, and the name iOS knows the icon by (src/features/look/icons.ts). */
  readonly name: string;
  readonly mood: ScootchMood;
  readonly ground: Ground;
  /** A dark ground: the marks drawn around Scootch turn light, so they read on it. */
  readonly dark?: boolean;
  /**
   * Where Scootch stands, when not low in the square and cut at the foot: his size as a share of
   * the square, and where the middle of his drawing lands.
   */
  readonly stands?: { readonly scale: number; readonly centre: readonly [number, number] };
}

type Stop = readonly [number, string];

export function radial(
  at: readonly [number, number],
  reach: number,
  stops: readonly Stop[],
): Ground {
  return (ctx) => {
    const gradient = ctx.createRadialGradient(
      SIZE * at[0],
      SIZE * at[1],
      0,
      SIZE * at[0],
      SIZE * at[1],
      SIZE * reach,
    );
    for (const [offset, colour] of stops) gradient.addColorStop(offset, colour);
    fill(ctx, gradient);
  };
}

/** A straight gradient across the square at `degrees`, measured as CSS measures them. */
function linear(degrees: number, stops: readonly Stop[]): Ground {
  return (ctx) => {
    const angle = ((degrees - 90) * Math.PI) / 180;
    const reach = (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))) * (SIZE / 2);
    const [dx, dy] = [Math.cos(angle) * reach, Math.sin(angle) * reach];
    const gradient = ctx.createLinearGradient(
      SIZE / 2 - dx,
      SIZE / 2 - dy,
      SIZE / 2 + dx,
      SIZE / 2 + dy,
    );
    for (const [offset, colour] of stops) gradient.addColorStop(offset, colour);
    fill(ctx, gradient);
  };
}

const all =
  (...grounds: Ground[]): Ground =>
  (ctx) =>
    grounds.forEach((ground) => ground(ctx));

/** Rays from a point low in the square, two yellows turn about. */
const sunburst: Ground = (ctx) => {
  fill(ctx, '#FFD23F');
  const [cx, cy] = [SIZE * 0.5, SIZE * 0.78];
  ctx.fillStyle = '#FFB800';
  for (let ray = 0; ray < 20; ray += 1) {
    const from = ((ray * 18 + 9 - 90) * Math.PI) / 180;
    const to = ((ray * 18 + 18 - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(from) * SIZE * 2, cy + Math.sin(from) * SIZE * 2);
    ctx.lineTo(cx + Math.cos(to) * SIZE * 2, cy + Math.sin(to) * SIZE * 2);
    ctx.closePath();
    ctx.fill();
  }
};

/** A grid of dots, `step` apart, each `radius` across, shifted by `shift`. */
function dots(colour: string, step: number, radius: number, shift = 0): Ground {
  return (ctx) => {
    ctx.fillStyle = colour;
    for (let y = shift; y < SIZE + step; y += step) {
      for (let x = shift; x < SIZE + step; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
}

/** The holo foil: bands of four colours across a pale ground, with a fine sparkle. */
const rainbow: Ground = (ctx) => {
  const colours = ['255,105,180', '100,215,255', '255,235,120', '150,120,255'];
  const stops: Stop[] = [];
  for (let band = 0; band <= 20; band += 1) {
    stops.push([band / 20, `rgba(${colours[band % 4]},0.45)`]);
  }
  linear(115, stops)(ctx);
};

/** Soft blobs of colour seen through frosted glass. */
const frosted: Ground = (ctx) => {
  fill(ctx, '#ECE8E1');
  ctx.save();
  ctx.filter = `blur(${SIZE * 0.13}px) saturate(1.4)`;
  const blob = (x: number, y: number, reach: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(SIZE * x, SIZE * y, SIZE * reach, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(0.18, 0.22, 0.3, 'rgba(240,86,46,0.9)');
  blob(0.85, 0.75, 0.32, 'rgba(110,170,255,0.85)');
  blob(0.7, 0.12, 0.2, 'rgba(255,210,90,0.85)');
  ctx.restore();
  linear(160, [
    [0, 'rgba(255,255,255,0.5)'],
    [0.4, 'rgba(255,255,255,0.1)'],
    [1, 'rgba(255,255,255,0.28)'],
  ])(ctx);
};

const sheen = (strength: number): Ground =>
  linear(115, [
    [0.36, 'rgba(255,255,255,0)'],
    [0.5, `rgba(255,255,255,${strength})`],
    [0.64, 'rgba(255,255,255,0)'],
  ]);

export const ICONS: readonly AppIcon[] = [
  {
    name: 'soft',
    mood: 'asleep',
    ground: radial([0.3, 0.15], 1.1, [
      [0, '#F6F3E8'],
      [0.6, '#DCE6D0'],
      [1, '#C3D3B5'],
    ]),
  },
  {
    // The app's own icon: tomato Scootch, whole, on ink, with a warm glow behind him. Tomato on
    // tomato lost him on the home screen.
    name: 'cheeky',
    mood: 'scheming',
    ground: all(
      (ctx) => fill(ctx, '#1C1A17'),
      radial([0.5, 0.58], 0.55, [
        [0, 'rgba(240,86,46,0.38)'],
        [1, 'rgba(240,86,46,0)'],
      ]),
    ),
    dark: true,
    stands: { scale: 0.98, centre: [0.5, 0.56] },
  },
  { name: 'unhinged', mood: 'dramatic', ground: sunburst },
  { name: 'paper', mood: 'waiting', ground: all((ctx) => fill(ctx, '#FBF8F3'), sheen(0.45)) },
  {
    name: 'holo',
    mood: 'waiting',
    ground: all(
      linear(135, [
        [0, '#F3EDFB'],
        [0.45, '#E6F7F6'],
        [1, '#FBF1E4'],
      ]),
      rainbow,
      dots('rgba(255,255,255,0.85)', SIZE / 11, SIZE / 150),
    ),
  },
  {
    name: 'chrome',
    mood: 'waiting',
    ground: all(
      linear(165, [
        [0, '#FDFDFC'],
        [0.2, '#B9B5AE'],
        [0.36, '#F2EFEA'],
        [0.5, '#5F5B56'],
        [0.62, '#D6D2CC'],
        [0.8, '#8A867F'],
        [1, '#F4F2EE'],
      ]),
      linear(115, [
        [0.38, 'rgba(255,255,255,0)'],
        [0.48, 'rgba(255,255,255,0.8)'],
        [0.58, 'rgba(255,255,255,0)'],
      ]),
    ),
  },
  {
    name: 'jelly',
    mood: 'waiting',
    ground: all(
      radial([0.3, 0.1], 1.15, [
        [0, '#FFC1AD'],
        [0.35, '#F7774F'],
        [0.55, '#F0562E'],
        [1, '#A92F14'],
      ]),
      radial([0.35, 0.1], 0.4, [
        [0, 'rgba(255,255,255,0.7)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    ),
  },
  { name: 'glass', mood: 'waiting', ground: frosted },
  {
    name: 'velvet',
    mood: 'waiting',
    ground: all(
      radial([0.3, 0.2], 0.95, [
        [0, '#3F6E58'],
        [0.55, '#2C5141'],
        [1, '#1F3B2F'],
      ]),
      radial([0.5, 0.5], 0.75, [
        [0.6, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,0.35)'],
      ]),
    ),
  },
  {
    name: 'riso',
    mood: 'waiting',
    ground: all(
      (ctx) => fill(ctx, '#F4EBDA'),
      dots('rgba(240,86,46,0.8)', SIZE / 20, SIZE / 66),
      dots('rgba(52,96,200,0.4)', SIZE / 20, SIZE / 66, SIZE / 40),
      sheen(0.3),
    ),
  },
];
