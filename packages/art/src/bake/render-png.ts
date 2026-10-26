// Node only: the canvas the baker draws with.
import { createCanvas, Image } from '@napi-rs/canvas';

import { drawCommands } from '../backends/canvas2d';
import { VIEW_SIZE } from '../core/commands';

import type { RenderDrawing, RenderPng } from './bake';

/** Draws the 200 by 200 drawing space to a square PNG on a transparent ground. */
export const renderPngWithCanvas: RenderPng = (commands, pixels) => {
  const canvas = createCanvas(pixels, pixels);
  const ctx = canvas.getContext('2d');
  ctx.scale(pixels / VIEW_SIZE, pixels / VIEW_SIZE);
  drawCommands(ctx, commands);
  return canvas.toBuffer('image/png');
};

/** The document at a pixel size, so Skia's SVG module draws it at full resolution. */
function sized(svg: string, width: number, height: number): string {
  return svg.replace(
    /^<svg ([^>]*?)width="[^"]*" height="[^"]*"/,
    `<svg $1width="${width}" height="${height}"`,
  );
}

/**
 * Draws a board drawing with Skia's SVG module, the one the app draws the classroom with. A glow
 * is the drawing's own silhouette, blurred in the glow's colour and laid under it twice, so the
 * edge is clear but soft. Both looks keep the same framing, so nothing shifts between them.
 */
export const renderDrawingWithCanvas: RenderDrawing = (look, width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const image = new Image();
  image.src = Buffer.from(sized(look.svg, width, height));
  if (look.glow !== undefined) {
    ctx.save();
    ctx.shadowColor = look.glow;
    ctx.shadowBlur = Math.max(1, Math.round(width * 0.02));
    ctx.drawImage(image, 0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toBuffer('image/png');
};
