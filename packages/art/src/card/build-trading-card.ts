import type { CardData } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { estimateTextWidth, type TextStyle } from '../core/text';
import type { CardOptions } from './build-card';
import { buildCardShadow, buildMaterial, CARD_MATERIALS, type CardLean } from './build-material';
import type { ShareComposition } from './build-story';
import { CARD_LABELS, formatCardDate, splitMinutes } from './labels';
import { dotScreen, fill, placed, roundRect, type Box } from './shapes';
import { leader, line, STAMP } from './share-kit';

export interface TradingCardOptions extends Pick<CardOptions, 'language' | 'measure'> {
  /** The time of the catch as the user's clock showed it, "09:41". Left out, only the day prints. */
  readonly time?: string;
  /** How the card is held, for a frame of it turning. Level when left out. */
  readonly lean?: CardLean;
}

/** The board's trading card is 300 by 420; the picture leaves room round it for its shadow. */
export const TRADING_CARD = { width: 300, height: 420, margin: 30 } as const;
const FACE: Box = {
  x: TRADING_CARD.margin,
  y: TRADING_CARD.margin,
  w: TRADING_CARD.width,
  h: TRADING_CARD.height,
};
const PAD = 16;
const NAME: TextStyle = { font: 'rounded', size: 28, weight: 900, tracking: -0.03 };
const FACT: TextStyle = { font: 'sans', size: 11.5, weight: 500, tracking: 0.02 };
const HEAD: TextStyle = { ...STAMP, size: 10 };

/**
 * A catch as a trading card on the finish the person wears: its kind and how it was earned
 * across the top, the monster in a dotted panel, its name, three true facts with dotted leaders
 * (how long it lurked, when it was caught, how long the fight took), then its number and the
 * finish. No task text is ever on it. The lean moves the light and nothing else.
 */
export function buildTradingCard(
  data: CardData,
  options: TradingCardOptions = {},
): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const material = CARD_MATERIALS[data.finish];
  const left = FACE.x + PAD;
  const right = FACE.x + FACE.w - PAD;
  const inner = FACE.w - PAD * 2;
  const sub = { color: material.sub[0], alpha: material.sub[1] };
  const panel: Box = { x: left, y: FACE.y + 38, w: inner, h: 206 };
  const [hours, minutes] = splitMinutes(data.catchMinutes);
  const day = formatCardDate(data.caughtOn, language);
  const facts: readonly (readonly [string, string])[] = [
    [labels.lurked, labels.days(data.daysLurked)],
    [labels.caught, options.time ? `${day.split(/[ ,]/)[0] ?? day} ${options.time}` : day],
    [labels.fight, labels.duration(hours, minutes)],
  ];
  const out: DrawCommand[] = [
    ...buildCardShadow(FACE, 24, material),
    ...buildMaterial(FACE, 24, material, options.lean ? { lean: options.lean } : {}),
    line(
      data.title.toUpperCase(),
      HEAD,
      { x: left, top: FACE.y + PAD, maxWidth: inner * 0.66, ...sub },
      measure,
    ),
    line(
      labels.rarity[data.rarity].toUpperCase(),
      HEAD,
      { x: right, top: FACE.y + PAD, maxWidth: inner * 0.3, align: 'right', ...sub },
      measure,
    ),
    fill(roundRect(panel, 14), '#F6F3EE'),
    { op: 'save' },
    { op: 'clip', path: roundRect(panel, 14) },
    fill(dotScreen(panel, 11, 1.4), '#1C1A17', 0.12),
    ...placed(
      buildMonster(data.monster),
      { x: panel.x + (panel.w - 200) / 2, y: panel.y + panel.h - 176, w: 200, h: 200 },
      VIEW_SIZE,
    ),
    { op: 'restore' },
    line(
      data.name,
      NAME,
      { x: left, top: panel.y + panel.h + 12, maxWidth: inner, color: material.text, minSize: 13 },
      measure,
    ),
  ];
  facts.forEach(([label, value], index) => {
    const top = panel.y + panel.h + 54 + index * 18;
    const from = left + measure(label, FACT) + 6;
    const to = right - measure(value, FACT) - 6;
    out.push(
      line(label, FACT, { x: left, top, maxWidth: inner / 2, color: material.text }, measure),
      fill(leader(from, to, top + 9), material.text, 0.45),
      line(
        value,
        FACT,
        { x: right, top, maxWidth: inner / 2, color: material.text, align: 'right' },
        measure,
      ),
    );
  });
  const foot = FACE.y + FACE.h - PAD - 10;
  out.push(
    line(
      labels.number(String(data.number).padStart(4, '0')).toUpperCase(),
      HEAD,
      { x: left, top: foot, maxWidth: inner / 2, ...sub },
      measure,
    ),
    line(
      labels.finish[data.finish].toUpperCase(),
      HEAD,
      { x: right, top: foot, maxWidth: inner / 2, align: 'right', ...sub },
      measure,
    ),
  );
  return {
    commands: out,
    width: TRADING_CARD.width + TRADING_CARD.margin * 2,
    height: TRADING_CARD.height + TRADING_CARD.margin * 2,
  };
}
