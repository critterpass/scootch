/**
 * Draws six loops as strips of eight frames, side by side, for looking at the motion without a
 * phone: Scootch idle, listening, two work modes, a monster idle and the hatch entrance.
 *
 *   pnpm --filter @scootch/art motion [folder]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';

import {
  buildMonster,
  buildScootch,
  drawCommands,
  eggWobble,
  EGG_WOBBLE_SECONDS,
  GROUND_Y,
  hatchPop,
  HATCH_POP_SECONDS,
  MOOD_LOOP_SECONDS,
  monsterIdle,
  moodBeat,
  scootchIdle,
  specFromSeed,
  VIEW_SIZE,
  WORK_LOOPS,
  workLoop,
  type DrawCommand,
} from '../src/index';

const FRAMES = 8;
const CELL = 220;
const LABEL = 26;
const FEET = { x: VIEW_SIZE / 2, y: GROUND_Y };

type Draw = (ctx: SKRSContext2D, t: number) => void;

/** Replays a command list under a transform about the feet, the way the app moves a character. */
function about(
  ctx: SKRSContext2D,
  commands: readonly DrawCommand[],
  move: { scaleX?: number; scaleY?: number; rotate?: number; lift?: number; alpha?: number },
): void {
  ctx.save();
  ctx.globalAlpha = move.alpha ?? 1;
  ctx.translate(FEET.x, FEET.y + (move.lift ?? 0));
  ctx.rotate(move.rotate ?? 0);
  ctx.scale(move.scaleX ?? 1, move.scaleY ?? 1);
  ctx.translate(-FEET.x, -FEET.y);
  drawCommands(ctx, commands);
  ctx.restore();
}

function strip(name: string, seconds: number, draw: Draw, folder: string): void {
  const canvas = createCanvas(FRAMES * CELL, CELL + LABEL);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F6F3EE';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < FRAMES; i++) {
    const t = (i / FRAMES) * seconds;
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * CELL, 0, CELL, CELL + LABEL);
    ctx.clip();
    ctx.fillStyle = '#6F6A62';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${name}  ${t.toFixed(2)}s`, i * CELL + 8, 17);
    ctx.strokeStyle = '#DED6CA';
    ctx.strokeRect(i * CELL + 0.5, LABEL + 0.5, CELL - 1, CELL - 1);
    ctx.translate(i * CELL, LABEL);
    ctx.scale(CELL / VIEW_SIZE, CELL / VIEW_SIZE);
    draw(ctx, t);
    ctx.restore();
  }
  const file = path.join(folder, `${name}.png`);
  writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(file);
}

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), 'scootch-motion'));
mkdirSync(folder, { recursive: true });

const cheeky = { attitude: 'cheeky', workMode: null, reducedMotion: false } as const;

// Twelve seconds of idle: long enough to catch a blink and a glance for this seed.
strip(
  'scootch-idle',
  12,
  (ctx, t) => {
    drawCommands(ctx, buildScootch({ ...cheeky, mood: 'bargaining' }, scootchIdle(t, 'scootch')));
  },
  folder,
);

strip(
  'scootch-listening',
  MOOD_LOOP_SECONDS.listening ?? 1,
  (ctx, t) => {
    const idle = scootchIdle(t, 'scootch');
    const motion = { ...idle, beat: moodBeat('listening', t) };
    drawCommands(ctx, buildScootch({ ...cheeky, mood: 'listening' }, motion));
  },
  folder,
);

for (const workMode of ['cooking', 'decluttering'] as const) {
  strip(
    `work-${workMode}`,
    WORK_LOOPS[workMode].seconds,
    (ctx, t) => {
      const props = { ...cheeky, mood: 'working', workMode } as const;
      drawCommands(ctx, buildScootch(props, { work: workLoop(workMode, t) }));
    },
    folder,
  );
}

const spec = specFromSeed('kettle', 'the tax return');
const monster = buildMonster(spec);
strip(
  'monster-idle',
  9,
  (ctx, t) => {
    const idle = monsterIdle(t, spec.seed);
    about(ctx, monster, { lift: idle.bob, rotate: idle.sway });
  },
  folder,
);

// The egg wobbles once, then the monster pops in.
strip(
  'hatch-entrance',
  EGG_WOBBLE_SECONDS + HATCH_POP_SECONDS + 0.2,
  (ctx, t) => {
    if (t < EGG_WOBBLE_SECONDS) {
      ctx.save();
      ctx.translate(FEET.x, FEET.y);
      ctx.rotate((eggWobble(t) * Math.PI) / 180);
      ctx.fillStyle = '#DED6CA';
      ctx.beginPath();
      ctx.ellipse(0, -46, 36, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const pop = hatchPop(t - EGG_WOBBLE_SECONDS);
    about(ctx, monster, { scaleX: pop.scale, scaleY: pop.scale, alpha: pop.opacity });
  },
  folder,
);
