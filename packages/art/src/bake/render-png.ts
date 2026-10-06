// Node only: the canvas the baker draws with.
import { createCanvas } from '@napi-rs/canvas';

import { drawCommands } from '../backends/canvas2d';
import { VIEW_SIZE } from '../core/commands';

import type { RenderPng } from './bake';

/** Draws the 200 by 200 drawing space to a square PNG on a transparent ground. */
export const renderPngWithCanvas: RenderPng = (commands, pixels) => {
  const canvas = createCanvas(pixels, pixels);
  const ctx = canvas.getContext('2d');
  ctx.scale(pixels / VIEW_SIZE, pixels / VIEW_SIZE);
  drawCommands(ctx, commands);
  return canvas.toBuffer('image/png');
};
