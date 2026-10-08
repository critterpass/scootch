import { hasStartLeft } from '@scootch/domain';

import { careGate } from '../api/care-gate';

import { keepArrivedPage, pageInHand } from './arrived-pages';
import { enterCrisis } from './care-flow';
import type { DayContext, DayState } from './day-types';
import { intoDrawer } from './parked-thoughts';
import { submitText } from './task-flow';

/** The most of a shared thing that is sent to be read: a page of words, never a whole document. */
export const SHARED_TEXT_MAX = 1200;

/**
 * Whether a thing taken in now would be today's: nothing is set, offered or being asked about,
 * and the day has a start left for it. Otherwise it waits in the drawer.
 */
export function takenOnToday(day: Pick<DayState, 'today' | 'taskCall' | 'pick'>): boolean {
  const { today, taskCall, pick } = day;
  if (today.kind !== 'nothing_yet' || taskCall !== 'idle' || pick.kind !== 'none') return false;
  return hasStartLeft(today);
}

/**
 * A thing shared in from another app is taken in. The share sheet only kept the words; every
 * rule is applied here, where the screens' own are.
 *
 * - The phone's gate reads the words first. Words that read as a crisis are never stored: the
 *   day turns to care, as it does when they are typed.
 * - "Hunt it now" with a free day is said to Scootch as a ramble is, so the one thing is found
 *   in it, screened, and only then hatches. A serious thing gets no monster there, as always.
 * - Otherwise it waits in the drawer, unscreened and closed: for tomorrow when that was asked,
 *   and whenever when today already has its thing, has no start left or is a crisis day.
 *
 * A thing that arrives from a monster's page on the website is taken in the same way. Its page
 * goes with it, to the task call or into the drawer, and with nothing else. A page whose thing is
 * already here (being asked about, set, parked or finished) is not taken in a second time,
 * however often its link is opened.
 */
export async function takeSharedIn(
  ctx: DayContext,
  text: string,
  when: 'now' | 'tomorrow',
  monsterPage?: string,
): Promise<void> {
  const words = text.trim().slice(0, SHARED_TEXT_MAX);
  if (words === '') return;
  if (careGate(words) === 'crisis') {
    await enterCrisis(ctx);
    return ctx.refresh();
  }
  if (monsterPage !== undefined && (await pageInHand(ctx, monsterPage))) return;
  if (when === 'now' && takenOnToday(ctx.memory.state)) {
    await submitText(ctx, {
      text: words,
      source: 'ramble',
      energy: 'guess',
      transcriptId: null,
      ...(monsterPage === undefined ? {} : { monsterPage }),
    });
    // Words that only asked Scootch to choose set nothing: the thing is kept instead of lost.
    if (ctx.memory.state.taskCall !== 'idle') return;
  }
  const parked = await intoDrawer(ctx, words, when === 'tomorrow' ? 'tomorrow' : 'whenever');
  if (parked !== null) await keepArrivedPage(ctx, parked, monsterPage);
  await ctx.refresh();
}
