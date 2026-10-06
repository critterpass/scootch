/**
 * Draws a contact sheet of Scootch: one row per mood, one column per attitude. For looking at the
 * character beside the design.
 *
 *   pnpm --filter @scootch/art scootch [output.png]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import { attitudeSchema, scootchMoodSchema } from '@scootch/domain';

import { buildScootch, drawCommands, VIEW_SIZE } from '../src/index';

const moods = scootchMoodSchema.options;
const attitudes = attitudeSchema.options;

const cell = 300;
const label = 30;
const margin = 130;

const canvas = createCanvas(margin + attitudes.length * cell, label + moods.length * cell);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#F6F3EE';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = '18px sans-serif';
ctx.fillStyle = '#6F6A62';

ctx.textAlign = 'center';
attitudes.forEach((attitude, column) => {
  ctx.fillText(attitude, margin + column * cell + cell / 2, 21);
});
moods.forEach((mood, row) => {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6F6A62';
  ctx.fillText(mood, 14, label + row * cell + cell / 2);
  attitudes.forEach((attitude, column) => {
    ctx.save();
    ctx.translate(margin + column * cell, label + row * cell);
    ctx.scale(cell / VIEW_SIZE, cell / VIEW_SIZE);
    drawCommands(ctx, buildScootch({ mood, attitude, workMode: null, reducedMotion: false }));
    ctx.restore();
  });
});

const output = path.resolve(process.argv[2] ?? path.join(tmpdir(), 'scootch-moods.png'));
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
