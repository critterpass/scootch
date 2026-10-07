/**
 * Draws the card for looking at beside the design: the seven materials, level and leant, one card
 * in every finish, a wild card, a card with the task hidden, a Vietnamese card with a long name
 * and long flavour text, and the two share stories.
 *
 *   pnpm --filter @scootch/art cards [folder]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import { CARD_FINISH_IDS, type CardData } from '@scootch/domain';

import {
  buildCard,
  buildCardShadow,
  buildMaterial,
  CARD_BLEED,
  CARD_MATERIALS,
  CARD_HEIGHT,
  CARD_WIDTH,
  buildPoster,
  buildReceipt,
  buildStickerSheet,
  buildTradingCard,
  drawCommands,
  specFromSeed,
  type CardLean,
  type CardOptions,
} from '../src/index';
import { measureWithCanvas, renderCardPng, renderSharePng, renderStoryPng } from '../src/node';

const molar: CardData = {
  monster: specFromSeed('tooth', 'dentist'),
  name: 'Molar, Keeper of Thursday',
  title: 'Inbox dweller',
  rarity: 'rare',
  number: 41,
  taskLine: 'email the dentist',
  daysLurked: 214,
  catchMinutes: 9,
  dread: 4,
  flavourText: 'Feeds on unread notifications. Weak against two-sentence replies.',
  finish: 'paper',
  caughtOn: '2026-10-06',
};
const vietnamese: CardData = {
  ...molar,
  monster: specFromSeed('receipt', 'taxes'),
  name: 'Hoá Đơn Đại Đế, Kẻ Canh Giữ Ngăn Kéo Thứ Ba Bên Trái',
  title: 'Cư dân ngăn kéo giấy tờ',
  rarity: 'uncommon',
  number: 1207,
  taskLine: 'nộp tờ khai thuế thu nhập cá nhân của năm ngoái trước khi bị nhắc lần thứ tư',
  daysLurked: 388,
  catchMinutes: 95,
  dread: 5,
  flavourText:
    'Sống bằng những tờ biên lai nhàu nát và lời hứa "để mai tính". Rất sợ một buổi tối yên tĩnh, một ly trà nóng và người chịu ngồi xuống điền từng dòng một.',
};

const scale = 2;
const cellWidth = (CARD_WIDTH + CARD_BLEED * 2) * scale;
const cellHeight = (CARD_HEIGHT + CARD_BLEED * 2 + 22) * scale;

/** A row of cards, each with a caption under it. */
function sheet(cards: readonly [string, CardData, CardOptions][]): Buffer {
  const canvas = createCanvas(cellWidth * cards.length, cellHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E9E4DC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  cards.forEach(([caption, data, options], i) => {
    ctx.save();
    ctx.translate(i * cellWidth + CARD_BLEED * scale, CARD_BLEED * scale);
    ctx.scale(scale, scale);
    drawCommands(ctx, buildCard(data, { measure: measureWithCanvas, ...options }));
    ctx.restore();
    ctx.fillStyle = '#6F6A62';
    ctx.font = `${13 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(caption, (i + 0.5) * cellWidth, cellHeight - 10 * scale);
  });
  return canvas.toBuffer('image/png');
}

const folder = path.resolve(process.argv[2] ?? path.join(tmpdir(), 'scootch-cards'));
mkdirSync(folder, { recursive: true });
const order = CARD_FINISH_IDS;

/** The seven materials as the board's tiles, 188 by 262 points, each at a lean. */
function materials(lean: CardLean): Buffer {
  const tile = { x: 24, y: 24, w: 188, h: 262 };
  const cell = tile.w + 48;
  const canvas = createCanvas(cell * order.length * scale, (tile.h + 80) * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E9E5DE';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  order.forEach((finish, i) => {
    const material = CARD_MATERIALS[finish];
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(i * cell, 0);
    drawCommands(ctx, [
      ...buildCardShadow(tile, 22, material),
      ...buildMaterial(tile, 22, material, { lean }),
    ]);
    ctx.fillStyle = material.text;
    ctx.font = '800 19px sans-serif';
    ctx.fillText(finish, tile.x + 14, tile.y + tile.h - 16);
    ctx.restore();
  });
  return canvas.toBuffer('image/png');
}
const story = { headline: 'Emailed the dentist.' };
const files: Record<string, Buffer> = {
  'materials-level.png': materials({ rx: 0, ry: 0 }),
  'materials-leant.png': materials({ rx: 8, ry: -11 }),
  'card-finishes.png': sheet(
    order.map((finish): [string, CardData, CardOptions] => [finish, { ...molar, finish }, {}]),
  ),
  'card-states.png': sheet([
    ['wild', molar, { wild: true }],
    ['task hidden', molar, { hideTask: true }],
    ['tilted foil, velvet', { ...molar, finish: 'flock' }, { tilt: { x: -0.6, y: 0.5 } }],
    ['vi, long text', vietnamese, { language: 'vi' }],
    ['vi, long text, holo', { ...vietnamese, finish: 'holo' }, { language: 'vi' }],
  ]),
  'card-export.png': renderCardPng(molar, {}, 660),
  'story.png': renderStoryPng({ ...molar, finish: 'riso' }, story, 720),
  'story-vi-hidden.png': renderStoryPng(
    { ...vietnamese, finish: 'holo' },
    { language: 'vi', hideTask: true },
    720,
  ),
  'trading-card.png': renderSharePng(
    buildTradingCard({ ...molar, finish: 'holo' }, { measure: measureWithCanvas, time: '09:41' }),
    720,
  ),
  'trading-card-vi-velvet.png': renderSharePng(
    buildTradingCard(
      { ...vietnamese, finish: 'flock' },
      { measure: measureWithCanvas, language: 'vi', lean: { rx: 6, ry: -9 } },
    ),
    720,
  ),
  'sticker-sheet.png': renderSharePng(
    buildStickerSheet({
      measure: measureWithCanvas,
      finish: 'holo',
      member: 42,
      monster: specFromSeed('sock', 'sock'),
    }),
    840,
  ),
  'receipt.png': renderSharePng(
    buildReceipt({
      measure: measureWithCanvas,
      date: '2026-10-07',
      rows: [
        { label: 'reply to Sam', time: '09:12' },
        { label: 'fold laundry', time: '11:40' },
        { label: 'do my taxes, the whole lot of them, including the annex', time: '14:05' },
        { label: 'water plants', time: '16:22' },
        { label: 'brush the dog', time: '18:30' },
      ],
      caught: 5,
      minutes: 112,
      stamp: 'holo',
    }),
    660,
  ),
  'poster.png': renderSharePng(
    buildPoster({
      measure: measureWithCanvas,
      year: 2026,
      month: 9,
      caught: 42,
      monsters: [
        'tooth',
        'receipt',
        'sock',
        'slime',
        'box',
        'pillow',
        'tooth',
        'sock',
        'receipt',
      ].map((body, index) => specFromSeed(body as 'tooth', `poster-${index}`)),
      most: { kind: 'paperwork', times: 9 },
      bestWeekday: 4,
    }),
    720,
  ),
};
for (const [name, png] of Object.entries(files)) {
  writeFileSync(path.join(folder, name), png);
  console.log(path.join(folder, name));
}
