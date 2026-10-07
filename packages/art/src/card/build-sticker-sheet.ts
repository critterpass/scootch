import type { CardFinish, MonsterSpec } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { estimateTextWidth, type TextStyle } from '../core/text';
import { buildScootch } from '../scootch/build-scootch';
import type { ScootchBody } from '../scootch/palette';
import type { CardOptions } from './build-card';
import { buildMaterial, CARD_MATERIALS } from './build-material';
import type { ShareComposition } from './build-story';
import { CARD_LABELS } from './labels';
import { fill, placed, roundRect, type Box } from './shapes';
import { dieCut, line, rect, SHARE_INK, SHARE_MARK, STAMP, turned } from './share-kit';

export interface StickerSheetOptions extends Pick<CardOptions, 'language' | 'measure'> {
  /** The finish the round sticker is cut from. */
  readonly finish: CardFinish;
  /** The member's number, for a member's sheet; `null` cuts the round sticker without one. */
  readonly member: number | null;
  /** A monster of the person's own, when they have caught one. */
  readonly monster: MonsterSpec | null;
  /** The ink Scootch is printed in, when it is not tomato. */
  readonly body?: ScootchBody;
}

const WIDTH = 420;
const HEIGHT = 540;
const SHEET = '#EFE9DF';
const EDGE = 5;
const WORD: TextStyle = { font: 'rounded', size: 24, weight: 900, tracking: -0.02 };

function scootch(mood: 'pleased' | 'asleep', body: ScootchBody | undefined): DrawCommand[] {
  return buildScootch(
    { mood, attitude: 'cheeky', workMode: null, reducedMotion: true },
    undefined,
    body ? { body } : {},
  );
}

/** A figure as a die-cut sticker in a box, leaning. */
function sticker(figure: readonly DrawCommand[], box: Box, lean: number): DrawCommand[] {
  return turned(
    placed(dieCut(figure, (EDGE * VIEW_SIZE) / box.w), box, VIEW_SIZE),
    box.x + box.w / 2,
    box.y + box.h / 2,
    lean,
  );
}

/**
 * A sheet of die-cut stickers: Scootch twice, a round sticker cut from the finish the person
 * wears, two word stickers, one of their own monsters when they have one, and a corner already
 * peeling. Thick white edges all round, as if it could be printed and cut. Nothing on it comes
 * from a task.
 */
export function buildStickerSheet(options: StickerSheetOptions): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const page: Box = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  const out: DrawCommand[] = [
    fill(rect(page), SHEET),
    {
      op: 'paint',
      path: rect(page),
      paint: { kind: 'grain', size: 1.2 },
      alpha: 0.28,
      blend: 'multiply',
    },
    line(
      `SCOOTCH · ${labels.stickerSheet}`,
      { ...STAMP, size: 10 },
      { x: 20, top: 18, maxWidth: WIDTH - 40, color: '#8A7A63' },
      measure,
    ),
    ...sticker(scootch('pleased', options.body), { x: 14, y: 36, w: 190, h: 190 }, -8),
  ];

  // The round sticker, cut from the worn finish.
  const round = { x: WIDTH - 26 - 75, y: 52 + 75, r: 75 };
  const face: Box = { x: round.x - round.r, y: round.y - round.r, w: round.r * 2, h: round.r * 2 };
  const material = CARD_MATERIALS[options.finish];
  const member = options.member;
  out.push(
    ...turned(
      [
        fill([['O', round.x, round.y, round.r + 6]], '#FFFFFF'),
        ...buildMaterial(face, round.r, material),
        line(
          member === null ? 'SCOOTCH' : 'PLUS',
          { font: 'rounded', size: 34, weight: 900, tracking: -0.04 },
          { x: round.x, top: round.y - 26, maxWidth: 120, color: material.text, align: 'center' },
          measure,
        ),
        line(
          member === null ? SHARE_MARK : labels.member(String(member).padStart(4, '0')),
          { ...STAMP, size: 9, tracking: 0.2 },
          {
            x: round.x,
            top: round.y + 14,
            maxWidth: 120,
            color: material.sub[0],
            alpha: material.sub[1],
            align: 'center',
          },
          measure,
        ),
      ],
      round.x,
      round.y,
      10,
    ),
  );

  // The first word sticker, a black pill.
  const [first, second] = labels.stickers;
  const firstWidth = Math.min(240, measure(first, WORD) + 40);
  const pill: Box = { x: 34, y: 262, w: firstWidth, h: 52 };
  out.push(
    ...turned(
      [
        fill(
          roundRect({ x: pill.x - 6, y: pill.y - 6, w: pill.w + 12, h: pill.h + 12 }, 32),
          '#FFFFFF',
        ),
        fill(roundRect(pill, 26), SHARE_INK),
        line(
          first,
          WORD,
          {
            x: pill.x + pill.w / 2,
            top: pill.y + 14,
            maxWidth: pill.w - 28,
            color: '#FBF8F3',
            align: 'center',
          },
          measure,
        ),
      ],
      pill.x + pill.w / 2,
      pill.y + pill.h / 2,
      -4,
    ),
  );

  if (options.monster) {
    out.push(
      ...sticker(buildMonster(options.monster), { x: WIDTH - 30 - 120, y: 248, w: 120, h: 120 }, 9),
    );
  }
  out.push(...sticker(scootch('asleep', options.body), { x: 24, y: 350, w: 160, h: 160 }, 5));

  // The second word sticker, with its corner already lifting off the sheet.
  const tag: Box = { x: WIDTH - 28 - 176, y: HEIGHT - 40 - 96, w: 176, h: 96 };
  const corner = 38;
  out.push(
    ...turned(
      [
        fill(
          roundRect({ x: tag.x - 6, y: tag.y - 6, w: tag.w + 12, h: tag.h + 12 }, 28),
          '#FFFFFF',
        ),
        fill(roundRect(tag, 22), '#F0562E'),
        line(
          second,
          { ...WORD, size: 26 },
          {
            x: tag.x + tag.w / 2,
            top: tag.y + 35,
            maxWidth: tag.w - 28,
            color: '#FFFFFF',
            align: 'center',
          },
          measure,
        ),
        // The lifted corner: the sheet shows where the sticker was, and its back folds over.
        fill(
          [
            ['M', tag.x + tag.w + 6, tag.y + tag.h + 6 - corner - 6],
            ['L', tag.x + tag.w + 6, tag.y + tag.h + 6],
            ['L', tag.x + tag.w + 6 - corner - 6, tag.y + tag.h + 6],
            ['Z'],
          ],
          SHEET,
        ),
        fill(
          [
            ['M', tag.x + tag.w - corner, tag.y + tag.h],
            ['L', tag.x + tag.w, tag.y + tag.h - corner],
            ['L', tag.x + tag.w - corner, tag.y + tag.h - corner],
            ['Z'],
          ],
          '#FFFFFF',
        ),
        fill(
          [
            ['M', tag.x + tag.w - corner, tag.y + tag.h],
            ['L', tag.x + tag.w, tag.y + tag.h - corner],
            ['L', tag.x + tag.w - corner, tag.y + tag.h - corner],
            ['Z'],
          ],
          '#1C1A17',
          0.1,
        ),
      ],
      tag.x + tag.w / 2,
      tag.y + tag.h / 2,
      -6,
    ),
  );
  return { commands: out, width: WIDTH, height: HEIGHT };
}
