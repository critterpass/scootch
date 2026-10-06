import type { CardData } from '@scootch/domain';

import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import {
  baseline,
  estimateTextWidth,
  fitText,
  textCommand,
  type TextBox,
  type TextStyle,
} from '../core/text';
import { buildScootch } from '../scootch/build-scootch';
import { buildCard, CARD_HEIGHT, CARD_WIDTH, type CardOptions } from './build-card';
import { CARD_LABELS, formatCardDate, splitMinutes } from './labels';
import { dotScreen, fill, placed, roundRect, type Box } from './shapes';

export type StoryFormat = '4:5' | '9:16';

export interface StoryOptions extends Omit<CardOptions, 'wild'> {
  /** What the user did, in a sentence: "I finally emailed the dentist." Dropped when the task is hidden. */
  readonly headline?: string;
  /** The time of the catch as the user's clock showed it, "14:52". */
  readonly time?: string;
}

export interface StoryComposition {
  readonly commands: DrawCommand[];
  readonly width: number;
  readonly height: number;
}

interface StoryLayout {
  readonly width: number;
  readonly height: number;
  readonly text: { readonly x: number; readonly top: number; readonly width: number };
  readonly headline: { readonly size: number; readonly lines: number };
  /** How many lines the last sentence may take before it would reach the card. */
  readonly subLines: number;
  /** The card's top centre, its scale and its lean. */
  readonly card: { readonly cx: number; readonly top: number; readonly scale: number };
  readonly scootch: Box;
}

/** 9:16 is the design's story; 4:5 keeps its parts and sets the text beside the card. */
const LAYOUTS: Record<StoryFormat, StoryLayout> = {
  '9:16': {
    width: 360,
    height: 640,
    text: { x: 26, top: 34, width: 308 },
    headline: { size: 38, lines: 3 },
    subLines: 2,
    card: { cx: 180, top: 214, scale: 0.74 },
    scootch: { x: -6, y: 498, w: 150, h: 150 },
  },
  '4:5': {
    width: 512,
    height: 640,
    text: { x: 28, top: 44, width: 180 },
    headline: { size: 34, lines: 5 },
    subLines: 4,
    card: { cx: 342, top: 112, scale: 0.76 },
    scootch: { x: 10, y: 474, w: 172, h: 172 },
  },
};

const PAPER = '#F3E6D3';
const DOT = '#F0562E';
const INK = '#1C1A17';
const MUTED = '#6F6A62';
const LEAN = (-5 * Math.PI) / 180;

const KICKER: TextStyle = { font: 'sans', size: 12, weight: 600, tracking: 0.06 };
const HEADLINE: TextStyle = { font: 'rounded', size: 38, weight: 800, tracking: -0.03 };
const SUB: TextStyle = { font: 'sans', size: 15, weight: 500 };
const MARK: TextStyle = { font: 'sans', size: 14, weight: 700 };

/**
 * The share story of a catch: when, what the user did, how long it took and how long it had
 * waited, with the card as the hero, Scootch cheering and the scootch.app mark. Pure, like the card.
 */
export function buildStory(
  data: CardData,
  format: StoryFormat,
  options: StoryOptions = {},
): StoryComposition {
  const layout = LAYOUTS[format];
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const { x, width } = layout.text;
  const out: DrawCommand[] = [];
  let top = layout.text.top;
  const block = (
    text: string,
    style: TextStyle,
    box: TextBox,
    leading: number,
    color: string,
  ): void => {
    const fitted = fitText(text, style, box, measure);
    const lineHeight = fitted.style.size * leading;
    for (const line of fitted.lines) {
      out.push(
        textCommand(line, fitted.style, {
          x,
          y: baseline(top, fitted.style.size, lineHeight),
          maxWidth: box.maxWidth,
          color,
        }),
      );
      top += lineHeight;
    }
    top += 8;
  };

  const frame: Box = { x: 0, y: 0, w: layout.width, h: layout.height };
  out.push(fill(roundRect(frame, 0), PAPER), fill(dotScreen(frame, 12, 1.5), DOT, 0.18));

  const date = formatCardDate(data.caughtOn, language).toUpperCase();
  const headline = options.hideTask ? undefined : options.headline;
  const [hours, minutes] = splitMinutes(data.catchMinutes);
  block(
    options.time ? `${date} · ${options.time}` : date,
    KICKER,
    { maxWidth: width, minSize: 8, maxLines: () => 1 },
    1,
    MUTED,
  );
  block(
    headline ?? labels.storyHeadline,
    { ...HEADLINE, size: layout.headline.size },
    { maxWidth: width, minSize: 18, maxLines: () => layout.headline.lines },
    1.02,
    INK,
  );
  block(
    `${labels.storyTook(labels.durationLong(hours, minutes))} ${labels.storyWaited(labels.days(data.daysLurked))}`,
    SUB,
    { maxWidth: width, minSize: 11, maxLines: () => layout.subLines },
    1.3,
    MUTED,
  );

  const { cx, scale } = layout.card;
  const c = Math.cos(LEAN) * scale;
  const s = Math.sin(LEAN) * scale;
  out.push(
    { op: 'save' },
    {
      op: 'transform',
      matrix: [c, s, -s, c, cx - (CARD_WIDTH / 2) * c, layout.card.top - (CARD_WIDTH / 2) * s],
    },
    fill(roundRect({ x: 4, y: 16, w: CARD_WIDTH - 8, h: CARD_HEIGHT }, 26), INK, 0.14),
    ...buildCard(data, { ...options, wild: false }),
    { op: 'restore' },
    ...placed(
      buildScootch({
        mood: 'celebrating',
        attitude: 'cheeky',
        workMode: null,
        reducedMotion: true,
      }),
      layout.scootch,
      VIEW_SIZE,
    ),
  );

  const mark = 'scootch.app';
  const pill: Box = { x: layout.width - 22 - 117, y: layout.height - 30 - 40, w: 117, h: 40 };
  out.push(
    fill(roundRect({ ...pill, y: pill.y + 3 }, 20), INK, 0.08),
    fill(roundRect(pill, 20), '#FBF8F2', 0.9),
    textCommand(mark, MARK, {
      x: pill.x + pill.w / 2,
      y: baseline(pill.y + 13, MARK.size, MARK.size),
      maxWidth: pill.w - 16,
      color: INK,
      align: 'center',
    }),
  );
  return { commands: out, width: layout.width, height: layout.height };
}
