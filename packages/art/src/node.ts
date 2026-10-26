// The Node side of the package: PNG exports for share images and link previews. Kept out of the
// main entry, so the app never bundles the native canvas.
import { createCanvas } from '@napi-rs/canvas';

import { canvasFont, drawCommands } from './backends/canvas2d';
import type { DrawCommand } from './core/commands';
import type { MeasureText } from './core/text';

const ruler = createCanvas(1, 1).getContext('2d');

/** Measures text the way the canvas backend draws it. */
export const measureWithCanvas: MeasureText = (text, style) => {
  ruler.font = canvasFont({ ...style, italic: style.italic ?? false });
  ruler.letterSpacing = '0px';
  return ruler.measureText(text).width + [...text].length * (style.tracking ?? 0) * style.size;
};

/** A drawing made in its own `width` by `height` space. */
export interface Picture {
  readonly width: number;
  readonly height: number;
  readonly commands: readonly DrawCommand[];
}

/** A picture as a PNG `pixels` wide, at the picture's own ratio, on a transparent ground. */
export function renderPicturePng(picture: Picture, pixels: number): Buffer {
  const scale = pixels / picture.width;
  const canvas = createCanvas(pixels, Math.round(picture.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawCommands(ctx, picture.commands);
  return canvas.toBuffer('image/png');
}
