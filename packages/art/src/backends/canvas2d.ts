import type { DrawCommand, Path } from '../core/commands';

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
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  globalAlpha: number;
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

/**
 * Replays drawing commands on a 2D canvas context, in the 200 by 200 drawing space. Scale and
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
      case 'stroke':
        trace(ctx, command.path);
        ctx.globalAlpha = alpha * command.alpha;
        ctx.strokeStyle = command.color;
        ctx.lineWidth = command.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        break;
    }
  }
  ctx.restore();
}
