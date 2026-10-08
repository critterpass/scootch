import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { baseline, estimateTextWidth, textCommand, type TextStyle } from '../core/text';
import { buildScootch } from '../scootch/build-scootch';
import type { CardOptions } from './build-card';
import type { ShareComposition } from './build-story';
import { CARD_LABELS } from './labels';
import { dotScreen, fill, placed, roundRect, rotation, type Box } from './shapes';
import {
  FRAME_LOOKS,
  framePage,
  frameStrip,
  frameWords,
  STORY,
  STRIP,
  type ShareFrame,
} from './share-frame';
import { SHARE_MARK } from './share-kit';

export interface PostcardData {
  /** How many finished things live in the world. */
  readonly things: number;
  /** The month and year on the postmark. */
  readonly month: number;
  readonly year: number;
  /** The world itself, drawn in a square space of `sceneSize`: the island with Scootch on it. */
  readonly scene: readonly DrawCommand[];
  readonly sceneSize: number;
}

export interface PostcardOptions extends Pick<CardOptions, 'language' | 'measure'> {
  readonly frame?: ShareFrame;
}

/** The picture side: a bordered view of the world, 234 wide, under the greeting. */
const VIEW: Box = { x: 18, y: 112, w: 234, h: 268 };
const BORDER = '#FBF8F3';
const TOMATO = '#F0562E';
const INK = '#1C1A17';
const GREETING: TextStyle = { font: 'rounded', size: 18, weight: 800 };
const PLACE: TextStyle = { font: 'rounded', size: 48, weight: 900, tracking: -0.045 };
const SENTENCE: TextStyle = { font: 'rounded', size: 16, weight: 800 };
const MARK: TextStyle = { font: 'sans', size: 7, weight: 700, tracking: 0.1 };

/**
 * A postcard from the world: "Greetings from my world.", the island with everything living on
 * it behind a paper border, a postage stamp with Scootch on it and a postmark that counts what
 * lives there, and one sentence that says so. It names no task. Pure.
 */
export function buildPostcard(data: PostcardData, options: PostcardOptions = {}): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const frame = options.frame ?? 'paper';
  const look = FRAME_LOOKS[frame];
  const wide = STORY.width - STORY.side * 2;
  const sub = { color: look.sub[0], alpha: look.sub[1] };
  const month = (labels.months[data.month - 1] ?? '').slice(0, 3);
  const inner: Box = { x: VIEW.x + 6, y: VIEW.y + 6, w: VIEW.w - 12, h: VIEW.h - 12 };
  // The island stands at the foot of the view, a little wider than it, as the board crops it.
  const island = 300;
  const stamp: Box = { x: VIEW.x + VIEW.w - 12 - 50, y: VIEW.y + 12, w: 50, h: 60 };
  const postmark = { x: stamp.x - 6, y: stamp.y + 66, r: 33 };

  const out: DrawCommand[] = [
    ...framePage(frame),
    ...frameStrip(
      `Scootch · ${labels.myWorld}`,
      labels.things(data.things),
      STORY.top,
      look,
      measure,
    ),
    textCommand(labels.greetingsFrom, GREETING, {
      x: STORY.side,
      y: baseline(42, GREETING.size, GREETING.size),
      maxWidth: wide,
      ...sub,
    }),
    ...frameWords(
      labels.myWorldName,
      PLACE,
      { x: STORY.side - 2, top: 64, maxWidth: wide + 4, maxLines: 1, lineHeight: 0.9, minSize: 22 },
      look,
      measure,
    ).commands,
    // The view: its soft shadow, its paper border, and the sky going to sand.
    fill(roundRect({ x: VIEW.x + 3, y: VIEW.y + 10, w: VIEW.w - 6, h: VIEW.h }, 10), INK, 0.18),
    fill(roundRect(VIEW, 10), BORDER),
    { op: 'save' },
    { op: 'clip', path: roundRect(inner, 6) },
    {
      op: 'paint',
      path: roundRect(inner, 6),
      paint: {
        kind: 'linear',
        from: [inner.x, inner.y],
        to: [inner.x, inner.y + inner.h],
        stops: [
          [0, '#F3EADB', 1],
          [1, '#DFCFB6', 1],
        ],
      },
      alpha: 1,
      blend: 'normal',
    },
    ...placed(
      data.scene,
      { x: VIEW.x + (VIEW.w - island) / 2, y: VIEW.y + VIEW.h + 34 - island, w: island, h: island },
      data.sceneSize,
    ),
    { op: 'restore' },
    // The postage stamp, leaning: Scootch, pale on tomato, in a paper edge.
    { op: 'save' },
    { op: 'transform', matrix: rotation(stamp.x + stamp.w / 2, stamp.y + stamp.h / 2, 4) },
    fill(roundRect({ x: stamp.x + 1, y: stamp.y + 3, w: stamp.w, h: stamp.h }, 2), INK, 0.2),
    fill(roundRect(stamp, 2), BORDER),
    fill(roundRect({ x: stamp.x + 4, y: stamp.y + 4, w: stamp.w - 8, h: stamp.h - 8 }, 1), TOMATO),
    fill(
      dotScreen({ x: stamp.x + 4, y: stamp.y + 4, w: stamp.w - 8, h: stamp.h - 8 }, 5, 0.9),
      BORDER,
      0.35,
    ),
    { op: 'save' },
    {
      op: 'clip',
      path: roundRect({ x: stamp.x + 4, y: stamp.y + 4, w: stamp.w - 8, h: stamp.h - 8 }, 1),
    },
    ...placed(
      buildScootch(
        { mood: 'pleased', attitude: 'cheeky', workMode: null, reducedMotion: true },
        undefined,
        { tone: 'paper' },
      ),
      { x: stamp.x + 3, y: stamp.y + 14, w: 44, h: 44 },
      VIEW_SIZE,
    ),
    { op: 'restore' },
    { op: 'restore' },
    // The postmark over the stamp's corner: what lives here, and when this was sent.
    { op: 'save' },
    { op: 'transform', matrix: rotation(postmark.x, postmark.y, -14) },
    {
      op: 'stroke',
      path: roundRect(
        {
          x: postmark.x - postmark.r,
          y: postmark.y - postmark.r,
          w: postmark.r * 2,
          h: postmark.r * 2,
        },
        postmark.r,
      ),
      color: INK,
      alpha: 0.55,
      width: 1.5,
    },
    ...[labels.things(data.things), '★', `${month} ${data.year}`.toUpperCase()].map((text, index) =>
      textCommand(text, index === 1 ? { ...MARK, size: 9 } : MARK, {
        x: postmark.x,
        y: baseline(postmark.y - 14 + index * 10, MARK.size, MARK.size),
        maxWidth: postmark.r * 1.8,
        color: INK,
        alpha: 0.7,
        align: 'center',
      }),
    ),
    { op: 'restore' },
  ];

  const footTop = STORY.height - STORY.foot - STRIP.size;
  out.push(
    ...frameWords(
      labels.worldSentence(data.things),
      SENTENCE,
      { x: STORY.side, top: VIEW.y + VIEW.h + 12, maxWidth: wide, maxLines: 2, lineHeight: 1.2 },
      look,
      measure,
    ).commands,
    ...frameStrip(SHARE_MARK, `${data.things} / ∞`, footTop, look, measure),
  );
  return { commands: out, width: STORY.width, height: STORY.height };
}
