import {
  buildCard,
  buildStory,
  CARD_BLEED,
  CARD_HEIGHT,
  CARD_WIDTH,
  type CardLanguage,
  type CardTilt,
  type DrawCommand,
  type StoryFormat,
} from '@scootch/art';
import type { CardData } from '@scootch/domain';

/** A picture to share, as drawing commands in its own space. */
export interface ShareImage {
  readonly commands: readonly DrawCommand[];
  readonly width: number;
  readonly height: number;
}

export interface ShareImageOptions {
  /** The person's choice on the share panel: the picture then carries no task text anywhere. */
  readonly hideTask: boolean;
  readonly language: CardLanguage;
  /** The story's shape. 9:16 when left out. */
  readonly format?: StoryFormat;
  /** Where the light falls on the foil, for a card shown on screen. A shared picture is flat. */
  readonly tilt?: CardTilt;
}

/**
 * Composes what "Show someone" (the story of a catch) and "Share a card" (the card alone) send,
 * with the art package's own builders. With the task hidden the task line is taken off the card
 * before anything is drawn, as well as being switched off in the builders.
 */
export function composeShareImage(
  kind: 'story' | 'card',
  card: CardData,
  options: ShareImageOptions,
): ShareImage {
  const data: CardData = options.hideTask ? { ...card, taskLine: null } : card;
  const drawing = {
    hideTask: options.hideTask,
    language: options.language,
    ...(options.tilt ? { tilt: options.tilt } : { reducedMotion: true }),
  };
  if (kind === 'story') return buildStory(data, options.format ?? '9:16', drawing);
  return {
    commands: [
      { op: 'save' },
      { op: 'transform', matrix: [1, 0, 0, 1, CARD_BLEED, CARD_BLEED] },
      ...buildCard(data, drawing),
      { op: 'restore' },
    ],
    width: CARD_WIDTH + CARD_BLEED * 2,
    height: CARD_HEIGHT + CARD_BLEED * 2,
  };
}
