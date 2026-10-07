/**
 * Draws every loop as a strip of twelve frames, side by side, for looking at the motion without a
 * phone: each mood as the app moves it (idle, beat, clock and boil together), work modes, monsters
 * idle, nervous and caught, the three boil frames enlarged and the hatch entrance. With `--frames`
 * it also writes each loop's frames one by one, for making an animated preview.
 *
 *   pnpm --filter @scootch/art motion [folder] [--frames]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';

import {
  boilFrame,
  buildMonster,
  buildScootch,
  drawCommands,
  eggWobble,
  EGG_WOBBLE_SECONDS,
  GROUND_Y,
  hatchPop,
  HATCH_POP_SECONDS,
  MOOD_LOOP_SECONDS,
  moodBeat,
  scootchIdle,
  specFromSeed,
  VIEW_SIZE,
  WORK_LOOPS,
  workLoop,
  type DrawCommand,
} from '../src/index';

const FRAMES = 12;
const CELL = 160;
/** Frames a second of the one-by-one export. */
const PREVIEW_FPS = 24;
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

/** Each frame of a loop as its own image, at the rate the app draws them. */
function frames(name: string, seconds: number, draw: Draw, folder: string): void {
  const out = path.join(folder, 'frames', name);
  mkdirSync(out, { recursive: true });
  const count = Math.min(96, Math.round(seconds * PREVIEW_FPS));
  for (let i = 0; i < count; i++) {
    const canvas = createCanvas(VIEW_SIZE, VIEW_SIZE);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F6F3EE';
    ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);
    draw(ctx, i / PREVIEW_FPS);
    writeFileSync(
      path.join(out, `${String(i).padStart(3, '0')}.png`),
      canvas.toBuffer('image/png'),
    );
  }
}

function strip(name: string, seconds: number, draw: Draw, folder: string): void {
  if (process.argv.includes('--frames')) frames(name, seconds, draw, folder);
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

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const folder = path.resolve(args[0] ?? path.join(tmpdir(), 'scootch-motion'));
mkdirSync(folder, { recursive: true });

const cheeky = { attitude: 'cheeky', workMode: null, reducedMotion: false } as const;
type Mood = Parameters<typeof buildScootch>[0]['mood'];

/** Scootch as the app moves it: idle, the mood's beat, its clock and the boil, all at once. */
function alive(mood: Mood, t: number, hat: 'beret' | null = null): DrawCommand[] {
  const motion = { ...scootchIdle(t, 'scootch'), beat: moodBeat(mood, t), time: t };
  return buildScootch({ ...cheeky, mood, hat }, motion, { boil: boilFrame(t) });
}

// Twelve seconds of idle: long enough to catch a blink and a glance for this seed.
strip('scootch-idle', 12, (ctx, t) => drawCommands(ctx, alive('bargaining', t)), folder);

const MOOD_STRIPS: readonly (readonly [Mood, number])[] = [
  ['waiting', 2.5],
  ['listening', 2.6],
  ['bargaining', 2.6],
  ['working', 0.8],
  ['stuck', 2],
  ['celebrating', (MOOD_LOOP_SECONDS.celebrating ?? 1) * 2],
  ['pleased', 2.1],
  ['asleep', 5.2],
  ['scheming', 4.2],
  ['dramatic', 2.4],
  ['sulk', 1.8],
  ['nudge', 1.4],
  ['shocked', 0.5],
];
for (const [mood, seconds] of MOOD_STRIPS) {
  // Each strip starts a moment in, so its first frame is already moving.
  strip(`mood-${mood}`, seconds, (ctx, t) => drawCommands(ctx, alive(mood, t + 0.3)), folder);
}
strip(
  'mood-pleased-beret',
  2.1,
  (ctx, t) => drawCommands(ctx, alive('pleased', t, 'beret')),
  folder,
);

for (const workMode of ['email', 'coding', 'music', 'rest', 'cooking', 'exercise'] as const) {
  const seconds = Math.min(WORK_LOOPS[workMode].seconds, workMode === 'rest' ? 4.5 : 2.4);
  strip(
    `work-${workMode}`,
    seconds,
    (ctx, t) => {
      const props = { ...cheeky, mood: 'working', workMode } as const;
      const motion = { ...scootchIdle(t, 'scootch'), work: workLoop(workMode, t), time: t };
      drawCommands(ctx, buildScootch(props, motion, { boil: boilFrame(t) }));
    },
    folder,
  );
}

const spec = specFromSeed('kettle', 'the tax return');
const monster = buildMonster(spec);
const life = (bodyType: Parameters<typeof specFromSeed>[0], seed: string) => {
  const hatched = specFromSeed(bodyType, seed);
  return (mood: 'idle' | 'nervous' | 'caught', t: number): DrawCommand[] =>
    buildMonster(hatched, 1, { mood, t, boil: boilFrame(t) });
};
for (const bodyType of ['phone', 'pot', 'sock', 'clock', 'beetle', 'slime'] as const) {
  const draw = life(bodyType, 'the tax return');
  strip(`monster-idle-${bodyType}`, 2.4, (ctx, t) => drawCommands(ctx, draw('idle', t)), folder);
}
const phone = life('phone', 'call the dentist');
const pot = life('pot', 'cook for six');
strip('monster-nervous', 0.6, (ctx, t) => drawCommands(ctx, phone('nervous', t)), folder);
strip('monster-nervous-pot', 1.4, (ctx, t) => drawCommands(ctx, pot('nervous', t)), folder);
strip('monster-caught', 3.4, (ctx, t) => drawCommands(ctx, phone('caught', t)), folder);
strip('monster-caught-pot', 3.4, (ctx, t) => drawCommands(ctx, pot('caught', t)), folder);

// The three stroke sets of one pose, four times the size, around the face.
{
  const zoom = 4;
  const canvas = createCanvas(3 * 480, 2 * 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F6F3EE';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const potSpec = specFromSeed('pot', 'cook for six');
  for (const boil of [0, 1, 2] as const) {
    const rows = [
      buildScootch({ ...cheeky, mood: 'waiting' }, {}, { boil }),
      buildMonster(potSpec, 1, { boil }),
    ];
    rows.forEach((commands, row) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(boil * 480, row * 400, 478, 398);
      ctx.clip();
      ctx.translate(boil * 480, row * 400);
      ctx.scale(zoom, zoom);
      ctx.translate(-40, -92);
      drawCommands(ctx, commands);
      ctx.restore();
    });
  }
  const file = path.join(folder, 'boil-frames-4x.png');
  writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(file);
}

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
