import type { MonsterSpec } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { baseline, estimateTextWidth, fitText, textCommand, type TextStyle } from '../core/text';
import type { CardOptions } from './build-card';
import type { ShareComposition } from './build-story';
import { CARD_LABELS } from './labels';
import { fill, placed, type Box } from './shapes';
import { dieCut, line, rect, SHARE_MARK, STAMP } from './share-kit';

export interface PosterOptions extends Pick<CardOptions, 'language' | 'measure'> {
  readonly year: number;
  /** The month the poster wraps up, 1 to 12. */
  readonly month: number;
  /** How many monsters were caught in it, counted by the app. */
  readonly caught: number;
  /** The month's monsters, newest first. The poster stands as many as fit along its foot. */
  readonly monsters: readonly MonsterSpec[];
  /** The kind of monster caught most, and how often; `null` when no kind stands out. */
  readonly most: { readonly kind: string; readonly times: number } | null;
  /** The weekday with the most catches, 0 for Sunday; `null` when the month has no best day. */
  readonly bestWeekday: number | null;
}

const WIDTH = 360;
const HEIGHT = 640;
const NIGHT = '#120F0D';
/** How many monsters stand along the foot: three rows of four. */
export const POSTER_MONSTERS = 12;
const NUMERAL: TextStyle = { font: 'rounded', size: 230, weight: 900, tracking: -0.07 };
const CLAIM: TextStyle = { font: 'rounded', size: 30, weight: 800, tracking: -0.025 };
const FACTS: TextStyle = { font: 'sans', size: 15, weight: 400 };

/**
 * The month, wrapped: how many monsters were caught as one enormous silver numeral on a dark
 * page with two soft lights behind it, a plain sentence of counted facts, and the month's own
 * monsters standing along the foot. Every number on it is counted by the app; nothing is about
 * a day that was missed.
 */
export function buildPoster(options: PosterOptions): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const page: Box = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  const glow = (
    cx: number,
    cy: number,
    radius: number,
    color: string,
    alpha: number,
  ): DrawCommand => ({
    op: 'paint',
    path: rect(page),
    paint: {
      kind: 'radial',
      centre: [cx, cy],
      radius,
      stops: [
        [0, color, alpha],
        [0.35, color, alpha * 0.7],
        [1, color, 0],
      ],
    },
    alpha: 1,
    blend: 'normal',
  });
  const out: DrawCommand[] = [
    fill(rect(page), NIGHT),
    glow(60, 120, 290, '#F0562E', 0.5),
    glow(WIDTH + 20, 380, 270, '#4FB6FF', 0.28),
    {
      op: 'paint',
      path: rect(page),
      paint: { kind: 'grain', size: 1.2 },
      alpha: 0.3,
      blend: 'overlay',
    },
    line(
      labels.wrapped(labels.months[options.month - 1] ?? ''),
      STAMP,
      { x: 24, top: 26, maxWidth: WIDTH - 110, color: '#FFFFFF', alpha: 0.85 },
      measure,
    ),
    line(
      String(options.year),
      STAMP,
      { x: WIDTH - 24, top: 26, maxWidth: 60, color: '#FFFFFF', alpha: 0.85, align: 'right' },
      measure,
    ),
  ];

  // The numeral: silver, with its own shadow under it and a brighter edge above.
  const numeral = fitText(
    String(options.caught),
    NUMERAL,
    { maxWidth: WIDTH - 28, minSize: 90, maxLines: () => 1 },
    measure,
  );
  const numeralAt = {
    x: 14,
    y: baseline(40, numeral.style.size, numeral.style.size),
    maxWidth: WIDTH - 28,
  };
  const figure = numeral.lines[0] ?? String(options.caught);
  out.push(
    textCommand(figure, numeral.style, {
      ...numeralAt,
      y: numeralAt.y + 10,
      color: '#000000',
      alpha: 0.5,
    }),
    textCommand(figure, numeral.style, { ...numeralAt, y: numeralAt.y + 3, color: '#8F8A83' }),
    textCommand(figure, numeral.style, { ...numeralAt, color: '#F3F0EA' }),
    line(
      labels.caughtThisMonth(options.caught),
      CLAIM,
      { x: 26, top: 270, maxWidth: WIDTH - 52, color: '#FFFFFF', minSize: 16 },
      measure,
    ),
  );

  const facts = [
    options.most ? labels.mostCaught(options.most.kind, options.most.times) : '',
    options.bestWeekday === null
      ? ''
      : labels.bestDay(labels.longWeekdays[options.bestWeekday] ?? ''),
  ]
    .filter((part) => part !== '')
    .join(' ');
  if (facts !== '') {
    const fitted = fitText(
      facts,
      FACTS,
      { maxWidth: WIDTH - 52, minSize: 11, maxLines: () => 3 },
      measure,
    );
    fitted.lines.forEach((one, index) => {
      out.push(
        textCommand(one, fitted.style, {
          x: 26,
          y: baseline(
            316 + index * fitted.style.size * 1.4,
            fitted.style.size,
            fitted.style.size * 1.4,
          ),
          maxWidth: WIDTH - 52,
          color: '#FFFFFF',
          alpha: 0.78,
        }),
      );
    });
  }

  // The month's monsters along the foot, the newest at the front.
  const standing = options.monsters.slice(0, POSTER_MONSTERS);
  const perRow = 4;
  const size = 84;
  const rowsUsed = Math.ceil(standing.length / perRow);
  for (let row = rowsUsed - 1; row >= 0; row--) {
    const inRow = standing.slice(row * perRow, (row + 1) * perRow);
    const span = inRow.length * (size - 8);
    inRow.forEach((spec, index) => {
      out.push(
        ...placed(
          // A pale edge round each, so a dark monster still stands out of the dark page.
          dieCut(buildMonster(spec), 4),
          {
            x: (WIDTH - span) / 2 + index * (size - 8) - 4 + (row % 2 ? 14 : 0),
            y: HEIGHT - 44 - size - row * 52,
            w: size,
            h: size,
          },
          VIEW_SIZE,
        ),
      );
    });
  }
  out.push(
    line(
      SHARE_MARK,
      { ...STAMP, size: 10 },
      {
        x: WIDTH - 24,
        top: HEIGHT - 32,
        maxWidth: 140,
        color: '#FFFFFF',
        alpha: 0.7,
        align: 'right',
      },
      measure,
    ),
  );
  return { commands: out, width: WIDTH, height: HEIGHT };
}
