import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { baseline, estimateTextWidth, fitText, textCommand, type TextStyle } from '../core/text';
import { buildScootch } from '../scootch/build-scootch';
import type { CardOptions } from './build-card';
import type { ShareComposition } from './build-story';
import { CARD_LABELS } from './labels';
import { dotScreen, fill, placed, roundRect, type Box } from './shapes';
import {
  FRAME_LOOKS,
  framePage,
  frameStrip,
  frameWords,
  STORY,
  STRIP,
  type ShareFrame,
} from './share-frame';
import { line, SHARE_MARK } from './share-kit';

/** One day's credit on the sleeve: the instrument it added, and the thing that earned it. */
export interface SleeveCredit {
  /** 1 (Monday) to 7 (Sunday). */
  readonly position: number;
  /** The instrument's name, in the reader's language. */
  readonly instrument: string;
  /** The task in the person's own words; `null` when it is hidden or was never theirs to show. */
  readonly task: string | null;
}

export interface SleeveData {
  /** The week's number in its year, and the week as it is filed: `2026-W41`. */
  readonly weekNumber: number;
  readonly week: string;
  /** The name written for the week; `null` before it has one, and the sleeve says the week alone. */
  readonly name: string | null;
  readonly credits: readonly SleeveCredit[];
}

export interface SleeveOptions extends Pick<CardOptions, 'language' | 'measure'> {
  readonly frame?: ShareFrame;
}

/** The sleeve and the record half out of it, under the strip. */
const SLEEVE: Box = { x: 18, y: 42, w: 176, h: 192 };
const DISC = { x: 18 + 78 + 88, y: 42 + 8 + 88, r: 88 } as const;
const PEACH = '#FFB8A3';
const INK = '#1C1A17';
const TITLE: TextStyle = { font: 'rounded', size: 24, weight: 900, tracking: -0.03 };
const CREDIT: TextStyle = { font: 'sans', size: 9.5, weight: 500 };
const CALL: TextStyle = { font: 'rounded', size: 14, weight: 800 };

/**
 * The week's record, half out of its sleeve: the week and its bars along the top, Scootch at the
 * keys on a peach sleeve with the week's name, every day credited with the instrument it added
 * and the thing that earned it, and a play button that says what this is. With the task hidden
 * the credits name the instruments alone. Pure.
 */
export function buildSleeve(data: SleeveData, options: SleeveOptions = {}): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const frame = options.frame ?? 'velvet';
  const look = FRAME_LOOKS[frame];
  const wide = STORY.width - STORY.side * 2;
  const sub = { color: look.sub[0], alpha: look.sub[1] };
  const title = fitText(
    data.name ?? labels.weekOf(data.weekNumber),
    TITLE,
    { maxWidth: SLEEVE.w - 24, minSize: 13, maxLines: () => 3 },
    measure,
  );
  const titleLine = title.style.size * 0.95;

  const out: DrawCommand[] = [
    ...framePage(frame),
    ...frameStrip(
      `Scootch · ${labels.weekOf(data.weekNumber)}`,
      labels.bars(data.credits.length),
      STORY.top,
      look,
      measure,
    ),
    // The record: its shadow, the vinyl with its grooves, the label and the hole.
    fill([['O', DISC.x, DISC.y + 6, DISC.r]], '#000000', 0.25),
    fill([['O', DISC.x, DISC.y, DISC.r]], INK),
    ...Array.from({ length: 14 }, (_, ring): DrawCommand => ({
      op: 'stroke',
      path: roundRect(
        {
          x: DISC.x - (36 + ring * 3.6),
          y: DISC.y - (36 + ring * 3.6),
          w: (36 + ring * 3.6) * 2,
          h: (36 + ring * 3.6) * 2,
        },
        36 + ring * 3.6,
      ),
      color: '#3A3531',
      alpha: 1,
      width: 1.2,
    })),
    fill([['O', DISC.x, DISC.y, 30]], PEACH),
    fill([['O', DISC.x, DISC.y, 3.5]], INK),
    // The sleeve over it.
    fill(
      roundRect({ x: SLEEVE.x + 4, y: SLEEVE.y + 5, w: SLEEVE.w - 8, h: SLEEVE.h }, 6),
      INK,
      0.16,
    ),
    fill(roundRect(SLEEVE, 6), PEACH),
    { op: 'save' },
    { op: 'clip', path: roundRect(SLEEVE, 6) },
    fill(dotScreen(SLEEVE, 7, 1.2), INK, 0.2),
    ...placed(
      buildScootch(
        { mood: 'working', attitude: 'cheeky', workMode: 'music', reducedMotion: true },
        undefined,
        { tone: 'paper' },
      ),
      { x: SLEEVE.x + SLEEVE.w - 98, y: SLEEVE.y - 8, w: 120, h: 120 },
      VIEW_SIZE,
    ),
    { op: 'restore' },
    textCommand(
      labels.sideA,
      { font: 'sans', size: 7.5, weight: 700, tracking: 0.14 },
      {
        x: SLEEVE.x + 12,
        y: baseline(SLEEVE.y + 12, 7.5, 7.5),
        maxWidth: 80,
        color: INK,
      },
    ),
    ...title.lines.map((one, index) =>
      textCommand(one, title.style, {
        x: SLEEVE.x + 12,
        y: baseline(
          SLEEVE.y + SLEEVE.h - 12 - titleLine * (title.lines.length - index),
          title.style.size,
          titleLine,
        ),
        maxWidth: SLEEVE.w - 24,
        color: INK,
      }),
    ),
  ];

  // The credits: the day, the instrument it added, and the thing that earned it.
  const creditsTop = SLEEVE.y + SLEEVE.h + 20;
  data.credits.slice(0, 7).forEach((credit, index) => {
    const top = creditsTop + index * 16;
    const day = (labels.weekdays[credit.position % 7] ?? '').toUpperCase();
    out.push(
      textCommand(day, CREDIT, {
        x: STORY.side,
        y: baseline(top, CREDIT.size, CREDIT.size),
        maxWidth: 30,
        ...sub,
      }),
      line(
        credit.instrument,
        { ...CREDIT, weight: 700 },
        { x: STORY.side + 34, top, maxWidth: 56, color: look.ink, minSize: 7 },
        measure,
      ),
    );
    if (credit.task !== null) {
      const fitted = fitText(
        credit.task,
        CREDIT,
        { maxWidth: wide - 98, minSize: CREDIT.size, maxLines: () => 1 },
        measure,
      );
      out.push(
        textCommand(fitted.lines[0] ?? '', CREDIT, {
          x: STORY.side + 98,
          y: baseline(top, CREDIT.size, CREDIT.size),
          maxWidth: wide - 98,
          ...sub,
        }),
      );
    }
  });

  const footTop = STORY.height - STORY.foot - STRIP.size;
  const callTop = footTop - 12 - 34;
  const play = { x: STORY.side + 17, y: callTop + 17 };
  out.push(
    fill([['O', play.x, play.y, 17]], look.ink),
    fill(
      [
        ['M', play.x - 3.5, play.y - 6],
        ['L', play.x + 6.5, play.y],
        ['L', play.x - 3.5, play.y + 6],
        ['Z'],
      ],
      look.knocked,
    ),
    ...frameWords(
      labels.pressPlay,
      CALL,
      { x: STORY.side + 44, top: callTop + 1, maxWidth: wide - 44, maxLines: 2, lineHeight: 1.2 },
      { ...look, second: null },
      measure,
    ).commands,
    ...frameStrip(SHARE_MARK, data.week, footTop, look, measure),
  );
  return { commands: out, width: STORY.width, height: STORY.height };
}
