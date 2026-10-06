import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgModule from '@resvg/resvg-wasm/index_bg.wasm';
import { buildMonster, specFromSeed, toSvg } from '@scootch/art';

import italic from './fonts/nunito-500-italic.bin';
import semibold from './fonts/nunito-600.bin';
import extrabold from './fonts/nunito-800.bin';
import type { SharedMonster } from './shared-monsters';

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

// The site's light inks: a link preview is always printed paper, whatever the reader's theme.
const PAPER = '#FBF8F2';
const INK = '#1C1A17';
const MUTED = '#6F6A62';
const TOMATO = '#F0562E';
const TOMATO_TEXT = '#C63D1B';
const BLOB = '#F5E3D0';

const words = {
  en: {
    wild: 'WILD',
    caught: 'CAUGHT',
    wildEyebrow: 'A WILD MONSTER',
    caughtEyebrow: (minutes: number) => `CAUGHT IN ${minutes} MIN`,
    caughtPlain: 'CAUGHT',
    wildLine: 'Not caught yet. Make your own.',
    caughtLine: 'Make your own monster.',
    notCaught: 'Not caught yet',
    caughtIn: (minutes: number) => `Caught in ${minutes} min`,
  },
  vi: {
    wild: 'HOANG',
    caught: 'ĐÃ BẮT',
    wildEyebrow: 'MỘT CON QUÁI HOANG',
    caughtEyebrow: (minutes: number) => `BẮT TRONG ${minutes} PHÚT`,
    caughtPlain: 'ĐÃ BẮT',
    wildLine: 'Chưa ai bắt. Ấp một con của bạn đi.',
    caughtLine: 'Ấp một con quái của riêng bạn.',
    notCaught: 'Chưa bắt được',
    caughtIn: (minutes: number) => `Bắt trong ${minutes} phút`,
  },
} as const;

const escape = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Breaks a line into rows of about `perRow` characters, at spaces; the last row ends in "…". */
function rows(text: string, perRow: number, most: number): string[] {
  const out: string[] = [];
  let row = '';
  for (const word of text.split(/\s+/)) {
    if (row !== '' && `${row} ${word}`.length > perRow) {
      out.push(row);
      row = word;
    } else {
      row = row === '' ? word : `${row} ${word}`;
    }
  }
  if (row !== '') out.push(row);
  if (out.length <= most) return out;
  return [...out.slice(0, most - 1), `${out[most - 1] ?? ''}…`];
}

function text(
  lines: readonly string[],
  at: { x: number; y: number; step: number; anchor?: 'end' },
  style: string,
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${at.x}" y="${at.y + index * at.step}" font-family="Nunito" ${style}` +
        `${at.anchor ? ' text-anchor="end"' : ''}>${escape(line)}</text>`,
    )
    .join('');
}

/** The card, 340 wide, with its top left corner at the origin. */
function card(monster: SharedMonster): string {
  const copy = words[monster.language];
  const caught = monster.status === 'caught';
  const drawing = toSvg(buildMonster(specFromSeed(monster.bodyType, monster.seed)), {
    idPrefix: 'p-',
  }).replace('<svg ', '<svg x="65" y="118" width="210" height="210" ');
  const pill = caught ? copy.caught : copy.wild;
  const pillWidth = 26 + pill.length * 11;
  const foot =
    caught && monster.catchMinutes !== null ? copy.caughtIn(monster.catchMinutes) : copy.notCaught;
  return [
    `<ellipse cx="170" cy="486" rx="150" ry="14" fill="${INK}" fill-opacity="0.12"/>`,
    `<rect width="340" height="476" rx="30" fill="${INK}"/>`,
    `<rect x="12" y="12" width="316" height="452" rx="20" fill="${PAPER}"/>`,
    text(
      rows(monster.name, 14, 2),
      { x: 30, y: 52, step: 24 },
      `font-size="20" font-weight="800" fill="${INK}"`,
    ),
    `<rect x="${310 - pillWidth}" y="30" width="${pillWidth}" height="28" rx="14" fill="${caught ? TOMATO : INK}"/>`,
    text(
      [pill],
      { x: 310 - 13, y: 50, step: 0, anchor: 'end' },
      `font-size="15" font-weight="800" letter-spacing="1.5" fill="${caught ? INK : PAPER}"`,
    ),
    `<rect x="30" y="92" width="280" height="250" rx="14" fill="${BLOB}"/>`,
    `<rect x="30" y="92" width="280" height="250" rx="14" fill="url(#dots)"/>`,
    drawing,
    text(
      rows(monster.flavourText, 36, 3),
      { x: 30, y: 370, step: 21 },
      `font-size="15.5" font-weight="500" font-style="italic" fill="${MUTED}"`,
    ),
    `<path d="M30 424H310" stroke="${INK}" stroke-opacity="0.2" stroke-dasharray="3 3"/>`,
    text([foot], { x: 30, y: 448, step: 0 }, `font-size="15" font-weight="600" fill="${MUTED}"`),
    text(
      ['scootch.app'],
      { x: 310, y: 448, step: 0, anchor: 'end' },
      `font-size="15" font-weight="800" fill="${INK}"`,
    ),
  ].join('');
}

/**
 * A monster's link preview as SVG: printed paper, one tomato blob, the card on the left and one
 * line on the right. Everything that matters sits inside the middle 1000 pixels, because some
 * readers crop the sides.
 */
export function previewSvg(monster: SharedMonster): string {
  const copy = words[monster.language];
  const caught = monster.status === 'caught';
  const eyebrow = !caught
    ? copy.wildEyebrow
    : monster.catchMinutes === null
      ? copy.caughtPlain
      : copy.caughtEyebrow(monster.catchMinutes);
  const big = rows(monster.name, 15, 2).length === rows(monster.name, 15, 9).length;
  const name = big ? rows(monster.name, 15, 2) : rows(monster.name, 20, 3);
  const size = big ? 66 : 50;
  const step = size * 1.14;
  const lead = size * 1.12;
  const top = 315 - (lead + (name.length - 1) * step + 108) / 2 + lead + 12;
  const last = top + (name.length - 1) * step;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}">`,
    `<defs><pattern id="dots" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="6.5" cy="6.5" r="1.7" fill="${TOMATO}" fill-opacity="0.3"/></pattern></defs>`,
    `<rect width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" fill="${PAPER}"/>`,
    `<circle cx="1010" cy="170" r="330" fill="${BLOB}"/>`,
    `<circle cx="1010" cy="170" r="330" fill="url(#dots)"/>`,
    `<g transform="translate(130 70)">${card(monster)}</g>`,
    text(
      [eyebrow],
      { x: 540, y: top - lead, step: 0 },
      `font-size="25" font-weight="800" letter-spacing="3" fill="${TOMATO_TEXT}"`,
    ),
    text(
      name,
      { x: 540, y: top, step },
      `font-size="${size}" font-weight="800" letter-spacing="-1.5" fill="${INK}"`,
    ),
    text(
      [caught ? copy.caughtLine : copy.wildLine],
      { x: 540, y: last + 50, step: 0 },
      `font-size="29" font-weight="600" fill="${MUTED}"`,
    ),
    `<text x="540" y="${last + 108}" font-family="Nunito" font-size="32" font-weight="800" fill="${INK}">scootch<tspan fill="${TOMATO}">.</tspan>app</text>`,
    '</svg>',
  ].join('');
}

let ready: Promise<void> | undefined;

/** The link preview as a 1200 by 630 PNG, rasterised in the Worker. */
export async function previewPng(monster: SharedMonster): Promise<Uint8Array<ArrayBuffer>> {
  ready ??= initWasm(resvgModule);
  await ready;
  const resvg = new Resvg(previewSvg(monster), {
    fitTo: { mode: 'width', value: PREVIEW_WIDTH },
    font: {
      fontBuffers: [italic, semibold, extrabold].map((bytes) => new Uint8Array(bytes)),
      defaultFontFamily: 'Nunito',
      loadSystemFonts: false,
    },
  });
  try {
    const rendered = resvg.render();
    try {
      // A copy on its own buffer, so it outlives the renderer's memory.
      return new Uint8Array(rendered.asPng());
    } finally {
      rendered.free();
    }
  } finally {
    resvg.free();
  }
}
