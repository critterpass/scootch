import { MINUTE_MS, type TaskCreateRequest, type TaskRow } from '@scootch/domain';

import { careGate } from '../api/care-gate';

import { enterCrisis } from './care-flow';
import type { DayContext, Offer } from './day-types';
import { swapItemIn } from './pick-flow';
import { applyCall, keepTranscript, treatNamed } from './task-answers';
import { TASK_TEXT_MAX, newTask } from './task-rows';

/** A task waiting for a trusted screen is asked about at most this often. */
export const RESCREEN_EVERY_MS = MINUTE_MS;

function requestFor(ctx: DayContext, offer: Offer): TaskCreateRequest {
  const { settings, localDate } = ctx.memory.state;
  return {
    language: settings.language,
    attitude: settings.attitude,
    energy: offer.energy,
    text: offer.text,
    source: offer.source,
    localDate,
    timeZone: ctx.deps.timeZone(),
    overrideSerious: false,
    ...(offer.declined.length > 0 ? { declined: offer.declined.slice(-10) } : {}),
  };
}

const isOnline = (ctx: DayContext) => ctx.deps.online().catch(() => false);

/**
 * A ramble or a typed task. The phone's gate runs before anything is sent or written. With no
 * answer from the server, the text becomes the one thing as it is, unscreened: plain company and
 * no monster until the connection returns.
 */
export async function submitText(ctx: DayContext, offer: Offer): Promise<void> {
  if (ctx.memory.state.today.kind === 'crisis') return;
  const gate = careGate(offer.text);
  if (gate === 'crisis') {
    await enterCrisis(ctx);
    return ctx.refresh();
  }

  ctx.memory.offer = offer;
  ctx.set({
    taskCall: gate === 'hold' ? 'held' : 'waiting',
    notice: null,
    line: null,
    modelDown: false,
  });
  // The battery the person named is kept for the day, with or without a connection.
  if (offer.energy !== 'guess') {
    const { days } = ctx.deps.repositories;
    const day = await days.get(ctx.memory.state.localDate);
    if (day) await days.put({ ...day, energy: offer.energy });
  }
  const online = await isOnline(ctx);
  const call = online
    ? await ctx.deps.tasks.createTask(requestFor(ctx, offer), treatNamed(ctx)).catch(() => null)
    : null;

  if (call !== null) {
    await applyCall(ctx, call, null);
  } else {
    const text = offer.text.trim().slice(0, TASK_TEXT_MAX);
    await ctx.deps.repositories.tasks.put(newTask(ctx, text, offer.source, 'unscreened'));
    await keepTranscript(ctx, offer);
    // Nothing else was heard, so there is nothing else to offer. With a connection up, it was
    // the model that did not answer, and Scootch says so.
    ctx.set({ pick: { kind: 'offered', reveal: null, another: false }, modelDown: online });
  }
  // Today is read back before the waiting ends, so the composer never shows again in between.
  await ctx.refresh();
  ctx.set({ taskCall: 'idle' });
}

/**
 * "Another". While this text's parked rest has things not yet offered, the next of them is
 * swapped in and the turned-down one goes to the drawer in its place: no call is made. Only when
 * none are left is the same text asked again without the ones turned down.
 */
export async function askAnother(ctx: DayContext): Promise<void> {
  const { offer } = ctx.memory;
  const { today } = ctx.memory.state;
  if (!offer || !('task' in today) || today.task.status !== 'set') return;

  const inDrawer = new Set((await ctx.deps.repositories.drawerItems.all()).map((item) => item.id));
  const [next, ...left] = offer.candidates.filter((id) => inDrawer.has(id));
  if (next !== undefined) {
    ctx.memory.offer = { ...offer, candidates: left };
    if (await swapItemIn(ctx, next)) {
      ctx.set({ pick: { kind: 'offered', reveal: null, another: true }, line: null });
      return ctx.refresh();
    }
  }
  await ctx.deps.repositories.forgetTask(today.task.id);
  await submitText(ctx, {
    ...offer,
    candidates: [],
    declined: [...offer.declined, today.task.text],
  });
}

/** The one thing is picked: the ramble's words go, unless the person keeps transcripts. */
export async function resolveTranscript(ctx: DayContext): Promise<void> {
  const { transcripts } = ctx.deps.repositories;
  const keep = ctx.memory.state.settings.keepTranscripts;
  for (let one = await transcripts.pending(); one; one = await transcripts.pending()) {
    await transcripts.picked(one.id, keep, ctx.now());
  }
  ctx.memory.offer = null;
}

/** Whether today's task still needs a screen the app can trust before anything funny is said. */
function needsScreen(ctx: DayContext, task: TaskRow): boolean {
  if (task.screen === 'unscreened') return true;
  // A serious answer nobody trusted is asked about again only while the task is still just set.
  return ctx.memory.untrustedTaskId === task.id && task.status === 'set';
}

/**
 * With a connection back, or the app opened again, the task that was waiting is asked for: one
 * with no screen, one screened only by the fallback, one with no monster, one told to be funny.
 * A task waiting for its screen is asked about at most once a minute, until a trusted answer
 * comes; then its comedy and its monster may.
 */
export async function fetchPending(ctx: DayContext): Promise<void> {
  const { today, settings, localDate, monster } = ctx.memory.state;
  if (!('task' in today) || ctx.memory.restPending) return;
  const { task } = today;
  const screening = needsScreen(ctx, task);
  const waiting =
    screening ||
    (task.screen === 'pass' && monster === null) ||
    // "It's fine, be funny": the task is asked for again, this time with its comedy.
    (task.screen === 'serious' && task.seriousOverridden);
  if (!waiting || !(await isOnline(ctx))) return;
  if (screening) {
    const asked = ctx.memory.screenAskedAt;
    if (asked !== null && ctx.now() - asked < RESCREEN_EVERY_MS) return;
    ctx.memory.screenAskedAt = ctx.now();
  }

  const call = await ctx.deps.tasks
    .createTask(
      {
        language: settings.language,
        attitude: settings.attitude,
        energy: 'guess',
        text: task.originalText,
        source: task.source === 'ramble' || task.source === 'drawer' ? task.source : 'typed',
        localDate,
        timeZone: ctx.deps.timeZone(),
        overrideSerious: task.seriousOverridden,
      },
      treatNamed(ctx),
    )
    .catch(() => null);
  if (call === null) return;
  ctx.set({ modelDown: false });
  await applyCall(ctx, call, task);
  await ctx.refresh();
}

/**
 * "It's fine, be funny": the serious task takes the ordinary path from here on, and is asked for
 * again so that its monster and its own lines can come. A crisis day has no task, so there is
 * nothing here that could override one; and a second screen that calls a crisis still wins.
 */
export async function beFunny(ctx: DayContext): Promise<void> {
  const { today } = ctx.memory.state;
  if (today.kind !== 'serious' || today.session !== null) return;
  await ctx.deps.repositories.tasks.put({ ...today.task, seriousOverridden: true });
  await ctx.deps.repositories.careReminder.clear();
  ctx.set({ pick: { kind: 'none' }, line: null });
  await ctx.refresh();
  if (!ctx.memory.restPending) ctx.later(Promise.resolve(), () => fetchPending(ctx));
}

/**
 * After the one thing is chosen: an ordinary task hatches, and any other is simply set. A task
 * still without its monster or its screening is asked for, without holding anything up.
 */
export function afterPicked(ctx: DayContext): void {
  const { today, monster } = ctx.memory.state;
  const task = 'task' in today ? today.task : null;
  const hatches = today.kind === 'task_set' && task?.screen === 'pass';
  ctx.set({ pick: hatches ? { kind: 'hatching', shrunk: false } : { kind: 'none' } });
  const waiting = task?.screen === 'unscreened' || (hatches && monster === null);
  if (waiting && !ctx.memory.restPending) ctx.later(Promise.resolve(), () => fetchPending(ctx));
}
