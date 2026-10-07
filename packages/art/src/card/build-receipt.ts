import type { CardFinish } from '@scootch/domain';

import type { DrawCommand, PathSegment } from '../core/commands';
import { estimateTextWidth, type TextStyle } from '../core/text';
import type { CardOptions } from './build-card';
import { buildMaterial, CARD_MATERIALS } from './build-material';
import type { ShareComposition } from './build-story';
import { CARD_LABELS, formatCardDate, splitMinutes } from './labels';
import { fill, type Box } from './shapes';
import { dashes, leader, line, rect, SHARE_INK, STAMP, turned } from './share-kit';

/** One thing done today: what it says on the receipt, and when it was finished. */
export interface ReceiptRow {
  /** The task's own words, or the name of its monster when the words are kept off. */
  readonly label: string;
  /** The time it was finished, as the person's clock showed it: "09:12". */
  readonly time: string;
}

export interface ReceiptOptions extends Pick<CardOptions, 'language' | 'measure'> {
  /** The day the receipt is for, `YYYY-MM-DD`. */
  readonly date: string;
  readonly rows: readonly ReceiptRow[];
  readonly caught: number;
  /** Minutes of sessions today. */
  readonly minutes: number;
  /** The finish of the foil stamp, for Plus; `null` prints the receipt without one. */
  readonly stamp: CardFinish | null;
}

/** A receipt lists this many things at the most; a longer day prints its first ones. */
export const RECEIPT_ROWS = 12;
const PAPER = '#FCFBF7';
const WIDTH = 290;
const MARGIN = 24;
const PAD = 22;
const ROW: TextStyle = { font: 'sans', size: 12, weight: 500, tracking: 0.02 };
const TOTAL: TextStyle = { ...ROW, weight: 700 };
const TOOTH = 14;

/** The run of bars at the foot: the same every time, like the rest of the drawing. */
const BARS = [2, 2, 1, 3, 3, 1, 1, 3] as const;

/**
 * The day's done log as a thermal receipt: the day, each thing done with its time and a dotted
 * leader, three totals, "change due", a barcode and a thank-you, with a torn zigzag foot. With
 * Plus a round foil stamp in the worn finish sits beside the change. It is as long as the day.
 */
export function buildReceipt(options: ReceiptOptions): ShareComposition {
  const language = options.language ?? 'en';
  const labels = CARD_LABELS[language];
  const measure = options.measure ?? estimateTextWidth;
  const rows = options.rows.slice(0, RECEIPT_ROWS);
  const left = MARGIN + PAD;
  const right = MARGIN + WIDTH - PAD;
  const inner = WIDTH - PAD * 2;
  const centre = MARGIN + WIDTH / 2;
  const out: DrawCommand[] = [];
  let top = MARGIN + 26;

  out.push(
    line(
      'Scootch',
      { font: 'rounded', size: 22, weight: 900, tracking: -0.02 },
      { x: centre, top, maxWidth: inner, color: SHARE_INK, align: 'center' },
      measure,
    ),
  );
  top += 28;
  out.push(
    line(
      `${labels.doneLog} · ${formatCardDate(options.date, language)} ${options.date.slice(0, 4)}`.toUpperCase(),
      { ...STAMP, size: 10.5 },
      { x: centre, top, maxWidth: inner, color: SHARE_INK, align: 'center' },
      measure,
    ),
  );
  top += 24;
  out.push(dashes(left, right, top, SHARE_INK));
  top += 13;
  for (const row of rows) {
    const timeWidth = measure(row.time, ROW);
    const labelWidth = inner - timeWidth - 24;
    // A long line is cut short, never shrunk out of reading size.
    const label = line(
      row.label,
      ROW,
      { x: left, top, maxWidth: labelWidth, color: SHARE_INK, minSize: 10.5 },
      measure,
    );
    const used =
      label.op === 'text' ? measure(label.text, { ...ROW, size: label.size }) : labelWidth;
    out.push(
      label,
      fill(leader(left + used + 6, right - timeWidth - 6, top + 10), SHARE_INK, 0.5),
      line(
        row.time,
        ROW,
        { x: right, top, maxWidth: timeWidth + 4, color: SHARE_INK, align: 'right' },
        measure,
      ),
    );
    top += 19;
  }
  top += 5;
  out.push(dashes(left, right, top, SHARE_INK));
  top += 13;
  const [hours, minutes] = splitMinutes(options.minutes);
  const totals: readonly (readonly [string, string])[] = [
    [labels.thingsDone, String(options.rows.length)],
    [labels.monstersCaught, String(options.caught)],
    [labels.timeSpent, labels.duration(hours, minutes)],
  ];
  for (const [label, value] of totals) {
    out.push(
      line(label, TOTAL, { x: left, top, maxWidth: inner * 0.7, color: SHARE_INK }, measure),
      line(
        value,
        TOTAL,
        { x: right, top, maxWidth: inner * 0.3, color: SHARE_INK, align: 'right' },
        measure,
      ),
    );
    top += 17;
  }
  top += 10;

  // "Change due", and for Plus the round foil stamp beside it.
  const [due, change] = labels.changeDue;
  const dueWidth = options.stamp === null ? inner : inner - 86;
  out.push(
    line(
      due,
      { ...ROW, size: 11 },
      { x: left, top: top + 22, maxWidth: dueWidth, color: SHARE_INK },
      measure,
    ),
    line(
      change,
      { ...ROW, size: 11 },
      { x: left, top: top + 37, maxWidth: dueWidth, color: SHARE_INK },
      measure,
    ),
  );
  if (options.stamp !== null) {
    const material = CARD_MATERIALS[options.stamp];
    const stamp = { x: right - 37, y: top + 37, r: 37 };
    const face: Box = {
      x: stamp.x - stamp.r,
      y: stamp.y - stamp.r,
      w: stamp.r * 2,
      h: stamp.r * 2,
    };
    out.push(
      ...turned(
        [
          ...buildMaterial(face, stamp.r, material),
          {
            op: 'stroke',
            path: [['O', stamp.x, stamp.y, stamp.r - 1]],
            color: SHARE_INK,
            alpha: 0.25,
            width: 2,
          },
          line(
            'PLUS',
            { font: 'rounded', size: 13, weight: 900 },
            { x: stamp.x, top: stamp.y - 11, maxWidth: 60, color: material.text, align: 'center' },
            measure,
          ),
          line(
            labels.stamped,
            { ...STAMP, size: 7 },
            { x: stamp.x, top: stamp.y + 5, maxWidth: 62, color: material.text, align: 'center' },
            measure,
          ),
        ],
        stamp.x,
        stamp.y,
        -14,
      ),
    );
  }
  top += 74 + 12;

  const bars: PathSegment[] = [];
  let at = left;
  for (let index = 0; at < right; index++) {
    const wide = BARS[index % BARS.length] ?? 1;
    if (index % 2 === 0) {
      bars.push(
        ['M', at, top],
        ['L', Math.min(at + wide, right), top],
        ['L', Math.min(at + wide, right), top + 42],
        ['L', at, top + 42],
        ['Z'],
      );
    }
    at += wide;
  }
  out.push(fill(bars, SHARE_INK));
  top += 42 + 12;
  for (const words of labels.thanks) {
    out.push(
      line(
        words,
        { ...STAMP, size: 10, tracking: 0.12 },
        { x: centre, top, maxWidth: inner, color: SHARE_INK, align: 'center' },
        measure,
      ),
    );
    top += 14;
  }
  top += 14;

  // The paper itself, cut to the length of the day, with a torn zigzag foot.
  const foot = top;
  const paper: PathSegment[] = [
    ['M', MARGIN, MARGIN],
    ['L', MARGIN + WIDTH, MARGIN],
    ['L', MARGIN + WIDTH, foot],
  ];
  for (let x = MARGIN + WIDTH; x > MARGIN; x -= TOOTH) {
    paper.push(
      ['L', Math.max(MARGIN, x - TOOTH / 2), foot + TOOTH / 2],
      ['L', Math.max(MARGIN, x - TOOTH), foot],
    );
  }
  paper.push(['Z']);
  const height = foot + TOOTH / 2 + MARGIN + 10;
  const page: Box = { x: 0, y: 0, w: WIDTH + MARGIN * 2, h: height };
  const sheet: DrawCommand[] = [
    // The shadow it throws, then the paper, then the print.
    { op: 'save' },
    { op: 'transform', matrix: [1, 0, 0, 1, 0, 12] },
    fill(paper, SHARE_INK, 0.1),
    { op: 'restore' },
    fill(paper, PAPER),
    { op: 'save' },
    { op: 'clip', path: paper },
    {
      op: 'paint',
      path: rect(page),
      paint: { kind: 'grain', size: 1.2 },
      alpha: 0.22,
      blend: 'multiply',
    },
    { op: 'restore' },
    ...out,
  ];
  return {
    commands: [fill(rect(page), '#E9E5DE'), ...turned(sheet, page.w / 2, height / 2, 1.5)],
    width: page.w,
    height,
  };
}
