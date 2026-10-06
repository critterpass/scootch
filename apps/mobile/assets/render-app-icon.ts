/**
 * Draws the placeholder app icon, the Android adaptive icon foreground and the splash image from
 * the art package, into this folder. Run again whenever Scootch's drawing changes:
 *
 *   pnpm --filter @scootch/mobile icons
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import { buildScootch, drawCommands, VIEW_SIZE } from '@scootch/art';

import palettes from '../../../packages/tokens/src/colors.json' with { type: 'json' };

const SIZE = 1024;
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

// The store icon: opaque paper, Scootch filling the square as on the design board.
render('icon.png', { background: palettes.light.page, scale: 1, centre: [0.5, 0.5] });
// Android masks the foreground to its middle two thirds, so Scootch is drawn smaller and centred
// on the body; the paper colour is the adaptive icon's background in app.config.ts.
render('android-icon-foreground.png', { scale: 0.6, centre: [0.5, 0.4] });
// The launch screen shows this at a fixed width over the page colour, light or dark.
render('splash-icon.png', { scale: 1.3, centre: [0.5, 0.345] });
