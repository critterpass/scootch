import type { DrawCommand } from '../core/commands';
import { baseline, fitText, textCommand, type MeasureText, type TextStyle } from '../core/text';
import { buildMaterial } from './build-material';
import type { FinishMaterial, Tint } from './material';
import { flock } from './materials/flock';
import { holo } from './materials/holo';
import { paper } from './materials/paper';
import { riso } from './materials/riso';
import { roundRect, type Box } from './shapes';

/**
 * The four frames a shared story is printed on. Paper and Riso are everyone's; Holo and Velvet
 * are the finishes of the same name, for whoever may wear them.
 */
export const SHARE_FRAMES = ['paper', 'riso', 'holo', 'velvet'] as const;
export type ShareFrame = (typeof SHARE_FRAMES)[number];

/** What a frame is made of and the inks that read on it. */
export interface FrameLook {
  readonly material: FinishMaterial;
  readonly ink: string;
  readonly sub: Tint;
  /** The accent: the stamp, the rarity's word. */
  readonly accent: string;
  /**
   * A second printing of the big words a little off the first: riso's blue plate out of
   * register, the light catching foil's edge. `null` where the words are printed once.
   */
  readonly second: { readonly dx: number; readonly dy: number; readonly tint: Tint } | null;
  /** The colour of something knocked out of the ink, such as a name on an ink banner. */
  readonly knocked: string;
}

export const FRAME_LOOKS: Record<ShareFrame, FrameLook> = {
  paper: {
    material: {
      ...paper,
      base: [
        { kind: 'solid', color: '#F4EDE1', alpha: 1 },
        { kind: 'dots', step: 10, radius: 1, offset: [0, 0], color: '#1C1A17', alpha: 0.1 },
      ],
      sheenAlpha: 0,
      grain: 0.3,
    },
    ink: '#1C1A17',
    sub: ['#6F6A62', 1],
    accent: '#F0562E',
    second: null,
    knocked: '#FBF8F3',
  },
  riso: {
    material: {
      ...riso,
      base: [
        { kind: 'solid', color: '#F4EBDA', alpha: 1 },
        { kind: 'dots', step: 7, radius: 1.1, offset: [3, 3], color: '#3460C8', alpha: 0.15 },
        { kind: 'dots', step: 7, radius: 1.1, offset: [0, 0], color: '#F0562E', alpha: 0.25 },
      ],
      sheenAlpha: 0,
      grain: 0.4,
    },
    ink: '#1C1A17',
    sub: ['#4E443B', 1],
    accent: '#F0562E',
    second: { dx: 2, dy: 1.5, tint: ['#3460C8', 0.55] },
    knocked: '#F4EBDA',
  },
  holo: {
    material: { ...holo, sheenAlpha: 0.7, grain: 0 },
    ink: '#1C1A17',
    sub: ['#1C1A17', 0.62],
    accent: '#F0562E',
    second: { dx: 0, dy: 1, tint: ['#FFFFFF', 0.7] },
    knocked: '#FBF8F3',
  },
  velvet: {
    material: flock,
    ink: '#F3EBDD',
    sub: ['#F3EBDD', 0.72],
    accent: '#FFB8A3',
    second: null,
    knocked: '#1F3B2F',
  },
};

/** The board's story: 270 by 480 with a 26 point corner, 18 points in at the sides. */
export const STORY = { width: 270, height: 480, radius: 26, side: 18, top: 18, foot: 16 } as const;
export const STORY_PAGE: Box = { x: 0, y: 0, w: STORY.width, h: STORY.height };

/** The stamped face of a story's small capitals. */
export const STRIP: TextStyle = { font: 'sans', size: 8.5, weight: 700, tracking: 0.14 };

/** The frame itself: its material, flat, cut to the story's corner. */
export function framePage(frame: ShareFrame): DrawCommand[] {
  return buildMaterial(STORY_PAGE, STORY.radius, FRAME_LOOKS[frame].material);
}

/**
 * Big words on a frame: fitted to their box and printed in the frame's ink, with the frame's
 * second printing under them where it has one. `top` is the top of the first line's box.
 */
export function frameWords(
  text: string,
  style: TextStyle,
  place: {
    readonly x: number;
    readonly top: number;
    readonly maxWidth: number;
    readonly maxLines: number;
    readonly lineHeight: number;
    readonly align?: 'left' | 'center';
    readonly minSize?: number;
  },
  look: FrameLook,
  measure: MeasureText,
): { readonly commands: DrawCommand[]; readonly height: number } {
  const fitted = fitText(
    text,
    style,
    { maxWidth: place.maxWidth, minSize: place.minSize ?? 11, maxLines: () => place.maxLines },
    measure,
  );
  const lineHeight = fitted.style.size * place.lineHeight;
  const commands: DrawCommand[] = [];
  fitted.lines.forEach((one, index) => {
    const at = {
      x: place.x,
      y: baseline(place.top + lineHeight * index, fitted.style.size, lineHeight),
      maxWidth: place.maxWidth,
      ...(place.align ? { align: place.align } : {}),
    };
    if (look.second) {
      commands.push(
        textCommand(one, fitted.style, {
          ...at,
          x: at.x + look.second.dx,
          y: at.y + look.second.dy,
          color: look.second.tint[0],
          alpha: look.second.tint[1],
        }),
      );
    }
    commands.push(textCommand(one, fitted.style, { ...at, color: look.ink }));
  });
  return { commands, height: lineHeight * fitted.lines.length };
}

/** The strip along a story's top or foot: one stamped word at each end. */
export function frameStrip(
  leading: string,
  trailing: string,
  top: number,
  look: FrameLook,
  measure: MeasureText,
): DrawCommand[] {
  const wide = STORY.width - STORY.side * 2;
  const one = (text: string, align: 'left' | 'right') => {
    const fitted = fitText(
      text.toUpperCase(),
      STRIP,
      { maxWidth: wide * 0.62, minSize: 6, maxLines: () => 1 },
      measure,
    );
    return textCommand(fitted.lines[0] ?? '', fitted.style, {
      x: align === 'left' ? STORY.side : STORY.width - STORY.side,
      y: baseline(top, fitted.style.size, fitted.style.size),
      maxWidth: wide * 0.62,
      color: look.sub[0],
      alpha: look.sub[1],
      align,
    });
  };
  return [one(leading, 'left'), one(trailing, 'right')];
}

/** A round outline stamp, leaning: one bold word over one small line, in the accent. */
export function roundStamp(
  word: string,
  small: string,
  at: { readonly x: number; readonly y: number; readonly r: number; readonly lean: number },
  color: string,
  measure: MeasureText,
): DrawCommand[] {
  const big: TextStyle = { font: 'rounded', size: 13, weight: 900, tracking: 0.02 };
  const fitted = fitText(
    word.toUpperCase(),
    big,
    { maxWidth: at.r * 1.6, minSize: 7, maxLines: () => 1 },
    measure,
  );
  const a = (at.lean * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    { op: 'save' },
    {
      op: 'transform',
      matrix: [c, s, -s, c, at.x - at.x * c + at.y * s, at.y - at.x * s - at.y * c],
    },
    {
      op: 'stroke',
      path: roundRect({ x: at.x - at.r, y: at.y - at.r, w: at.r * 2, h: at.r * 2 }, at.r),
      color,
      alpha: 1,
      width: 2.5,
    },
    textCommand(fitted.lines[0] ?? '', fitted.style, {
      x: at.x,
      y: baseline(at.y - fitted.style.size + 1, fitted.style.size, fitted.style.size),
      maxWidth: at.r * 1.6,
      color,
      align: 'center',
    }),
    textCommand(
      small.toUpperCase(),
      { font: 'sans', size: 7, weight: 700, tracking: 0.12 },
      {
        x: at.x,
        y: baseline(at.y + 5, 7, 7),
        maxWidth: at.r * 1.7,
        color,
        align: 'center',
      },
    ),
    { op: 'restore' },
  ];
}
