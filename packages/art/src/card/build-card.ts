import type { CardData, CardFinish } from '@scootch/domain';

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
import { buildScootch } from '../scootch/build-scootch';
import { oneLine, pushLines, type LinePlace } from './card-lines';
import { buildTiles, TILE_HEIGHT } from './card-tiles';
import type { CardFinishInks } from './finish';
import * as finishes from './finishes/index.generated';
import { buildFoil, FLAT, type CardTilt } from './foil';
import { CARD_LABELS, formatCardDate, type CardLanguage } from './labels';
import { dashedRule, dotScreen, fill, placed, roundRect, type Box } from './shapes';
import { buildStamp, stampCentre } from './stamp';

/** Every finish of the contract, one file each in the finishes folder. */
export const CARD_FINISHES: Record<CardFinish, CardFinishInks> = finishes;

/** The card's own drawing space. The stamp hangs over the right edge by up to `CARD_BLEED`. */
export const CARD_WIDTH = 330;
export const CARD_HEIGHT = 462;
export const CARD_BLEED = 18;

export interface CardOptions {
  /** The user's privacy choice: the card then carries no task text anywhere. */
  readonly hideTask?: boolean;
  /** A monster not caught yet: no stamp, no catch time, "Not caught yet". */
  readonly wild?: boolean;
  /** The language of the few fixed labels. English when left out. */
  readonly language?: CardLanguage;
  /** Where the light falls on the foil, from device motion. Flat when left out. */
  readonly tilt?: CardTilt;
  /** Keeps the foil where it rests, whatever the tilt. */
  readonly reducedMotion?: boolean;
  /** The renderer's text measure. A font-free estimate when left out. */
  readonly measure?: MeasureText;
}

const FACE: Box = { x: 9, y: 9, w: 312, h: 444 };
const FACE_RADIUS = 15;
const LEFT = 23;
const RIGHT = 307;
const WIDTH = RIGHT - LEFT;
const TOP = 23;
const GAP = 9;
const PANEL_HEIGHT = 188;
const MONSTER_SIZE = 210;
const RULE_Y = 412.5;
const FOOT_Y = 431;

const NAME: TextStyle = { font: 'rounded', size: 19, weight: 700, tracking: -0.015 };
const KIND: TextStyle = { font: 'sans', size: 11, weight: 600, tracking: 0.04 };
const NUMBER: TextStyle = { font: 'rounded', size: 13, weight: 700 };
const PILL: TextStyle = { font: 'sans', size: 11, weight: 600 };
const FLAVOUR: TextStyle = { font: 'rounded', size: 13, weight: 500, italic: true };
const FOOT: TextStyle = { font: 'sans', size: 11, weight: 500 };
const MARK: TextStyle = { font: 'sans', size: 11, weight: 700 };

/**
 * A card in the layers a screen needs to bring it to life: a live monster goes between `under`
 * and `over`, a moving foil over the face, and the stamp can come down by itself.
 */
export interface CardLayers {
  /** The frame, the paper, the header and the dotted panel. */
  readonly under: DrawCommand[];
  /** The panel the monster stands in; it is clipped to this, with a corner radius of 11. */
  readonly panel: Box;
  /** Where the monster's square drawing space goes. */
  readonly monster: Box;
  /** The panel's edge, the task line, the stats, the flavour text and the foot. */
  readonly over: DrawCommand[];
  /** The paper the foil lies on, and its corner radius. */
  readonly face: Box;
  readonly faceRadius: number;
  /** The stamp, and the point it turns about. Empty for a wild card. */
  readonly stamp: DrawCommand[];
  readonly stampCentre: { readonly x: number; readonly y: number };
}

/** The card in layers, in the same 330 by 462 space and with the same content as `buildCard`. */
export function buildCardLayers(data: CardData, options: CardOptions = {}): CardLayers {
  const inks = CARD_FINISHES[data.finish];
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  let out: DrawCommand[] = [];
  const lines = (
    text: string,
    style: TextStyle,
    box: Parameters<typeof fitText>[2],
    place: LinePlace,
  ): number => pushLines(out, measure, text, style, box, place);

  out.push(
    fill(roundRect({ x: 0, y: 0, w: CARD_WIDTH, h: CARD_HEIGHT }, 22), inks.frame),
    fill(roundRect(FACE, FACE_RADIUS), inks.paper),
  );

  // Name, kind and number.
  const number = fitText(
    labels.number(String(data.number).padStart(3, '0')),
    NUMBER,
    oneLine(9, 84),
    measure,
  );
  const numberText = number.lines[0] ?? '';
  out.push(
    textCommand(numberText, number.style, {
      x: RIGHT,
      y: baseline(TOP + 1, number.style.size, number.style.size),
      maxWidth: 84,
      color: inks.muted,
      align: 'right',
    }),
  );
  const headWidth = WIDTH - 8 - measure(numberText, number.style);
  // A name that is a little too long for one line shrinks to stay on it; a longer one wraps.
  const nameOnOneLine = fitText(data.name, NAME, oneLine(16, headWidth), measure);
  const nameHeight = lines(
    data.name,
    NAME,
    nameOnOneLine.lines[0]?.endsWith('…')
      ? { maxWidth: headWidth, minSize: 13, maxLines: () => 2 }
      : oneLine(16, headWidth),
    { x: LEFT, top: TOP, leading: 1.08, color: inks.ink },
  );
  const kindHeight = lines(
    `${data.title} · ${labels.rarity[data.rarity]}`.toUpperCase(),
    KIND,
    { maxWidth: headWidth, minSize: 8, maxLines: () => 2 },
    { x: LEFT, top: TOP + nameHeight + 3, leading: 1.1, color: inks.muted },
  );

  // The monster on its dotted panel, with the task in the user's words.
  const panel: Box = {
    x: LEFT,
    y: TOP + nameHeight + 3 + kindHeight + GAP,
    w: WIDTH,
    h: PANEL_HEIGHT,
  };
  const panelPath = roundRect(panel, 11);
  out.push(
    fill(panelPath, inks.panel),
    { op: 'save' },
    { op: 'clip', path: panelPath },
    fill(dotScreen(panel, 9, 1.4), inks.panelDot, 0.22),
    { op: 'restore' },
  );
  const under = out;
  const monster: Box = {
    x: panel.x + (panel.w - MONSTER_SIZE) / 2,
    y: panel.y + panel.h - MONSTER_SIZE,
    w: MONSTER_SIZE,
    h: MONSTER_SIZE,
  };
  out = [];
  out.push({
    op: 'stroke',
    path: roundRect({ x: panel.x + 0.5, y: panel.y + 0.5, w: panel.w - 1, h: panel.h - 1 }, 10.5),
    color: inks.ink,
    alpha: 0.08,
    width: 1,
  });
  if (data.taskLine !== null && !options.hideTask) {
    // Short enough to end before the stamp, wherever the header puts the panel.
    const maxWidth = 196;
    const task = fitText(`“${data.taskLine}”`, PILL, oneLine(PILL.size, maxWidth), measure);
    const text = task.lines[0] ?? '';
    const pill: Box = { x: panel.x + 10, y: panel.y + 10, w: measure(text, PILL) + 16, h: 21 };
    out.push(
      fill(roundRect(pill, 10.5), inks.pill, 0.8),
      textCommand(text, PILL, {
        x: pill.x + 8,
        y: baseline(pill.y + 5, PILL.size, PILL.size),
        maxWidth,
        color: inks.pillInk,
      }),
    );
  }

  // Lurked, dread and catch time.
  const tileY = panel.y + panel.h + GAP;
  out.push(
    ...buildTiles(data, labels, inks, measure, {
      left: LEFT,
      top: tileY,
      width: WIDTH,
      wild: options.wild === true,
    }),
  );

  // Flavour text takes what is left above the foot, shrinking before it is ever cut.
  const flavourTop = tileY + TILE_HEIGHT + GAP;
  const room = RULE_Y - GAP + 2 - flavourTop;
  lines(
    data.flavourText,
    FLAVOUR,
    { maxWidth: WIDTH, minSize: 8, maxLines: (size) => Math.floor(room / (size * 1.38)) },
    { x: LEFT, top: flavourTop, leading: 1.38, color: inks.flavour },
  );

  // The foot: Scootch, who caught it and when, and where the card comes from.
  const mark = 'scootch.app';
  const footLeft = LEFT + 32;
  const footWidth = RIGHT - footLeft - 6 - measure(mark, MARK);
  out.push(
    {
      op: 'stroke',
      path: dashedRule(LEFT, RIGHT, RULE_Y, 3, 3),
      color: inks.ink,
      alpha: 0.15,
      width: 1,
    },
    ...placed(
      buildScootch({ mood: 'pleased', attitude: 'cheeky', workMode: null, reducedMotion: true }),
      { x: LEFT - 4, y: FOOT_Y - 16, w: 30, h: 30 },
      VIEW_SIZE,
    ),
    textCommand(mark, MARK, {
      x: RIGHT,
      y: baseline(FOOT_Y - MARK.size / 2, MARK.size, MARK.size),
      maxWidth: measure(mark, MARK),
      color: inks.ink,
      align: 'right',
    }),
  );
  lines(
    options.wild ? labels.notCaughtYet : labels.caughtBy(formatCardDate(data.caughtOn, language)),
    FOOT,
    oneLine(7, footWidth),
    { x: footLeft, top: FOOT_Y - FOOT.size / 2, leading: 1, color: inks.muted },
  );

  return {
    under,
    panel,
    monster,
    over: out,
    face: FACE,
    faceRadius: FACE_RADIUS,
    stamp: options.wild ? [] : buildStamp(labels.stamp, inks, measure),
    stampCentre: stampCentre(labels.stamp, measure),
  };
}

/**
 * Describes one card as drawing commands, in a 330 by 462 space. Pure: the same data and options
 * always give the same list. A finish changes colours only; the layout and the content are the
 * same in all five.
 */
export function buildCard(data: CardData, options: CardOptions = {}): DrawCommand[] {
  const layers = buildCardLayers(data, options);
  const tilt = options.reducedMotion ? FLAT : (options.tilt ?? FLAT);
  return [
    // The monster stands inside the panel's clip, which `under` closes with its last command.
    ...layers.under.slice(0, -1),
    ...placed(buildMonster(data.monster), layers.monster, VIEW_SIZE),
    { op: 'restore' },
    ...layers.over,
    ...buildFoil(layers.face, layers.faceRadius, CARD_FINISHES[data.finish], tilt),
    ...layers.stamp,
  ];
}
