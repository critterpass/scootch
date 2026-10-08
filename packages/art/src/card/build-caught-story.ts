import type { CardData } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { baseline, estimateTextWidth, textCommand, type TextStyle } from '../core/text';
import type { CardOptions } from './build-card';
import { buildCardShadow } from './build-material';
import type { ShareComposition } from './build-story';
import { CARD_LABELS, formatCardDate, splitMinutes } from './labels';
import { paper } from './materials/paper';
import { dashedRule, dotScreen, fill, placed, roundRect, rotation, type Box } from './shapes';
import {
  FRAME_LOOKS,
  framePage,
  frameStrip,
  frameWords,
  roundStamp,
  STORY,
  STRIP,
  type ShareFrame,
} from './share-frame';
import { line, SHARE_MARK } from './share-kit';

export interface CaughtStoryOptions extends Pick<CardOptions, 'hideTask' | 'language' | 'measure'> {
  /** The frame it is printed on. Paper when it is not said. */
  readonly frame?: ShareFrame;
  /** What the person did, in a sentence: "Emailed the dentist." Dropped when the task is hidden. */
  readonly headline?: string;
}

/** The caught card on the story: 148 by 200, leaning five degrees, on its own paper. */
const CARD: Box = { x: 61, y: 120, w: 148, h: 200 };
const CARD_PAPER = '#FBF8F3';
const CARD_PANEL = '#F3E6D3';
const CARD_INK = '#1C1A17';
const CARD_SUB = '#6F6A62';
const TOMATO = '#F0562E';
const SHOUT: TextStyle = { font: 'rounded', size: 56, weight: 900, tracking: -0.055 };
const SENTENCE: TextStyle = { font: 'rounded', size: 20, weight: 800, tracking: -0.015 };
const LABEL: TextStyle = { font: 'sans', size: 7.5, weight: 700, tracking: 0.12 };
const VALUE: TextStyle = { font: 'rounded', size: 16, weight: 800 };

/** The small card in the middle of the story: its number, its monster asleep, its name. */
function miniCard(data: CardData, options: CaughtStoryOptions): DrawCommand[] {
  const labels = CARD_LABELS[options.language ?? 'en'];
  const measure = options.measure ?? estimateTextWidth;
  const inner = CARD.w - 18;
  const panel: Box = { x: CARD.x + 9, y: CARD.y + 22, w: inner, h: 132 };
  const monster = 118;
  const rarityRoom = data.rarity === 'common' ? 0 : 38;
  return [
    // Its soft shadow on the frame, then the card.
    ...buildCardShadow(CARD, 14, paper, 0.7),
    fill(roundRect(CARD, 14), CARD_PAPER),
    { op: 'stroke', path: roundRect(CARD, 14), color: CARD_INK, alpha: 0.08, width: 1 },
    line(
      labels.number(String(data.number).padStart(3, '0')).toUpperCase(),
      { ...LABEL, size: 7 },
      { x: CARD.x + 9, top: CARD.y + 9, maxWidth: inner / 2, color: CARD_SUB },
      measure,
    ),
    fill(roundRect(panel, 9), CARD_PANEL),
    { op: 'save' },
    { op: 'clip', path: roundRect(panel, 9) },
    fill(dotScreen(panel, 8, 1.2), TOMATO, 0.22),
    ...placed(
      buildMonster(data.monster, 1, { mood: 'caught' }),
      {
        x: panel.x + (panel.w - monster) / 2,
        y: panel.y + panel.h - monster,
        w: monster,
        h: monster,
      },
      VIEW_SIZE,
    ),
    { op: 'restore' },
    line(
      data.name,
      { font: 'rounded', size: 15, weight: 800 },
      {
        x: CARD.x + 9,
        top: CARD.y + 162,
        maxWidth: inner - rarityRoom,
        color: CARD_INK,
        minSize: 9,
      },
      measure,
    ),
    // The rarity's word sits at the foot: the round stamp is struck across the top corner.
    ...(data.rarity === 'common'
      ? []
      : [
          line(
            labels.rarity[data.rarity].toUpperCase(),
            { ...LABEL, size: 7 },
            {
              x: CARD.x + CARD.w - 9,
              top: CARD.y + 168,
              maxWidth: rarityRoom,
              color: TOMATO,
              align: 'right',
            },
            measure,
          ),
        ]),
    line(
      data.title,
      { font: 'sans', size: 9, weight: 500 },
      { x: CARD.x + 9, top: CARD.y + 181, maxWidth: inner, color: CARD_SUB, minSize: 7 },
      measure,
    ),
  ];
}

/**
 * The story of a catch, on one of the four frames: a stamped strip, "CAUGHT." in the frame's
 * ink, the caught card leaning with a round stamp struck across its corner, one true sentence,
 * three honest numbers, and scootch.app at the foot. With the task hidden the sentence says only
 * that the thing was done; the numbers stay. Pure: the same data always gives the same picture.
 */
export function buildCaughtStory(
  data: CardData,
  options: CaughtStoryOptions = {},
): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const frame = options.frame ?? 'paper';
  const look = FRAME_LOOKS[frame];
  const wide = STORY.width - STORY.side * 2;
  const number = labels.number(String(data.number).padStart(3, '0'));
  const [year = '', month = '', day = ''] = data.caughtOn.split('-');

  const out: DrawCommand[] = [
    ...framePage(frame),
    ...frameStrip(
      `Scootch · ${labels.stamp}`,
      formatCardDate(data.caughtOn, language),
      STORY.top,
      look,
      measure,
    ),
    ...frameWords(
      `${labels.stamp}.`,
      SHOUT,
      { x: STORY.side - 2, top: 40, maxWidth: wide + 4, maxLines: 1, lineHeight: 0.9, minSize: 26 },
      look,
      measure,
    ).commands,
    { op: 'save' },
    { op: 'transform', matrix: rotation(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2, -5) },
    ...miniCard(data, options),
    { op: 'restore' },
    ...roundStamp(
      labels.stamp,
      `${day}·${month}·${year.slice(2)}`,
      { x: 206, y: 141, r: 38, lean: 14 },
      TOMATO,
      measure,
    ),
  ];

  // From the foot up: the mark, the three numbers under a dashed rule, and the sentence.
  const footTop = STORY.height - STORY.foot - STRIP.size;
  out.push(...frameStrip(SHARE_MARK, number, footTop, look, measure));
  const valuesTop = footTop - 12 - VALUE.size;
  const labelsTop = valuesTop - 4 - LABEL.size;
  const [hours, minutes] = splitMinutes(data.catchMinutes);
  const numbers: readonly (readonly [string, string])[] = [
    [labels.lurked, labels.days(data.daysLurked)],
    [labels.caughtIn, labels.duration(hours, minutes)],
    [labels.dread, `${data.dread} / 5`],
  ];
  const column = (wide - 12) / 3;
  numbers.forEach(([label, value], index) => {
    const x = STORY.side + (column + 6) * index;
    out.push(
      textCommand(label.toUpperCase(), LABEL, {
        x,
        y: baseline(labelsTop, LABEL.size, LABEL.size),
        maxWidth: column,
        color: look.sub[0],
        alpha: look.sub[1],
      }),
      line(
        value,
        VALUE,
        { x, top: valuesTop, maxWidth: column, color: look.ink, minSize: 9 },
        measure,
      ),
    );
  });
  const ruleY = labelsTop - 10;
  out.push({
    op: 'stroke',
    path: dashedRule(STORY.side, STORY.width - STORY.side, ruleY, 4, 3),
    color: look.sub[0],
    alpha: look.sub[1],
    width: 1.5,
  });
  const did = options.hideTask ? undefined : options.headline;
  const sentence = did ?? labels.storyHeadline;
  // Two lines' room is kept, and a one-line sentence sits on the lower of them.
  const lines = measure(sentence, SENTENCE) > wide ? 2 : 1;
  out.push(
    ...frameWords(
      sentence,
      SENTENCE,
      {
        x: STORY.side,
        top: ruleY - 12 - SENTENCE.size * 1.12 * lines,
        maxWidth: wide,
        maxLines: 2,
        lineHeight: 1.12,
      },
      look,
      measure,
    ).commands,
  );
  return { commands: out, width: STORY.width, height: STORY.height };
}
