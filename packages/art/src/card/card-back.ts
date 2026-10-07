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
import { dotScreen, fill, placed, roundRect, type Box } from './shapes';

/** The back is the same for every card: the house colours, whatever finish the front wears. */
const INK = '#1C1A17';
const TOMATO = '#F0562E';
const PAPER = '#FBF8F2';
const WHITE = '#FFFFFF';

const FRAME: Box = { x: 0, y: 0, w: 330, h: 462 };
const FACE: Box = { x: 9, y: 9, w: 312, h: 444 };
const CENTRE_X = 165;
/** The stack of circle, name and label is 254 tall, centred in the 444 of the face. */
const STACK_TOP = 104;
const BRAND: TextStyle = { font: 'rounded', size: 30, weight: 800, tracking: -0.02 };
const LABEL: TextStyle = { font: 'sans', size: 12, weight: 600, tracking: 0.12 };

/** The paper circle Scootch sits in, and the square his drawing space takes inside it. */
export const CARD_BACK_CIRCLE = { x: CENTRE_X, y: STACK_TOP + 95, r: 95 } as const;
export const CARD_BACK_SCOOTCH: Box = { x: CENTRE_X - 90, y: STACK_TOP + 10, w: 180, h: 180 };

export interface CardBackOptions {
  /** The line under the name, in the reader's language ("WILD TASK CARD"). */
  readonly label: string;
  /** False leaves Scootch out of the circle, for a screen that puts a live one there. */
  readonly scootch?: boolean;
  readonly measure?: MeasureText;
}

/**
 * The back of every card, in the front's own 330 by 462 space: the ink frame, tomato with a dot
 * screen, Scootch scheming in a paper circle, the name and "WILD TASK CARD".
 */
export function buildCardBack(options: CardBackOptions): DrawCommand[] {
  const measure = options.measure ?? estimateTextWidth;
  const face = roundRect(FACE, 15);
  const circle = CARD_BACK_CIRCLE;
  const out: DrawCommand[] = [
    fill(roundRect(FRAME, 22), INK),
    fill(face, TOMATO),
    { op: 'save' },
    { op: 'clip', path: face },
    fill(dotScreen(FACE, 16, 2), INK, 0.18),
    { op: 'restore' },
    // The light inner edge: two points of white at a quarter strength, inside the face.
    {
      op: 'stroke',
      path: roundRect({ x: FACE.x + 1, y: FACE.y + 1, w: FACE.w - 2, h: FACE.h - 2 }, 14),
      color: WHITE,
      alpha: 0.25,
      width: 2,
    },
    fill([['O', circle.x, circle.y, circle.r]], PAPER),
  ];
  if (options.scootch !== false) {
    out.push(
      { op: 'save' },
      { op: 'clip', path: [['O', circle.x, circle.y, circle.r]] },
      ...placed(
        buildScootch({ mood: 'scheming', attitude: 'cheeky', workMode: null, reducedMotion: true }),
        CARD_BACK_SCOOTCH,
        VIEW_SIZE,
      ),
      { op: 'restore' },
    );
  }
  const brandTop = STACK_TOP + 190 + 4 + 14;
  const label = fitText(
    options.label.toUpperCase(),
    LABEL,
    { maxWidth: 260, minSize: 8, maxLines: () => 1 },
    measure,
  );
  out.push(
    textCommand('scootch', BRAND, {
      x: CENTRE_X,
      y: baseline(brandTop, BRAND.size, BRAND.size),
      maxWidth: 260,
      color: WHITE,
      align: 'center',
    }),
    textCommand(label.lines[0] ?? '', label.style, {
      x: CENTRE_X,
      y: baseline(brandTop + BRAND.size + 4, LABEL.size, LABEL.size),
      maxWidth: 260,
      color: WHITE,
      alpha: 0.85,
      align: 'center',
    }),
  );
  return out;
}
