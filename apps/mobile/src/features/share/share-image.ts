import {
  buildCard,
  buildPoster,
  buildReceipt,
  buildStickerSheet,
  buildStory,
  buildTradingCard,
  CARD_BLEED,
  CARD_HEIGHT,
  CARD_WIDTH,
  type CardLanguage,
  type CardTilt,
  type DrawCommand,
  type ScootchBody,
} from '@scootch/art';
import type { CardData, CardFinish } from '@scootch/domain';

import type { DayLog, MonthWrap } from './share-logs';

/** A picture to share, as drawing commands in its own space. */
export interface ShareImage {
  readonly commands: readonly DrawCommand[];
  readonly width: number;
  readonly height: number;
}

/** The five things to share. A story and a card are about one catch; the rest are the person's own. */
export const SHARE_FORMATS = ['story', 'card', 'stickers', 'receipt', 'poster'] as const;
export type ShareFormat = (typeof SHARE_FORMATS)[number];

/** What the pictures wear and carry besides the catch itself. */
export interface ShareDress {
  /** The finish the person wears: every picture is printed on it. */
  readonly finish: CardFinish;
  /** The ink Scootch is printed in, when it is not tomato. */
  readonly body?: ScootchBody;
  /** The member's number, for a member. */
  readonly member: number | null;
  /** Whether Plus is on: the receipt then carries its foil stamp. */
  readonly plus: boolean;
  /** The day's done log, when the day has one. */
  readonly day: DayLog | null;
  /** Last month, wrapped, when it had catches. */
  readonly month: MonthWrap | null;
}

export interface ShareImageOptions {
  /** The person's choice on the share panel: the picture then carries no task text anywhere. */
  readonly hideTask: boolean;
  readonly language: CardLanguage;
  /** Where the light falls on the foil, for a card shown on screen. A shared picture is flat. */
  readonly tilt?: CardTilt;
}

/** The formats that can be made right now: the receipt needs a day, the poster a month. */
export function formatsOffered(dress: Pick<ShareDress, 'day' | 'month'>): ShareFormat[] {
  return SHARE_FORMATS.filter(
    (format) =>
      (format !== 'receipt' || dress.day !== null) && (format !== 'poster' || dress.month !== null),
  );
}

/**
 * One caught card as the app shows it on screen, flat: the card itself, drawn by the art
 * package's card builder. With the task hidden the task line is taken off before anything is
 * drawn, as well as being switched off in the builder.
 */
export function composeCardImage(card: CardData, options: ShareImageOptions): ShareImage {
  const data: CardData = options.hideTask ? { ...card, taskLine: null } : card;
  return {
    commands: [
      { op: 'save' },
      { op: 'transform', matrix: [1, 0, 0, 1, CARD_BLEED, CARD_BLEED] },
      ...buildCard(data, {
        hideTask: options.hideTask,
        language: options.language,
        ...(options.tilt ? { tilt: options.tilt } : { reducedMotion: true }),
      }),
      { op: 'restore' },
    ],
    width: CARD_WIDTH + CARD_BLEED * 2,
    height: CARD_HEIGHT + CARD_BLEED * 2,
  };
}

/**
 * Composes one of the five pictures, with the art package's own builders, on the finish the
 * person wears. The task's words can only ever be on the receipt, and are taken off it with the
 * rest when the task is hidden (the day's log is then built with monster names in their place).
 * A format with nothing to print (no day, no month) falls back to the story of the catch.
 */
export function composeShareImage(
  format: ShareFormat,
  card: CardData,
  options: Pick<ShareImageOptions, 'hideTask' | 'language'>,
  dress: ShareDress,
): ShareImage {
  const { language } = options;
  const worn: CardData = { ...card, taskLine: null, finish: dress.finish };
  if (format === 'card') return buildTradingCard(worn, { language });
  if (format === 'stickers') {
    return buildStickerSheet({
      language,
      finish: dress.finish,
      member: dress.member,
      monster: card.monster,
      ...(dress.body ? { body: dress.body } : {}),
    });
  }
  if (format === 'receipt' && dress.day) {
    return buildReceipt({
      language,
      ...dress.day,
      stamp: dress.plus ? dress.finish : null,
    });
  }
  if (format === 'poster' && dress.month) return buildPoster({ language, ...dress.month });
  return buildStory(worn, { language, hideTask: options.hideTask });
}
