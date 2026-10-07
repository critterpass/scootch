import type { CardData } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import {
  baseline,
  estimateTextWidth,
  fitText,
  textCommand,
  type MeasureText,
  type TextStyle,
} from '../core/text';
import type { CardOptions } from './build-card';
import { buildCardShadow, buildMaterial, CARD_MATERIALS } from './build-material';
import { CARD_LABELS, formatCardDate, splitMinutes } from './labels';
import { fill, placed, roundRect, type Box } from './shapes';
import {
  fadingScreen,
  line,
  rect,
  SHARE_INK,
  SHARE_MARK,
  SHARE_PAPER,
  STAMP,
  turned,
} from './share-kit';

export interface StoryOptions extends Pick<CardOptions, 'hideTask' | 'language' | 'measure'> {
  /** What the user did, in a sentence: "Emailed the dentist." Dropped when the task is hidden. */
  readonly headline?: string;
}

/** One shared picture: its commands and the size of the space they were written in. */
export interface ShareComposition {
  readonly commands: DrawCommand[];
  readonly width: number;
  readonly height: number;
}
/** The story's own name for what every share builder returns. */
export type StoryComposition = ShareComposition;

const WIDTH = 360;
const HEIGHT = 640;
const SIDE = 22;
const TOMATO = '#F0562E';
const SECOND_INK = '#3460C8';
const MUTED = '#6F5E48';
/** The caught card on the story: where it sits, how big it is and how it leans. */
const CARD: Box = { x: 75, y: 190, w: 210, h: 292 };
const LEAN = -6;

const SHOUT: TextStyle = { font: 'rounded', size: 74, weight: 900, tracking: -0.05 };
const NAME: TextStyle = { font: 'rounded', size: 19, weight: 800, tracking: -0.02 };
const SENTENCE: TextStyle = { font: 'rounded', size: 21, weight: 800, tracking: -0.02 };
const PLUS_ONE: TextStyle = { font: 'rounded', size: 26, weight: 900 };
const PILL: TextStyle = { font: 'rounded', size: 15, weight: 800 };

/** The small caught card the story and the sticker sheet show: a monster on a finish. */
export function buildCaughtCard(
  data: CardData,
  box: Box,
  options: Pick<CardOptions, 'language' | 'measure'> = {},
): DrawCommand[] {
  const labels = CARD_LABELS[options.language ?? 'en'];
  const measure = options.measure ?? estimateTextWidth;
  const material = CARD_MATERIALS[data.finish];
  const unit = box.w / 210;
  const panel: Box = {
    x: box.x + 12 * unit,
    y: box.y + 12 * unit,
    w: box.w - 24 * unit,
    h: box.h - 76 * unit,
  };
  const monster = 180 * unit;
  const inner = box.w - 28 * unit;
  return [
    ...buildCardShadow(box, 20 * unit, material, unit),
    ...buildMaterial(box, 20 * unit, material, { unit }),
    fill(roundRect(panel, 12 * unit), '#FFFFFF', 0.55),
    { op: 'save' },
    { op: 'clip', path: roundRect(panel, 12 * unit) },
    ...placed(
      buildMonster(data.monster),
      {
        x: panel.x + (panel.w - monster) / 2,
        // The drawing's ground line is a little above the foot of its square.
        y: panel.y + panel.h - monster * 0.88,
        w: monster,
        h: monster,
      },
      VIEW_SIZE,
    ),
    { op: 'restore' },
    line(
      data.name,
      { ...NAME, size: NAME.size * unit },
      {
        x: box.x + 14 * unit,
        top: box.y + box.h - 48 * unit,
        maxWidth: inner,
        color: material.text,
        minSize: 9 * unit,
      },
      measure,
    ),
    line(
      `${labels.number(String(data.number).padStart(4, '0'))} · ${labels.finish[data.finish]}`.toUpperCase(),
      { ...STAMP, size: 9.5 * unit, tracking: 0.12 },
      {
        x: box.x + 14 * unit,
        top: box.y + box.h - 24 * unit,
        maxWidth: inner,
        color: material.sub[0],
        alpha: material.sub[1],
      },
      measure,
    ),
  ];
}

/** A bottom-anchored block of wrapped text: its last line sits just above `bottom`. */
function blockAbove(
  text: string,
  style: TextStyle,
  place: { x: number; bottom: number; maxWidth: number; maxLines: number; color: string },
  measure: MeasureText,
): DrawCommand[] {
  const fitted = fitText(
    text,
    style,
    { maxWidth: place.maxWidth, minSize: 12, maxLines: () => place.maxLines },
    measure,
  );
  const lineHeight = fitted.style.size * 1.15;
  const top = place.bottom - lineHeight * fitted.lines.length;
  return fitted.lines.map((one, index) =>
    textCommand(one, fitted.style, {
      x: place.x,
      y: baseline(top + lineHeight * index, fitted.style.size, lineHeight),
      maxWidth: place.maxWidth,
      color: place.color,
    }),
  );
}

/**
 * The share story of a catch, as a two-ink riso print: the day, "CAUGHT." a little off register,
 * the caught card in the finish the person wears, a "+1" and how long it took slapped on as
 * stickers, what they did and how long it had waited, and the scootch.app mark. Pure, like the
 * card: the same data always gives the same picture.
 */
export function buildStory(data: CardData, options: StoryOptions = {}): StoryComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const page: Box = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  const wide = WIDTH - SIDE * 2;
  const out: DrawCommand[] = [
    fill(rect(page), SHARE_PAPER),
    ...fadingScreen(page, 7, 2.1, TOMATO),
    {
      op: 'paint',
      path: rect(page),
      paint: { kind: 'grain', size: 1.2 },
      alpha: 0.3,
      blend: 'multiply',
    },
    line('SCOOTCH', STAMP, { x: SIDE, top: 24, maxWidth: wide / 2, color: SHARE_INK }, measure),
    line(
      formatCardDate(data.caughtOn, language).toUpperCase(),
      STAMP,
      { x: WIDTH - SIDE, top: 24, maxWidth: wide / 2, color: SHARE_INK, align: 'right' },
      measure,
    ),
  ];

  // The headline, printed twice: the second ink first, a few points off, then the black.
  const shout = `${labels.stamp}.`;
  const fitted = fitText(
    shout,
    SHOUT,
    { maxWidth: WIDTH - 32, minSize: 30, maxLines: () => 1 },
    measure,
  );
  const shoutAt = { x: 16, y: baseline(56, fitted.style.size, fitted.style.size * 0.9) };
  out.push(
    textCommand(fitted.lines[0] ?? shout, fitted.style, {
      x: shoutAt.x + 4,
      y: shoutAt.y + 3,
      maxWidth: WIDTH - 32,
      color: SECOND_INK,
    }),
    textCommand(fitted.lines[0] ?? shout, fitted.style, {
      ...shoutAt,
      maxWidth: WIDTH - 32,
      color: SHARE_INK,
    }),
  );

  out.push(
    ...turned(buildCaughtCard(data, CARD, options), CARD.x + CARD.w / 2, CARD.y + CARD.h / 2, LEAN),
  );

  // "+1" on a black disc with a white edge, slapped on over the card's corner.
  const disc = { x: WIDTH - 20 - 43, y: 186 + 43, r: 43 };
  out.push(
    ...turned(
      [
        fill([['O', disc.x, disc.y, disc.r + 5]], '#FFFFFF'),
        fill([['O', disc.x, disc.y, disc.r]], SHARE_INK),
        line(
          '+1',
          PLUS_ONE,
          { x: disc.x, top: disc.y - 24, maxWidth: 70, color: '#FBF8F3', align: 'center' },
          measure,
        ),
        line(
          labels.shelf,
          { ...STAMP, size: 9 },
          { x: disc.x, top: disc.y + 8, maxWidth: 70, color: '#FBF8F3', align: 'center' },
          measure,
        ),
      ],
      disc.x,
      disc.y,
      12,
    ),
  );

  // How long it took, on a yellow pill.
  const [hours, minutes] = splitMinutes(data.catchMinutes);
  const took = labels.took(labels.durationLong(hours, minutes));
  const tookWidth = Math.min(200, measure(took, PILL) + 28);
  const pill: Box = { x: WIDTH - 18 - tookWidth, y: 500, w: tookWidth, h: 33 };
  out.push(
    ...turned(
      [
        fill(
          roundRect({ x: pill.x - 4, y: pill.y - 4, w: pill.w + 8, h: pill.h + 8 }, 21),
          '#FFFFFF',
        ),
        fill(roundRect(pill, 17), '#FFD66B'),
        line(
          took,
          PILL,
          {
            x: pill.x + pill.w / 2,
            top: pill.y + 9,
            maxWidth: pill.w - 20,
            color: SHARE_INK,
            align: 'center',
          },
          measure,
        ),
      ],
      pill.x + pill.w / 2,
      pill.y + pill.h / 2,
      -8,
    ),
  );

  const did = options.hideTask ? undefined : options.headline;
  out.push(
    ...blockAbove(
      `${did ?? labels.storyHeadline} ${labels.storyWaited(labels.days(data.daysLurked))}`,
      SENTENCE,
      { x: SIDE, bottom: HEIGHT - 50, maxWidth: wide, maxLines: 2, color: SHARE_INK },
      measure,
    ),
    line(SHARE_MARK, STAMP, { x: SIDE, top: HEIGHT - 37, maxWidth: wide, color: MUTED }, measure),
  );
  return { commands: out, width: WIDTH, height: HEIGHT };
}
