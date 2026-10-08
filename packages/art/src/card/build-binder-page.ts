import type { MonsterSpec } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand, type Path } from '../core/commands';
import { estimateTextWidth, type TextStyle } from '../core/text';
import type { CardOptions } from './build-card';
import type { ShareComposition } from './build-story';
import { CARD_LABELS } from './labels';
import { fill, placed, roundRect, type Box } from './shapes';
import { line, rect, SHARE_INK, SHARE_MARK, STAMP, turned } from './share-kit';

/** One pocket of the leaf: the monster in it, and the name under it. */
export interface BinderPocket {
  readonly monster: MonsterSpec;
  readonly name: string;
}

export interface BinderPageOptions extends Pick<CardOptions, 'language' | 'measure'> {
  readonly year: number;
  /** The month the leaf belongs to, 1 to 12. */
  readonly month: number;
  /** How many monsters were caught in the month, counted by the app. */
  readonly caught: number;
  /** What is on this leaf, in the order it was caught. The leaf holds the first nine it is given. */
  readonly pockets: readonly BinderPocket[];
  /** The month's first nine pockets are filled, and this is its first leaf: it wears the stamp. */
  readonly stamped: boolean;
}

const WIDTH = 360;
const HEIGHT = 640;
/** A leaf holds nine pockets: three rows of three. */
export const PAGE_POCKETS = 9;
/** The binder's own paper, its spine, and the desk the leaf lies on. */
const DESK = '#F6F3EE';
const PAPER = '#E9DFCF';
const SPINE = '#D9CDB9';
const SLEEVE = '#FBF8F2';
const TOMATO = '#F0562E';
const MUTED = '#6F6A62';
const LEAF: Box = { x: 22, y: 66, w: WIDTH - 44, h: 492 };
const SPINE_WIDE = 24;
const HOLES = [0.14, 0.5, 0.86] as const;
const COLUMNS = 3;
const GAP = 8;
const MONTH: TextStyle = { font: 'rounded', size: 28, weight: 900, tracking: -0.02 };
const NAME: TextStyle = { font: 'rounded', size: 10, weight: 800, tracking: 0.01 };
const COUNT: TextStyle = { font: 'sans', size: 15, weight: 500 };
const SEAL: TextStyle = { font: 'rounded', size: 15, weight: 900, tracking: 0.04 };

const circle = (x: number, y: number, r: number): Path => [['O', x, y, r]];
const stroke = (path: Path, color: string, width: number, alpha = 1): DrawCommand => ({
  op: 'stroke',
  path,
  color,
  alpha,
  width,
});

/**
 * A leaf of the binder, as the app shows it: the paper with its spine and three holes, the month
 * and how full the leaf is, nine pockets with a monster and its name in each one that is filled,
 * and the month's stamp when it has earned one. Every number on it is counted by the app, and it
 * prints no task.
 */
export function buildBinderPage(options: BinderPageOptions): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const monthName = labels.months[options.month - 1] ?? '';
  const pockets = options.pockets.slice(0, PAGE_POCKETS);
  const inside: Box = {
    x: LEAF.x + SPINE_WIDE + 12,
    y: LEAF.y + 62,
    w: LEAF.w - SPINE_WIDE - 12 - 14,
    h: LEAF.h - 62 - 14,
  };
  const pocketW = (inside.w - GAP * (COLUMNS - 1)) / COLUMNS;
  const pocketH = (inside.h - GAP * (COLUMNS - 1)) / COLUMNS;

  const out: DrawCommand[] = [
    fill(rect({ x: 0, y: 0, w: WIDTH, h: HEIGHT }), DESK),
    line(
      String(options.year),
      STAMP,
      { x: WIDTH - 24, top: 30, maxWidth: 60, color: SHARE_INK, alpha: 0.7, align: 'right' },
      measure,
    ),
    // The leaf lies on the desk: its shadow, the paper, the spine down its leading edge.
    fill(roundRect({ ...LEAF, y: LEAF.y + 12 }, 14), SHARE_INK, 0.12),
    fill(roundRect(LEAF, 14), PAPER),
    fill(roundRect({ ...LEAF, w: SPINE_WIDE + 12 }, 14), SPINE),
    fill(rect({ x: LEAF.x + SPINE_WIDE, y: LEAF.y, w: 14, h: LEAF.h }), PAPER),
    ...HOLES.map((share) =>
      fill(circle(LEAF.x + SPINE_WIDE / 2, LEAF.y + LEAF.h * share, 5.5), DESK),
    ),
    line(
      monthName,
      MONTH,
      { x: inside.x, top: LEAF.y + 20, maxWidth: inside.w - 56, color: SHARE_INK, minSize: 14 },
      measure,
    ),
    line(
      `${pockets.length} / ${PAGE_POCKETS}`,
      STAMP,
      {
        x: inside.x + inside.w,
        top: LEAF.y + 32,
        maxWidth: 52,
        color: MUTED,
        align: 'right',
      },
      measure,
    ),
  ];

  for (let index = 0; index < PAGE_POCKETS; index++) {
    const box: Box = {
      x: inside.x + (index % COLUMNS) * (pocketW + GAP),
      y: inside.y + Math.floor(index / COLUMNS) * (pocketH + GAP),
      w: pocketW,
      h: pocketH,
    };
    const pocket = pockets[index];
    if (!pocket) {
      // An empty sleeve: its outline, and nothing in it yet.
      out.push(fill(roundRect(box, 10), SLEEVE, 0.35), stroke(roundRect(box, 10), SPINE, 1.5));
      continue;
    }
    const side = Math.min(box.w - 14, box.h - 44);
    out.push(
      fill(roundRect({ ...box, y: box.y + 2 }, 10), SHARE_INK, 0.08),
      fill(roundRect(box, 10), SLEEVE),
      stroke(roundRect(box, 10), SPINE, 1),
      ...placed(
        buildMonster(pocket.monster),
        { x: box.x + (box.w - side) / 2, y: box.y + box.h - 30 - side, w: side, h: side },
        VIEW_SIZE,
      ),
      line(
        pocket.name,
        NAME,
        {
          x: box.x + box.w / 2,
          top: box.y + box.h - 22,
          maxWidth: box.w - 12,
          color: SHARE_INK,
          align: 'center',
          minSize: 7,
        },
        measure,
      ),
    );
  }

  if (options.stamped) {
    // The month's seal, struck over the last corner and leaning a little, as a stamp lands.
    const cx = LEAF.x + LEAF.w - 62;
    const cy = LEAF.y + LEAF.h - 58;
    out.push(
      ...turned(
        [
          fill(circle(cx, cy + 4, 58), SHARE_INK, 0.16),
          fill(circle(cx, cy, 58), TOMATO),
          stroke(circle(cx, cy, 50), '#FFFFFF', 1.5, 0.75),
          line(
            monthName.toUpperCase(),
            STAMP,
            { x: cx, top: cy - 30, maxWidth: 84, color: '#FFFFFF', align: 'center', alpha: 0.9 },
            measure,
          ),
          line(
            labels.pageComplete,
            SEAL,
            { x: cx, top: cy - 10, maxWidth: 88, color: '#FFFFFF', align: 'center' },
            measure,
          ),
          line(
            labels.caughtCount(options.caught),
            STAMP,
            { x: cx, top: cy + 14, maxWidth: 84, color: '#FFFFFF', align: 'center', alpha: 0.9 },
            measure,
          ),
        ],
        cx,
        cy,
        -9,
      ),
    );
  }

  out.push(
    line(
      `${options.caught} ${labels.caughtThisMonth(options.caught)}`,
      COUNT,
      { x: 24, top: HEIGHT - 58, maxWidth: WIDTH - 170, color: SHARE_INK, minSize: 10 },
      measure,
    ),
    line(
      SHARE_MARK,
      { ...STAMP, size: 10 },
      {
        x: WIDTH - 24,
        top: HEIGHT - 54,
        maxWidth: 120,
        color: SHARE_INK,
        alpha: 0.6,
        align: 'right',
      },
      measure,
    ),
  );
  return { commands: out, width: WIDTH, height: HEIGHT };
}
