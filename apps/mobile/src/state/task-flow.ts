import type { TaskCreateRequest, TaskLabels, TaskRow } from '@scootch/domain';

import { careGate } from '../api/care-gate';
import type { TaskCall, TaskRest } from '../api/task-client';

import type { DayContext, Offer, Reveal } from './day-types';
import { swapItemIn } from './pick-flow';
import { TASK_TEXT_MAX, fallbackCopy, monsterFor, newTask, park } from './task-rows';

/** Self-harm language: every task is hidden for the day. The text itself is written nowhere. */
async function markCrisis(ctx: DayContext): Promise<void> {
  const { days, transcripts } = ctx.deps.repositories;
  const day = await days.get(ctx.memory.state.localDate);
  if (day) await days.put({ ...day, status: 'crisis' });
  const transcriptId = ctx.memory.offer?.transcriptId;
  if (transcriptId) await transcripts.remove(transcriptId);
  ctx.memory.offer = null;
  ctx.set({ pick: { kind: 'none' } });
}

/** A ramble's words are kept while its one thing is being picked, once they are known to be safe to keep. */
async function keepTranscript(ctx: DayContext, offer: Offer): Promise<void> {
  if (offer.source !== 'ramble' || offer.transcriptId !== null) return;
  const transcriptId = ctx.deps.nextId();
  await ctx.deps.repositories.transcripts.save(transcriptId, offer.text, ctx.now());
  ctx.memory.offer = { ...offer, transcriptId };
}

type RestOutcome = { readonly rest: TaskRest | null } | 'failed';

/**
 * Writes the second stage when it arrives. A task that was swapped out or let go in the meantime
 * gets nothing. When the rest never comes, an ordinary task whose labels are known still gets its
 * monster, with a plain name, and speaks the offline lines.
 */
async function applyRest(
  ctx: DayContext,
  taskId: string,
  labels: TaskLabels | null,
  outcome: RestOutcome,
): Promise<void> {
  const { repositories } = ctx.deps;
  ctx.memory.restPending = false;
  const task = await repositories.tasks.get(taskId);
  if (!task) return;
  const rest = outcome === 'failed' ? null : outcome.rest;

  if (rest?.verdict === 'serious' && task.screen === 'serious') {
    await repositories.tasks.put({ ...task, lines: rest.lines });
    return ctx.refresh();
  }
  if (task.screen !== 'pass') return;
  const known = rest?.verdict === 'pass' ? rest.labels : labels;
  if (known === null) return;

  const pass = rest?.verdict === 'pass' ? rest : null;
  const written: TaskRow = {
    ...task,
    lines: pass?.lines ?? task.lines,
    notifications: pass ? [...pass.notifications] : task.notifications,
    workMode: known.workMode,
    fitsTenMinutes: known.fitsTenMinutes,
    sharePrivate: known.sharePrivate,
  };
  await repositories.tasks.put(written);
  await repositories.monsters.removeWhere('taskId', task.id);
  const copy = pass?.monster ?? fallbackCopy(ctx, written, known);
  await repositories.monsters.put(monsterFor(ctx, written, known, copy));
  if (pass?.lines) ctx.set({ line: { slot: 'hatch', text: pass.lines.hatch } });
  await ctx.refresh();
}

function revealFor(offer: Offer | null, call: TaskCall): Reveal | null {
  const { first } = call;
  if (first.verdict !== 'pass' || offer?.source !== 'ramble') return null;
  const others = [...first.parked, ...first.deadlines].map((thing) => thing.text);
  if (others.length === 0) return null;
  // The one thing sits among the rest, as it did in the ramble, not at the top of a list.
  const chosen = Math.min(others.length, Math.ceil(others.length / 2));
  return {
    phrases: [...others.slice(0, chosen), first.oneThing.text, ...others.slice(chosen)],
    chosen,
  };
}

/**
 * Writes what a task call answered first, and leaves the rest to arrive by itself. `existing` is
 * a task already on the phone that was waiting for its answer: its words stay exactly as the
 * person typed them, and nothing is offered again.
 */
async function applyCall(ctx: DayContext, call: TaskCall, existing: TaskRow | null) {
  const { repositories } = ctx.deps;
  const { first } = call;
  const offer = ctx.memory.offer;

  if (first.verdict === 'crisis' || first.verdict === 'reject') {
    if (existing) await repositories.forgetTask(existing.id);
    if (first.verdict === 'crisis') return markCrisis(ctx);
    ctx.memory.offer = null;
    return ctx.set({ notice: 'say_it_another_way', pick: { kind: 'none' } });
  }

  const screen = first.verdict;
  const task: TaskRow = existing
    ? { ...existing, screen, seriousOverridden: first.seriousOverridden }
    : {
        ...newTask(ctx, first.oneThing.text, offer?.source ?? 'typed', screen),
        seriousOverridden: first.seriousOverridden,
        dueDate: first.oneThing.dueDate,
      };
  await repositories.tasks.put(task);
  if (!existing) {
    const parked = await park(ctx, first.parked, screen);
    // A heard date is stored at once, so closing the app cannot lose it; it is still said out
    // loud before the person sees anything parked.
    await park(ctx, first.deadlines, screen);
    const day = await repositories.days.get(task.localDate);
    if (day) await repositories.days.put({ ...day, energy: first.energy });
    if (offer) {
      await keepTranscript(ctx, offer);
      const kept = ctx.memory.offer ?? offer;
      ctx.memory.offer = { ...kept, candidates: parked.map((item) => item.id) };
    }
    ctx.set({
      heardDeadlines: first.deadlines,
      pick: { kind: 'offered', reveal: revealFor(offer, call), another: true },
    });
  }
  // The first stage is on the screen while the rest is on its way.
  ctx.memory.restPending = true;
  ctx.later(
    call.rest.then(
      (rest): RestOutcome => ({ rest }),
      (): RestOutcome => 'failed',
    ),
    (outcome) => applyRest(ctx, task.id, first.labels ?? null, outcome),
  );
}

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
    await markCrisis(ctx);
    return ctx.refresh();
  }

  ctx.memory.offer = offer;
  ctx.set({ taskCall: gate === 'hold' ? 'held' : 'waiting', notice: null, line: null });
  // The battery the person named is kept for the day, with or without a connection.
  if (offer.energy !== 'guess') {
    const { days } = ctx.deps.repositories;
    const day = await days.get(ctx.memory.state.localDate);
    if (day) await days.put({ ...day, energy: offer.energy });
  }
  const call = (await isOnline(ctx))
    ? await ctx.deps.tasks.createTask(requestFor(ctx, offer)).catch(() => null)
    : null;

  if (call !== null) {
    await applyCall(ctx, call, null);
  } else {
    const text = offer.text.trim().slice(0, TASK_TEXT_MAX);
    await ctx.deps.repositories.tasks.put(newTask(ctx, text, offer.source, 'unscreened'));
    await keepTranscript(ctx, offer);
    // Nothing else was heard, so there is nothing else to offer.
    ctx.set({ pick: { kind: 'offered', reveal: null, another: false } });
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

/** With a connection back, the task that was waiting is screened and gets its lines and monster. */
export async function fetchPending(ctx: DayContext): Promise<void> {
  const { today, settings, localDate, monster } = ctx.memory.state;
  if (!('task' in today) || ctx.memory.restPending) return;
  const { task } = today;
  const waiting = task.screen === 'unscreened' || (task.screen === 'pass' && monster === null);
  if (!waiting || !(await isOnline(ctx))) return;

  const call = await ctx.deps.tasks
    .createTask({
      language: settings.language,
      attitude: settings.attitude,
      energy: 'guess',
      text: task.originalText,
      source: task.source === 'ramble' || task.source === 'drawer' ? task.source : 'typed',
      localDate,
      timeZone: ctx.deps.timeZone(),
      overrideSerious: task.seriousOverridden,
    })
    .catch(() => null);
  if (call === null) return;
  await applyCall(ctx, call, task);
  await ctx.refresh();
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
