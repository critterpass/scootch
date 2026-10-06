/**
 * Draws a labelled contact sheet of Scootch in every work mode, at rest, with the plain working
 * pose last. For looking at the modes beside the design.
 *
 *   pnpm --filter @scootch/art work-modes [output.png]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import { WORK_MODE_IDS, type WorkMode } from '@scootch/domain';

import { buildScootch, drawCommands, VIEW_SIZE } from '../src/index';

const cells: readonly (WorkMode | null)[] = [...WORK_MODE_IDS, null];
const columns = 6;
const cell = 300;
const label = 34;
const rows = Math.ceil(cells.length / columns);

const canvas = createCanvas(columns * cell, rows * (cell + label));
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#F6F3EE';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = '20px sans-serif';
ctx.textAlign = 'center';

cells.forEach((workMode, index) => {
  const x = (index % columns) * cell;
  const y = Math.floor(index / columns) * (cell + label);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(cell / VIEW_SIZE, cell / VIEW_SIZE);
  drawCommands(
    ctx,
    buildScootch({ mood: 'working', attitude: 'cheeky', workMode, reducedMotion: true }),
  );
  ctx.restore();
  ctx.fillStyle = '#6F6A62';
  ctx.fillText(workMode ?? 'no mode (plain)', x + cell / 2, y + cell + 20);
});

const output = path.resolve(process.argv[2] ?? path.join(tmpdir(), 'scootch-work-modes.png'));
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
