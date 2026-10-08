import { careGate } from '../api/care-gate';

import { enterCrisis } from './care-flow';
import type { DayContext } from './day-types';
import { intoDrawer } from './parked-thoughts';
import { submitText } from './task-flow';

/** The most of a shared thing that is sent to be read: a page of words, never a whole document. */
export const SHARED_TEXT_MAX = 1200;

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
 */
export async function takeSharedIn(
  ctx: DayContext,
  text: string,
  when: 'now' | 'tomorrow',
): Promise<void> {
  const words = text.trim().slice(0, SHARED_TEXT_MAX);
  if (words === '') return;
  if (careGate(words) === 'crisis') {
    await enterCrisis(ctx);
    return ctx.refresh();
  }
  const { today, taskCall, pick } = ctx.memory.state;
  const free = today.kind === 'nothing_yet' && taskCall === 'idle' && pick.kind === 'none';
  if (when === 'now' && free) {
    await submitText(ctx, { text: words, source: 'ramble', energy: 'guess', transcriptId: null });
    // A day with no start left takes nothing on: the thing is kept instead of lost.
    if (ctx.memory.state.taskCall !== 'idle') return;
  }
  await intoDrawer(ctx, words, when === 'tomorrow' ? 'tomorrow' : 'whenever');
  await ctx.refresh();
}
