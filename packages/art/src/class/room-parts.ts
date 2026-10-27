/**
 * The room's parts, for room.ts: the back wall in either composition, the desks (the Room board's
 * rows, or the App board's rows with benches), the chalk writing and the lamp's dark.
 */
import type { Composition } from './camera';
import { buildFigure, type Layer, type Piece, type TextItem } from './figure';
import { parseMarkup, type Element } from './markup';
import {
  ROOM_CHALKBOARD,
  ROOM_CLOCK_AND_BANNER,
  ROOM_DOOR,
  ROOM_FAN,
  ROOM_NOTICE_BOARD,
  ROOM_PLATFORM,
  ROOM_SHELF,
  ROOM_SIZE,
  ROOM_WALLS,
  ROOM_WINDOW,
} from './room-template';

/** The Room board's desk: a top in perspective, a front, two legs. */
function wideDesk(
  x: number,
  y: number,
  w: number,
  h: number,
  inset: number,
  top: number,
  legH: number,
) {
  const leg = (lx: number) =>
    `<rect x="${lx}" y="${y + h}" width="9" height="${legH}" fill="#8A5A36"></rect>`;
  return (
    `<g><path d="M${x + inset} ${y - top} L${x + w - inset} ${y - top} L${x + w} ${y} L${x} ${y} Z" fill="#E9B47C"></path>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#C98B55"></rect>${leg(x + 7)}${leg(x + w - 16)}</g>`
  );
}

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"></rect>`;

/** The App board's back-row desk, with its bench. */
const phoneBackDesk = (x: number) =>
  `<g><path d="M${x + 10} 690 L${x + 180} 690 L${x + 190} 716 L${x} 716 Z" fill="#E9B47C"></path>` +
  rect(x, 716, 190, 40, '#C98B55') +
  rect(x + 6, 756, 8, 40, '#8A5A36') +
  rect(x + 176, 756, 8, 40, '#8A5A36') +
  rect(x - 6, 782, 222, 12, '#B07A45', 3) +
  rect(x + 2, 794, 8, 22, '#8A5A36') +
  rect(x + 200, 794, 8, 22, '#8A5A36') +
  '</g>';

/** The App board's front-row desk, with its bench. */
const phoneFrontDesk = (x: number) =>
  `<g><path d="M${x + 12} 860 L${x + 222} 860 L${x + 234} 890 L${x} 890 Z" fill="#E9B47C"></path>` +
  rect(x, 890, 234, 46, '#C98B55') +
  rect(x + 7, 936, 9, 44, '#8A5A36') +
  rect(x + 218, 936, 9, 44, '#8A5A36') +
  rect(x - 8, 966, 250, 14, '#B07A45', 3) +
  rect(x + 1, 980, 9, 26, '#8A5A36') +
  rect(x + 224, 980, 9, 26, '#8A5A36') +
  '</g>';

/** The App board's own things on your desk: today's paper and the red pen. */
const PHONE_PAPER =
  '<rect x="752" y="862" width="76" height="22" rx="2" fill="#FFFFFF" transform="rotate(-4 790 873)"></rect>' +
  '<path d="M840 880 L866 866" stroke="#E8322B" stroke-width="5" stroke-linecap="round"></path>';

/** The App board's room runs to 1100, with one more floor line. */
const PHONE_FLOOR =
  '<rect x="0" y="1000" width="1600" height="100" fill="#E8D2AE"></rect>' +
  '<path d="M0 1060 H1600" stroke="#DCC196" stroke-width="2"></path>';

export const DESKS: Readonly<Record<Composition, string>> = {
  wide: [
    ...[275, 495, 715, 935, 1155].map((x) => wideDesk(x, 716, 190, 40, 10, 26, 40)),
    ...[143, 413, 683, 953, 1223].map((x) => wideDesk(x, 890, 234, 46, 12, 30, 44)),
  ].join(''),
  // The App board draws three of each row, 220 and 270 apart; the rows run on across the room.
  phone:
    [265, 485, 705, 925, 1145].map(phoneBackDesk).join('') +
    [143, 413, 683, 953, 1223].map(phoneFrontDesk).join('') +
    PHONE_PAPER,
};

/** The board's chalk: a column from (623, 112), one point apart, in its CSS line heights. */
const CHALK = { left: 623, top: 112, gap: 1, color: '#EEF6F0' } as const;
/** Kithfield Hand's vertical metrics, per unit of size: CSS's normal line height and baseline. */
const HAND_LINE = 1.25;
const HAND_BASELINE = 0.885;
const FADES = [0.62, 0.42] as const;

export interface ChalkOptions {
  readonly board?: 'on' | 'off';
  readonly chalk?: readonly string[];
  readonly date?: string;
  readonly more?: string;
  readonly chalkTitle?: { readonly title: string; readonly subtitle?: string };
}

const chalkText = (
  text: string,
  x: number,
  y: number,
  size: number,
  extra: Partial<TextItem> = {},
): TextItem => ({
  text,
  x,
  y,
  size,
  weight: 700,
  font: 'hand',
  color: CHALK.color,
  opacity: 1,
  anchor: 'start',
  letterSpacing: 0,
  ...extra,
});

/** The first day's board: the class, centred, as the App board writes it. */
function titleItems(title: string, subtitle: string | undefined): TextItem[] {
  const items = [
    chalkText(title, 800, 120 + 44 * (HAND_BASELINE - 0.075), 44, { anchor: 'middle' }),
  ];
  if (subtitle) {
    items.push(
      chalkText(subtitle, 800, 174.4 + 26 * HAND_BASELINE, 26, { anchor: 'middle', opacity: 0.75 }),
    );
  }
  return items;
}

export function chalkLayer(options: ChalkOptions): Layer | undefined {
  if (options.board === 'off') return undefined;
  const lines = options.chalk ?? [];
  const items: TextItem[] = [];
  if (options.chalkTitle) {
    items.push(...titleItems(options.chalkTitle.title, options.chalkTitle.subtitle));
  } else {
    let top: number = CHALK.top;
    const line = (text: string, size: number, extra: Partial<TextItem> = {}) => {
      items.push(chalkText(text, CHALK.left, top + size * HAND_BASELINE, size, extra));
      top += size * HAND_LINE + CHALK.gap;
    };
    if (options.date) line(options.date, 16, { opacity: 0.7 });
    lines.forEach((text, i) => {
      if (i === 0) line(text, 26, { underline: { offset: 5, thickness: 2 } });
      else line(text, 20, { opacity: FADES[i - 1] ?? 0.3 });
    });
    if (options.more) {
      top += 5;
      line(options.more, 17, { color: '#F7D774' });
    }
  }
  if (items.length === 0) return undefined;
  return { id: 'chalk', pieces: items.map((item): Piece => ({ kind: 'text', item })) };
}

export const LAMP_DEFS =
  '<radialGradient id="rmLamp" gradientUnits="userSpaceOnUse" cx="800" cy="420" r="620">' +
  '<stop offset="0" stop-color="#FFD68C" stop-opacity="0"></stop>' +
  '<stop offset="0.4194" stop-color="#0C101E" stop-opacity="0.5"></stop>' +
  '<stop offset="1" stop-color="#0C101E" stop-opacity="0.82"></stop></radialGradient>';

export const lampLayer = (height: number): Layer => ({
  id: 'lamp',
  pieces: [
    {
      kind: 'svg',
      markup: `<rect x="0" y="0" width="1600" height="${height}" fill="url(#rmLamp)"></rect>`,
    },
  ],
});

const BACKS: Readonly<Record<Composition, ReturnType<typeof parseMarkup>>> = {
  wide: parseMarkup(
    ROOM_WALLS +
      ROOM_DOOR +
      ROOM_NOTICE_BOARD +
      ROOM_CLOCK_AND_BANNER +
      ROOM_CHALKBOARD +
      ROOM_WINDOW +
      ROOM_FAN +
      ROOM_SHELF +
      ROOM_PLATFORM,
  ),
  // The App board's phone room has plain wall where the Room board pins its notice board.
  phone: parseMarkup(
    ROOM_WALLS +
      ROOM_DOOR +
      ROOM_CLOCK_AND_BANNER +
      ROOM_CHALKBOARD +
      ROOM_WINDOW +
      ROOM_FAN +
      ROOM_SHELF +
      ROOM_PLATFORM +
      PHONE_FLOOR,
  ),
};

export interface BackOptions {
  readonly lamp?: boolean;
  readonly board?: 'on' | 'off';
  readonly plate?: string;
  readonly banner?: string;
}

export function backLayer(options: BackOptions, composition: Composition): Layer {
  const lamp = options.lamp === true;
  const off = options.board === 'off';
  const values: Readonly<Record<string, string | number>> = {
    wall: lamp ? '#E9DCC6' : '#FFF1DC',
    glass: lamp ? '#26304A' : '#CFE6F5',
    sun: lamp ? 0 : 1,
    onOp: off ? 0 : 1,
    offOp: off ? 1 : 0,
  };
  const figure = buildFigure({ name: 'back', ...ROOM_SIZE, label: '' }, BACKS[composition], {
    values: (h) => values[h],
    layer: (element: Element) => {
      // The wall is its own layer, so a renderer can warm it with the pressure.
      if (element.attrs.fill === '{{wall}}') return { id: 'wall' };
      if (element.attrs.class === 'rm-tick')
        return { id: 'clock.hand', pivot: [550, 56], motion: 'clockTick' };
      // The board turns the blades about the middle of their box; they turn about the hub here.
      if (element.attrs.class === 'rm-fan')
        return { id: 'fan.blades', pivot: [1430, 170], motion: 'fan' };
      if (element.attrs.opacity === '{{onOp}}') return { id: 'board.on' };
      if (element.attrs.opacity === '{{offOp}}') return { id: 'board.off' };
      return undefined;
    },
  });
  const swap = (piece: Piece): Piece => {
    if (piece.kind !== 'text') return piece;
    const { text } = piece.item;
    if (text === '11A' && options.plate)
      return { kind: 'text', item: { ...piece.item, text: options.plate } };
    if (text !== '11A' && options.banner)
      return { kind: 'text', item: { ...piece.item, text: options.banner } };
    return piece;
  };
  return { ...figure.root, id: 'back', pieces: figure.root.pieces.map(swap) };
}
