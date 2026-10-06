// The Node side of the package: PNG exports for share images and link previews. Kept out of the
// main entry, so the app never bundles the native canvas.
import { createCanvas } from '@napi-rs/canvas';
import type { CardData } from '@scootch/domain';

import { canvasFont, drawCommands } from './backends/canvas2d';
import {
  buildCard,
  CARD_BLEED,
  CARD_HEIGHT,
  CARD_WIDTH,
  type CardOptions,
} from './card/build-card';
import { buildStory, type StoryFormat, type StoryOptions } from './card/build-story';
import type { DrawCommand } from './core/commands';
import type { MeasureText } from './core/text';

const ruler = createCanvas(1, 1).getContext('2d');

/** Measures text the way the canvas backend draws it. */
export const measureWithCanvas: MeasureText = (text, style) => {
  ruler.font = canvasFont({ ...style, italic: style.italic ?? false });
  ruler.letterSpacing = '0px';
  return ruler.measureText(text).width + [...text].length * (style.tracking ?? 0) * style.size;
};

interface Placement {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

function renderPng(commands: readonly DrawCommand[], at: Placement): Buffer {
  const canvas = createCanvas(at.width, at.height);
  const ctx = canvas.getContext('2d');
  ctx.translate(at.x, at.y);
  ctx.scale(at.scale, at.scale);
  drawCommands(ctx, commands);
  return canvas.toBuffer('image/png');
}

/**
 * One card as a PNG `width` pixels wide, at the card's own ratio, on a transparent ground. The
 * card sits a little inside the image, so the stamp that hangs over its edge is not cut off.
 */
export function renderCardPng(data: CardData, options: CardOptions, width: number): Buffer {
  const height = Math.round((width * CARD_HEIGHT) / CARD_WIDTH);
  const scale = width / (CARD_WIDTH + CARD_BLEED * 2);
  return renderPng(buildCard(data, { measure: measureWithCanvas, ...options }), {
    width,
    height,
    scale,
    x: CARD_BLEED * scale,
    y: (height - CARD_HEIGHT * scale) / 2,
  });
}

/** The share story of a catch as a PNG `width` pixels wide, at 4:5 or 9:16. */
export function renderStoryPng(
  data: CardData,
  format: StoryFormat,
  options: StoryOptions,
  width: number,
): Buffer {
  const story = buildStory(data, format, { measure: measureWithCanvas, ...options });
  const scale = width / story.width;
  return renderPng(story.commands, {
    width,
    height: Math.round(story.height * scale),
    scale,
    x: 0,
    y: 0,
  });
}
