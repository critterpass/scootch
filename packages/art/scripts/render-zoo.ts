/**
 * Draws a contact sheet: every body once, hatched from the seed the Characters board uses for it,
 * then one monster at four sizes. For looking at the generator beside the design.
 *
 *   pnpm --filter @scootch/art zoo [output.png]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';

import {
  buildMonster,
  drawCommands,
  type MONSTER_BODIES,
  specFromSeed,
  VIEW_SIZE,
} from '../src/index';

/** The seed each body carries in the monster zoo of the Characters board, in board order. */
const BOARD_SEEDS: Record<keyof typeof MONSTER_BODIES, string> = {
  tooth: 'dentist',
  envelope: 'council',
  bubble: 'sam',
  receipt: 'taxes',
  scroll: 'lease',
  slime: 'grout',
  sock: 'socks',
  dust: 'shelf-dust',
  phone: 'mum',
  weed: 'garden',
  beetle: 'login',
  pot: 'dishes',
  bolt: 'wobble',
  clock: 'car',
  kettle: 'gym',
  splat: 'poster',
  note: 'piano',
  hairball: 'dog',
  box: 'shoes',
  pillow: 'nap',
};
const SHRINK_STEPS = [1, 0.78, 0.62, 0.46];

const columns = 5;
const cell = 240;
const label = 28;
const bodies = Object.entries(BOARD_SEEDS) as [keyof typeof MONSTER_BODIES, string][];
const rows = Math.ceil(bodies.length / columns) + 1;

const canvas = createCanvas(columns * cell, rows * (cell + label));
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#F6F3EE';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.font = '16px sans-serif';
ctx.textAlign = 'center';

function drawCell(index: number, commands: ReturnType<typeof buildMonster>, text: string): void {
  const x = (index % columns) * cell;
  const y = Math.floor(index / columns) * (cell + label);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(cell / VIEW_SIZE, cell / VIEW_SIZE);
  drawCommands(ctx, commands);
  ctx.restore();
  ctx.fillStyle = '#6F6A62';
  ctx.fillText(text, x + cell / 2, y + cell + 16);
}

bodies.forEach(([bodyType, seed], i) => {
  drawCell(i, buildMonster(specFromSeed(bodyType, seed)), `${bodyType} · ${seed}`);
});
const shrinking = specFromSeed('envelope', 'council');
SHRINK_STEPS.forEach((size, i) => {
  drawCell(bodies.length + i, buildMonster({ ...shrinking, size }), `envelope at ${size}`);
});

const output = path.resolve(process.argv[2] ?? path.join(tmpdir(), 'scootch-monster-zoo.png'));
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, canvas.toBuffer('image/png'));
console.log(output);
