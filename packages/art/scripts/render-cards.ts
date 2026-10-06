/**
 * Draws the card for looking at beside the design: one card in the five finishes, a wild card, a
 * card with the task hidden, a Vietnamese card with a long name and long flavour text, and the two
 * share stories.
 *
 *   pnpm --filter @scootch/art cards [folder]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCanvas } from '@napi-rs/canvas';
import type { CardData } from '@scootch/domain';

import {
  buildCard,
  CARD_BLEED,
  CARD_HEIGHT,
  CARD_WIDTH,
  drawCommands,
  specFromSeed,
  type CardOptions,
} from '../src/index';
import { measureWithCanvas, renderCardPng, renderStoryPng } from '../src/node';

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
  finish: 'standard',
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
const order = ['standard', 'kraft', 'gold', 'night', 'riso'] as const;
const story = { headline: 'I finally emailed the dentist.', time: '14:52' };
const files: Record<string, Buffer> = {
  'card-finishes.png': sheet(
    order.map((finish): [string, CardData, CardOptions] => [finish, { ...molar, finish }, {}]),
  ),
  'card-states.png': sheet([
    ['wild', molar, { wild: true }],
    ['task hidden', molar, { hideTask: true }],
    ['tilted foil, night', { ...molar, finish: 'night' }, { tilt: { x: -0.6, y: 0.5 } }],
    ['vi, long text', vietnamese, { language: 'vi' }],
    ['vi, long text, gold', { ...vietnamese, finish: 'gold' }, { language: 'vi' }],
  ]),
  'card-export.png': renderCardPng(molar, {}, 660),
  'story-9x16.png': renderStoryPng(molar, '9:16', story, 720),
  'story-4x5.png': renderStoryPng(molar, '4:5', story, 1024),
  'story-9x16-vi-hidden.png': renderStoryPng(
    vietnamese,
    '9:16',
    { language: 'vi', hideTask: true },
    720,
  ),
};
for (const [name, png] of Object.entries(files)) {
  writeFileSync(path.join(folder, name), png);
  console.log(path.join(folder, name));
}
