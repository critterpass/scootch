/**
 * Renders the classroom to PNG sheets in node, to lay beside the design boards:
 *
 *   pnpm --filter <art package> exec tsx scripts/render-class.ts <out folder> [font file]
 *
 * Writes poses.png (all 24), props.png (all 19), room-*.png (the camera framings the brief uses)
 * and carvings.png. Shapes are drawn by Skia's SVG module through @napi-rs/canvas, the same
 * module the app draws them with; text is drawn with the handwriting font, as in the app.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createCanvas, GlobalFonts, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';

import { addCarving, type Carving } from '../src/class/carvings';
import { buildPhu, phuPose, PHU_MOODS, type PhuMood } from '../src/class/phu';
import { buildProp, PROP_NAMES, type PropName } from '../src/class/props';
import { framing, type Framing } from '../src/class/camera';
import { PHU_SPOTS, room, type RoomOptions } from '../src/class/room';

import { drawFigure, label, roundRect } from './class-draw';

const [outArg, fontArg] = process.argv.slice(2);
if (!outArg) throw new Error('Usage: render-class.ts <out folder> [font file]');
const out = outArg;
const fontFile =
  fontArg ?? join(import.meta.dirname, '../../../apps/mobile/assets/fonts/KithfieldHand-Bold.ttf');
GlobalFonts.registerFromPath(fontFile, 'Kithfield Hand');
mkdirSync(out, { recursive: true });

function save(name: string, canvas: Canvas) {
  const path = join(out, name);
  writeFileSync(path, canvas.toBuffer('image/png'));
  console.log(path);
}

/** The Poses board's tile colours. */
// prettier-ignore
const POSE_TILE: Readonly<Partial<Record<PhuMood, string>>> = {
  over: '#FFEBD2', crossed: '#FFE2C6', ruler: '#FFD7BE', name: '#FFC9B6', stare: '#E8E6EE', watch: '#FFEBD2',
  hips: '#FFE2C6', peer: '#FFE2C6', count: '#FFD7BE', snap: '#FFC9B6', huff: '#FFC9B6', facepalm: '#FFE2C6',
  clap: '#FFF0C2', approve: '#FFF0C2', surprised: '#EAF2FB', laugh: '#FFF0C2', moved: '#FDECEF', sleep: '#E6E9F2',
  serious: '#EEECE8',
};
/** The Poses board's order. */
// prettier-ignore
const POSE_ORDER: readonly PhuMood[] = [
  'calm', 'over', 'crossed', 'ruler', 'name', 'stare',
  'watch', 'hips', 'peer', 'count', 'snap', 'huff',
  'point', 'think', 'grading', 'facepalm', 'clap', 'approve',
  'surprised', 'laugh', 'moved', 'wave', 'sleep', 'serious',
];

function posesSheet() {
  if (POSE_ORDER.length !== PHU_MOODS.length) throw new Error('A mood is missing from the sheet');
  const k = 2;
  const cw = 168,
    ch = 200,
    gap = 12,
    cols = 6;
  const rows = Math.ceil(POSE_ORDER.length / cols);
  const canvas = createCanvas((cols * (cw + gap) + gap) * k, (rows * (ch + gap) + gap) * k);
  const ctx = canvas.getContext('2d');
  ctx.scale(k, k);
  ctx.fillStyle = '#FFFAF2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  POSE_ORDER.forEach((mood, i) => {
    const x = gap + (i % cols) * (cw + gap);
    const y = gap + Math.floor(i / cols) * (ch + gap);
    roundRect(ctx, x, y, cw, ch, 20, POSE_TILE[mood] ?? '#FFF1DC');
    const size = 140;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawFigure(
      ctx,
      buildPhu(phuPose(mood)),
      { x: 0, y: 0, w: 200, h: 220 },
      {
        x: (x + (cw - size) / 2) * k,
        y: (y + 12) * k,
        w: size * k,
        h: size * 1.1 * k,
      },
    );
    ctx.restore();
    label(ctx, mood, x + cw / 2, y + ch - 12);
  });
  save('poses.png', canvas);
}

/** The Props board's sizes, in points. */
// prettier-ignore
const PROP_SIZE: Readonly<Record<PropName, number>> = {
  cat: 128, plane: 120, candle: 62, bouquet: 104, banhchung: 110, lantern: 84, cake: 110,
  thermos: 64, coffee: 62, papers: 120, ruler: 130, drum: 112, clock: 86, bucket: 86,
  icecream: 62, balloons: 84, butterfly: 86, armband: 120, peach: 124,
};

function propsSheet() {
  const k = 2;
  const cw = 200,
    ch = 190,
    gap = 12,
    cols = 7;
  const names = PROP_NAMES;
  const rows = Math.ceil(names.length / cols);
  const canvas = createCanvas((cols * (cw + gap) + gap) * k, (rows * (ch + gap) + gap) * k);
  const ctx = canvas.getContext('2d');
  ctx.scale(k, k);
  ctx.fillStyle = '#FFFAF2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  names.forEach((name, i) => {
    const x = gap + (i % cols) * (cw + gap);
    const y = gap + Math.floor(i / cols) * (ch + gap);
    roundRect(ctx, x, y, cw, ch, 20, '#FFF1DC');
    const figure = buildProp(name);
    const w = PROP_SIZE[name];
    const h = (w * figure.height) / figure.width;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawFigure(
      ctx,
      figure,
      { x: 0, y: 0, w: figure.width, h: figure.height },
      {
        x: (x + (cw - w) / 2) * k,
        y: (y + (ch - 24 - h) / 2) * k,
        w: w * k,
        h: h * k,
      },
    );
    ctx.restore();
    label(ctx, name, x + cw / 2, y + ch - 12);
  });
  save('props.png', canvas);
}

function drawRoom(
  ctx: SKRSContext2D,
  options: RoomOptions,
  dest: { x: number; y: number; w: number; h: number },
) {
  const scene = room(options);
  ctx.fillStyle = scene.background;
  ctx.fillRect(dest.x, dest.y, dest.w, dest.h);
  const c = scene.camera;
  drawFigure(ctx, scene.figure, { x: c.x, y: c.y, w: c.w, h: c.h }, dest);
}

function roomShot(
  file: string,
  viewport: { width: number; height: number },
  options: Omit<RoomOptions, 'viewport'>,
  k = 2,
) {
  const canvas = createCanvas(viewport.width * k, viewport.height * k);
  drawRoom(
    canvas.getContext('2d'),
    { ...options, viewport },
    { x: 0, y: 0, w: canvas.width, h: canvas.height },
  );
  save(file, canvas);
}

const PHONE = { width: 390, height: 844 };
const board = { date: 'Monday 26', lines: ['Dentist email', 'Landlord email', 'Renew passport'] };
const sample: Carving[] = [
  { kind: 'star' },
  { kind: 'heart' },
  { kind: 'initials', text: 'M.A' },
  { kind: 'mark' },
];

function roomSheets() {
  roomShot(
    'room-whole.png',
    { width: 1600, height: 1000 },
    {
      camera: { x: 0, y: 0, w: 1600 },
      mood: 'over',
      chalk: board.lines,
      date: board.date,
      carvings: sample,
    },
    1,
  );
  roomShot(
    'room-night.png',
    { width: 1600, height: 1000 },
    {
      camera: { x: 0, y: 0, w: 1600 },
      mood: 'grading',
      chalk: board.lines,
      date: board.date,
      lamp: true,
      carvings: sample,
    },
    1,
  );
  roomShot(
    'room-board-off.png',
    { width: 1280, height: 800 },
    {
      camera: { x: 0, y: 0, w: 1600 },
      mood: 'calm',
      board: 'off',
      chalk: board.lines,
      date: board.date,
      carvings: sample,
    },
    1,
  );
  const shots: readonly [Framing, PhuMood][] = [
    ['desk', 'over'],
    ['session', 'grading'],
    ['recess', 'calm'],
    ['firstDay', 'calm'],
  ];
  const k = 2;
  const gap = 24;
  const canvas = createCanvas(
    (shots.length * (PHONE.width + gap) + gap) * k,
    (PHONE.height + 2 * gap + 20) * k,
  );
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  shots.forEach(([name, mood], i) => {
    const x = gap + i * (PHONE.width + gap);
    drawRoom(
      ctx,
      {
        viewport: PHONE,
        camera: framing(name, PHONE),
        composition: 'phone',
        ...(name === 'recess' ? { phu: PHU_SPOTS.window } : {}),
        mood,
        pace: name === 'session',
        chalk: board.lines,
        date: board.date,
        carvings: sample,
      },
      { x: x * k, y: gap * k, w: PHONE.width * k, h: PHONE.height * k },
    );
    ctx.save();
    ctx.scale(k, k);
    label(ctx, name, x + PHONE.width / 2, gap + PHONE.height + 24, 16);
    ctx.restore();
  });
  save('room-framings.png', canvas);
}

function carvingsSheet() {
  let list: readonly Carving[] = [];
  const kinds: Carving[] = [
    { kind: 'initials', text: 'M.A' },
    { kind: 'star' },
    { kind: 'heart' },
    { kind: 'phu' },
    { kind: 'mark' },
    { kind: 'ten' },
    { kind: 'goldStar' },
  ];
  for (let i = 0; i < 14; i += 1)
    list = addCarving(list, kinds[i % kinds.length] ?? { kind: 'star' });
  const scene = room({
    viewport: { width: 520, height: 260 },
    camera: { x: 660, y: 840, w: 520 },
    mood: 'calm',
    carvings: list,
  });
  const k = 2;
  const canvas = createCanvas(520 * k, 260 * k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const c = scene.camera;
  drawFigure(
    ctx,
    scene.figure,
    { x: c.x, y: c.y, w: c.w, h: c.h },
    { x: 0, y: 0, w: canvas.width, h: canvas.height },
  );
  save('carvings.png', canvas);
}

posesSheet();
propsSheet();
roomSheets();
carvingsSheet();
