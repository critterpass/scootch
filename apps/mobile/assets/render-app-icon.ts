/**
 * Draws the app's ten icons (three attitudes, seven finishes), each in Default, Dark and Tinted,
 * with the small copies the icon picker shows, the Android adaptive icon foreground and the
 * splash image, from the art package into this folder. Run again whenever Scootch's drawing or
 * an icon's ground changes:
 *
 *   pnpm --filter @scootch/mobile icons
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import { buildScootch, drawCommands, VIEW_SIZE } from '@scootch/art';

import { fill, ICONS, radial, SIZE, type AppIcon } from './app-icon-grounds';

const scootch = buildScootch({
  mood: 'waiting',
  attitude: 'cheeky',
  workMode: null,
  reducedMotion: true,
});

interface Layout {
  /** Fills the square first; left out, the image keeps a transparent background. */
  background?: string;
  /** Width of the 200-unit drawing space as a share of the image. */
  scale: number;
  /** Where the middle of the drawing space lands, as shares of the image. */
  centre: readonly [number, number];
}

function render(file: string, { background, scale, centre }: Layout): void {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  if (background !== undefined) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
  const unit = (SIZE * scale) / VIEW_SIZE;
  ctx.translate(
    SIZE * centre[0] - (VIEW_SIZE / 2) * unit,
    SIZE * centre[1] - (VIEW_SIZE / 2) * unit,
  );
  ctx.scale(unit, unit);
  drawCommands(ctx, scootch);
  const output = path.join(import.meta.dirname, file);
  writeFileSync(output, canvas.toBuffer('image/png'));
  console.log(output);
}

// Android masks the foreground to its middle two thirds, so Scootch is drawn smaller and centred
// on the body; the paper colour is the adaptive icon's background in app.config.ts.
render('android-icon-foreground.png', { scale: 0.6, centre: [0.5, 0.4] });
// The launch screen shows this at a fixed width over the page colour, light or dark.
render('splash-icon.png', { scale: 1.3, centre: [0.5, 0.345] });

// The ten icons, from the System Surfaces board: Scootch low in the square, on a ground that is
// the attitude's own colour or the card finish's material.

/** Scootch stands low in the square, as on the board: a little larger than it, cut at the foot. */
const STANDS = { scale: 1.13, centre: [0.5, 0.612] } as const;

type Variant = 'default' | 'dark' | 'tinted';

/**
 * One icon in one of the three ways iOS shows it. Dark keeps the ground's colour under a deep
 * shade; Tinted is Scootch alone in greys on black, which the system colours itself.
 */
function drawIcon(icon: AppIcon, variant: Variant, pixels: number): Buffer {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  if (variant === 'tinted') {
    fill(ctx, '#000000');
  } else {
    icon.ground(ctx);
    if (variant === 'dark') {
      fill(ctx, 'rgba(18,15,13,0.72)');
      radial([0.3, 0.15], 1.1, [
        [0, 'rgba(255,255,255,0.08)'],
        [1, 'rgba(0,0,0,0.25)'],
      ])(ctx);
    }
  }
  const stands = icon.stands ?? STANDS;
  const unit = (SIZE * stands.scale) / VIEW_SIZE;
  ctx.save();
  ctx.translate(
    SIZE * stands.centre[0] - (VIEW_SIZE / 2) * unit,
    SIZE * stands.centre[1] - (VIEW_SIZE / 2) * unit,
  );
  ctx.scale(unit, unit);
  drawCommands(
    ctx,
    buildScootch(
      { mood: icon.mood, attitude: 'cheeky', workMode: null, reducedMotion: true },
      undefined,
      { ground: icon.dark === true ? 'dark' : 'light' },
    ),
  );
  ctx.restore();
  if (variant === 'tinted') {
    const image = ctx.getImageData(0, 0, SIZE, SIZE);
    const { data } = image;
    for (let at = 0; at < data.length; at += 4) {
      const grey =
        0.299 * (data[at] ?? 0) + 0.587 * (data[at + 1] ?? 0) + 0.114 * (data[at + 2] ?? 0);
      // Lifted, so the body reads as a mid grey the tint can take.
      const lifted = Math.min(255, grey * 1.35);
      data[at] = lifted;
      data[at + 1] = lifted;
      data[at + 2] = lifted;
    }
    ctx.putImageData(image, 0, 0);
  }
  if (pixels === SIZE) return canvas.toBuffer('image/png');
  const small = createCanvas(pixels, pixels);
  small.getContext('2d').drawImage(canvas, 0, 0, pixels, pixels);
  return small.toBuffer('image/png');
}

/** The side of the copies the icon picker shows: three times its largest tile. */
const PREVIEW = 372;
const folder = path.join(import.meta.dirname, 'icons');
mkdirSync(path.join(folder, 'preview'), { recursive: true });
for (const icon of ICONS) {
  for (const variant of ['default', 'dark', 'tinted'] as const) {
    const file = path.join(folder, `${icon.name}${variant === 'default' ? '' : `-${variant}`}.png`);
    writeFileSync(file, drawIcon(icon, variant, SIZE));
    console.log(file);
  }
  writeFileSync(
    path.join(folder, 'preview', `${icon.name}.png`),
    drawIcon(icon, 'default', PREVIEW),
  );
}
// The store icon and the one a fresh install shows: Cheeky, the attitude a phone starts with.
writeFileSync(
  path.join(import.meta.dirname, 'icon.png'),
  drawIcon(ICONS[1] as AppIcon, 'default', SIZE),
);
