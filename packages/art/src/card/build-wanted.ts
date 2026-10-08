import type { MonsterSpec } from '@scootch/domain';

import { buildMonster } from '../core/build-monster';
import { VIEW_SIZE, type DrawCommand } from '../core/commands';
import { baseline, estimateTextWidth, fitText, textCommand, type TextStyle } from '../core/text';
import type { CardOptions } from './build-card';
import type { ShareComposition } from './build-story';
import { CARD_LABELS } from './labels';
import { dashedRule, dotScreen, fill, placed, roundRect, rotation, type Box } from './shapes';
import {
  FRAME_LOOKS,
  framePage,
  frameStrip,
  frameWords,
  STORY,
  type ShareFrame,
} from './share-frame';
import { SHARE_MARK } from './share-kit';

export interface WantedData {
  readonly monster: MonsterSpec;
  /** "Molar". */
  readonly name: string;
  /** "Keeper of Thursday". */
  readonly title: string;
  /** Which day of waiting its thing is on, from 1. The thing's days, never the person's. */
  readonly day: number;
  /** The month its thing was first mentioned in, 1 to 12. */
  readonly since: number;
}

export interface WantedOptions extends Pick<CardOptions, 'language' | 'measure'> {
  readonly frame?: ShareFrame;
}

/** The mugshot: an ink-edged tomato panel with a halftone, 184 by 172. */
const PANEL: Box = { x: 43, y: 112, w: 184, h: 172 };
const TOMATO = '#F0562E';
const INK = '#1C1A17';
const SHOUT: TextStyle = { font: 'rounded', size: 50, weight: 900, tracking: -0.045 };
const VOW: TextStyle = { font: 'rounded', size: 18, weight: 800 };
const SMALL: TextStyle = { font: 'sans', size: 11, weight: 600 };
const BANNER: TextStyle = { font: 'rounded', size: 12, weight: 900, tracking: 0.04 };
const TAB: TextStyle = { font: 'sans', size: 7, weight: 700, tracking: 0.04 };
/** Six tear-off tabs along the foot, tall enough for the mark to be read up each one. */
const TABS = { count: 6, height: 58 } as const;

/**
 * The wanted poster, for a monster that is still wild: "WANTED", how long it has been lurking,
 * its nervous face in an ink-edged panel, its name on a banner, the person's own vow to catch it
 * today, and tear-off tabs along the foot. It says nothing about the task itself, only the
 * monster's name, so there is nothing on it to hide. Pure.
 */
export function buildWanted(data: WantedData, options: WantedOptions = {}): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const frame = options.frame ?? 'riso';
  const look = FRAME_LOOKS[frame];
  const wide = STORY.width - STORY.side * 2;
  const centre = STORY.width / 2;
  const sub = { color: look.sub[0], alpha: look.sub[1] };
  const monster = 168;

  const out: DrawCommand[] = [
    ...framePage(frame),
    ...frameStrip(
      `Scootch · ${labels.stillWild}`,
      labels.seen(labels.days(data.day)),
      STORY.top,
      look,
      measure,
    ),
    ...frameWords(
      labels.wanted,
      SHOUT,
      {
        x: centre,
        top: 38,
        maxWidth: wide,
        maxLines: 1,
        lineHeight: 0.9,
        align: 'center',
        minSize: 24,
      },
      look,
      measure,
    ).commands,
    textCommand(
      fitText(
        labels.wantedFor(labels.months[data.since - 1] ?? ''),
        SMALL,
        { maxWidth: wide, minSize: 8, maxLines: () => 1 },
        measure,
      ).lines[0] ?? '',
      SMALL,
      {
        x: centre,
        y: baseline(88, SMALL.size, SMALL.size * 1.3),
        maxWidth: wide,
        align: 'center',
        ...sub,
      },
    ),
    // The mugshot.
    fill(roundRect(PANEL, 12), TOMATO),
    { op: 'save' },
    { op: 'clip', path: roundRect(PANEL, 12) },
    fill(dotScreen(PANEL, 6, 1.3), INK, 0.22),
    ...placed(
      buildMonster(data.monster, 1, { mood: 'nervous' }),
      {
        x: PANEL.x + (PANEL.w - monster) / 2,
        y: PANEL.y + PANEL.h - monster,
        w: monster,
        h: monster,
      },
      VIEW_SIZE,
    ),
    { op: 'restore' },
    {
      op: 'stroke',
      path: roundRect({ x: PANEL.x + 2, y: PANEL.y + 2, w: PANEL.w - 4, h: PANEL.h - 4 }, 10),
      color: INK,
      alpha: 1,
      width: 4,
    },
  ];

  // Its name on an ink banner, overlapping the foot of the mugshot and leaning a little.
  const name = fitText(
    `${data.name}, ${data.title}`.toUpperCase(),
    BANNER,
    { maxWidth: wide - 28, minSize: 7, maxLines: () => 1 },
    measure,
  );
  const nameWidth = Math.min(wide, measure(name.lines[0] ?? '', name.style) + 24);
  const banner: Box = { x: centre - nameWidth / 2, y: PANEL.y + PANEL.h - 12, w: nameWidth, h: 26 };
  out.push(
    { op: 'save' },
    { op: 'transform', matrix: rotation(centre, banner.y + banner.h / 2, -2) },
    fill(roundRect(banner, 8), look.ink),
    textCommand(name.lines[0] ?? '', name.style, {
      x: centre,
      y: baseline(banner.y + 7, name.style.size, name.style.size),
      maxWidth: banner.w - 20,
      color: look.knocked,
      align: 'center',
    }),
    { op: 'restore' },
  );

  const vow = frameWords(
    labels.wantedVow,
    VOW,
    {
      x: centre,
      top: banner.y + banner.h + 12,
      maxWidth: wide,
      maxLines: 2,
      lineHeight: 1.15,
      align: 'center',
    },
    look,
    measure,
  );
  out.push(
    ...vow.commands,
    textCommand(
      labels.wantedReward,
      { ...SMALL, weight: 500 },
      {
        x: centre,
        y: baseline(banner.y + banner.h + 12 + vow.height + 4, SMALL.size, SMALL.size * 1.3),
        maxWidth: wide,
        align: 'center',
        ...sub,
      },
    ),
  );

  // The tabs: a dashed rule across, dashed cuts between them, and the mark written up each one.
  const tabsTop = STORY.height - TABS.height;
  const tab = STORY.width / TABS.count;
  out.push({
    op: 'stroke',
    path: dashedRule(0, STORY.width, tabsTop, 4, 3),
    width: 1.5,
    ...sub,
  });
  for (let index = 0; index < TABS.count; index++) {
    const x = tab * index;
    if (index > 0) {
      out.push({
        op: 'stroke',
        path: Array.from({ length: 8 }, (_, dash) => [
          ['M', x, tabsTop + dash * 7] as const,
          ['L', x, Math.min(tabsTop + dash * 7 + 4, STORY.height)] as const,
        ]).flat(),
        width: 1.5,
        ...sub,
      });
    }
    const cx = x + tab / 2;
    const cy = tabsTop + TABS.height / 2;
    out.push(
      { op: 'save' },
      { op: 'transform', matrix: rotation(cx, cy, -90) },
      textCommand(SHARE_MARK.toLowerCase(), TAB, {
        x: cx,
        y: baseline(cy - TAB.size / 2, TAB.size, TAB.size),
        maxWidth: TABS.height - 6,
        align: 'center',
        ...sub,
      }),
      { op: 'restore' },
    );
  }
  return { commands: out, width: STORY.width, height: STORY.height };
}
