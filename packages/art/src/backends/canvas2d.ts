import type { BlendMode, DrawCommand, FontRole, GradientStop, Paint, Path } from '../core/commands';
import { rgba } from '../core/rgba';

/** A gradient as a canvas hands it out. */
export interface CanvasGradient2D {
  addColorStop(offset: number, color: string): void;
}

/**
 * The part of a 2D canvas context the drawing needs. A browser canvas, an offscreen canvas and the
 * Node canvas libraries all satisfy it.
 */
export interface Canvas2D {
  save(): void;
  restore(): void;
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  closePath(): void;
  clip(): void;
  fill(rule?: 'nonzero' | 'evenodd'): void;
  stroke(): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient2D;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient2D;
  globalCompositeOperation: string;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  globalAlpha: number;
  fillText(text: string, x: number, y: number): void;
  font: string;
  textAlign: string;
  textBaseline: string;
  /** Not every canvas has it; where it is missing, spaced labels draw a little tighter. */
  letterSpacing?: string;
}

/** The families each font role resolves to on a canvas, first available wins. */
export const CANVAS_FONT_FAMILIES: Record<FontRole, string> = {
  rounded: "'SF Pro Rounded', 'Nunito', 'Arial Rounded MT Bold', 'Helvetica Neue', sans-serif",
  sans: "'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
};

/** The CSS font string of a piece of text, for drawing and for measuring it the same way. */
export function canvasFont(style: {
  readonly font: FontRole;
  readonly size: number;
  readonly weight: number;
  readonly italic: boolean;
}): string {
  return `${style.italic ? 'italic ' : ''}${style.weight} ${style.size}px ${CANVAS_FONT_FAMILIES[style.font]}`;
}

function trace(ctx: Canvas2D, path: Path): void {
  ctx.beginPath();
  for (const segment of path) {
    switch (segment[0]) {
      case 'M':
        ctx.moveTo(segment[1], segment[2]);
        break;
      case 'L':
        ctx.lineTo(segment[1], segment[2]);
        break;
      case 'Q':
        ctx.quadraticCurveTo(segment[1], segment[2], segment[3], segment[4]);
        break;
      case 'O':
        ctx.moveTo(segment[1] + segment[3], segment[2]);
        ctx.arc(segment[1], segment[2], segment[3], 0, Math.PI * 2);
        ctx.closePath();
        break;
      case 'Z':
        ctx.closePath();
        break;
    }
  }
}

const COMPOSITE: Record<BlendMode, string> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  'soft-light': 'soft-light',
};

function withStops(gradient: CanvasGradient2D, stops: readonly GradientStop[]): CanvasGradient2D {
  for (const [offset, color, alpha] of stops) gradient.addColorStop(offset, rgba(color, alpha));
  return gradient;
}

/** The canvas's own gradient for a paint; `null` for grain, which a 2D canvas cannot make. */
function gradientOf(ctx: Canvas2D, paint: Paint): CanvasGradient2D | null {
  if (paint.kind === 'linear') {
    return withStops(ctx.createLinearGradient(...paint.from, ...paint.to), paint.stops);
  }
  if (paint.kind === 'radial') {
    const [x, y] = paint.centre;
    return withStops(ctx.createRadialGradient(x, y, 0, x, y, paint.radius), paint.stops);
  }
  return null;
}

/**
 * Replays drawing commands on a 2D canvas context, in the drawing space of the list. Scale and
 * place the context first; its state is left as it was found.
 */
export function drawCommands(ctx: Canvas2D, commands: readonly DrawCommand[]): void {
  const alpha = ctx.globalAlpha;
  ctx.save();
  for (const command of commands) {
    switch (command.op) {
      case 'save':
        ctx.save();
        break;
      case 'restore':
        ctx.restore();
        break;
      case 'transform':
        ctx.transform(...command.matrix);
        break;
      case 'clip':
        trace(ctx, command.path);
        ctx.clip();
        break;
      case 'fill':
        trace(ctx, command.path);
        ctx.globalAlpha = alpha * command.alpha;
        ctx.fillStyle = command.color;
        ctx.fill(command.rule);
        break;
      case 'paint': {
        // A 2D canvas has no noise of its own: the grain is left off and the stock prints smooth.
        const gradient = gradientOf(ctx, command.paint);
        if (gradient === null) break;
        trace(ctx, command.path);
        ctx.globalAlpha = alpha * command.alpha;
        ctx.globalCompositeOperation = COMPOSITE[command.blend];
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.globalCompositeOperation = COMPOSITE.normal;
        break;
      }
      case 'stroke':
        trace(ctx, command.path);
        ctx.globalAlpha = alpha * command.alpha;
        ctx.strokeStyle = command.color;
        ctx.lineWidth = command.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        break;
      case 'text':
        ctx.globalAlpha = alpha * command.alpha;
        ctx.fillStyle = command.color;
        ctx.font = canvasFont(command);
        ctx.textAlign = command.align;
        ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${command.letterSpacing}px`;
        ctx.fillText(command.text, command.x, command.y);
        break;
    }
  }
  ctx.restore();
}
