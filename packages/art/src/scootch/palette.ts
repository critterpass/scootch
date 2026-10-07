import type { DrawCommand } from '../core/commands';
import { INK, WHITE } from '../core/pen';

/** Scootch's own colours. They never change with mood or attitude. */
export const SCOOTCH = {
  body: '#F0562E',
  shade: '#C63F22',
  ink: INK,
  white: WHITE,
  mouth: '#5A1E14',
  tongue: '#F49A84',
  blush: '#FF9A80',
  highlight: '#F98468',
  cloud: '#DED6CA',
  water: '#9FC4DE',
  laptop: '#D6CDBF',
} as const;

/**
 * Which Scootch is drawn. `tomato` is Scootch as he is everywhere. `paper` is the pale Scootch who
 * sits on the session's disc, where a tomato one would vanish into it.
 */
export type ScootchTone = 'tomato' | 'paper';
/** What Scootch stands on. On a dark ground the marks around a tomato Scootch turn light. */
export type ScootchGround = 'light' | 'dark';

/** The colours that follow the tone and the ground. Everything else is the same Scootch. */
export interface ScootchInks {
  readonly body: string;
  readonly shade: string;
  readonly highlight: string;
  readonly blush: string;
  readonly cloud: string;
  /** The marks that float around him: dots, waves, stars, the letters of sleep. */
  readonly fx: string;
  /** The desk line under the laptop, which stays ink where the marks are paper. */
  readonly desk: string;
}

const TOMATO: ScootchInks = {
  body: SCOOTCH.body,
  shade: SCOOTCH.shade,
  highlight: SCOOTCH.highlight,
  blush: SCOOTCH.blush,
  cloud: SCOOTCH.cloud,
  fx: SCOOTCH.ink,
  desk: SCOOTCH.ink,
};
const PAPER: ScootchInks = {
  body: '#FBF8F2',
  shade: '#E2D8C8',
  highlight: '#FFFFFF',
  blush: '#F7B5A3',
  cloud: '#FBF8F2',
  fx: '#FBF8F2',
  desk: SCOOTCH.ink,
};
const TOMATO_ON_DARK: ScootchInks = { ...TOMATO, fx: '#F6F3EE', cloud: '#4A443E', desk: '#F6F3EE' };

/** The paper tone is the same on any ground: it is drawn for the disc, not for the page. */
export function scootchInks(
  tone: ScootchTone = 'tomato',
  ground: ScootchGround = 'light',
): ScootchInks {
  if (tone === 'paper') return PAPER;
  return ground === 'dark' ? TOMATO_ON_DARK : TOMATO;
}

const BODY_KEYS = ['body', 'shade', 'highlight', 'blush', 'cloud'] as const;

/**
 * Redraws a finished Scootch in another tone: every command in his body colours takes the tone's,
 * except inside `kept`, the ranges of commands already drawn in the tone (the effects, which keep
 * tomato confetti and an ink desk whatever the tone). The tomato tone on a light ground returns
 * the list it was given, untouched.
 */
export function retone(
  commands: DrawCommand[],
  inks: ScootchInks,
  kept: readonly (readonly [number, number])[],
): DrawCommand[] {
  const swaps = new Map<string, string>();
  for (const key of BODY_KEYS) if (inks[key] !== TOMATO[key]) swaps.set(TOMATO[key], inks[key]);
  if (swaps.size === 0) return commands;
  return commands.map((command, index) => {
    if (command.op !== 'fill' && command.op !== 'stroke') return command;
    if (kept.some(([from, to]) => index >= from && index < to)) return command;
    const color = swaps.get(command.color);
    return color === undefined ? command : { ...command, color };
  });
}
