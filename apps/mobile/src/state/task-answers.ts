import type { TaskLabels, TaskRow, TaskScreen } from '@scootch/domain';

import type { TaskCall, TaskCallOptions, TaskName, TaskRest } from '../api/task-client';

import { enterCrisis, stopWithoutAWord } from './care-flow';
import type { DayContext, Offer, Reveal } from './day-types';
import { sortKeptWords } from './late-words';
import { fallbackCopy, monsterFor, newTask, park } from './task-rows';

/** A ramble's words are kept while its one thing is being picked, once they are known to be safe to keep. */
export async function keepTranscript(ctx: DayContext, offer: Offer): Promise<void> {
  if (offer.source !== 'ramble' || offer.transcriptId !== null) return;
  const transcriptId = ctx.deps.nextId();
  await ctx.deps.repositories.transcripts.save(transcriptId, offer.text, ctx.now());
  ctx.memory.offer = { ...offer, transcriptId };
}

/** The treat named for the session that is set or running, for a line pack asked for meanwhile. */
export function treatNamed(ctx: DayContext): TaskCallOptions {
  return {
    treat: () => {
      const { session } = ctx.memory.state;
      return session !== null && 'treat' in session ? session.treat : null;
    },
  };
}

type RestOutcome = { readonly rest: TaskRest | null } | 'failed';

/**
 * The monster's name arrived ahead of the line pack: the monster is written and its hatch line
 * said, so the hatch shows without waiting for the rest. A task swapped out, let go or no longer
 * an ordinary one gets nothing.
 */
async function applyName(
  ctx: DayContext,
  taskId: string,
  labels: TaskLabels | null,
  name: TaskName | null,
): Promise<void> {
  const { tasks, monsters } = ctx.deps.repositories;
  if (name === null || labels === null) return;
  const task = await tasks.get(taskId);
  if (!task || task.screen !== 'pass') return;
  if ((await monsters.where('taskId', task.id)).length > 0) return;
  await monsters.put(monsterFor(ctx, task, labels, name.monster));
  ctx.set({ line: { slot: 'hatch', text: name.hatch } });
  await ctx.refresh();
}

/**
 * Writes the second stage when it arrives. A task that was swapped out or let go in the meantime
 * gets nothing. When the rest never comes, an ordinary task whose labels are known still gets its
 * monster, with a plain name, and speaks the offline lines. A monster its name already brought is
 * kept as it is.
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
  const [named] = await repositories.monsters.where('taskId', task.id);
  if (named) {
    if (pass?.monster) await repositories.monsters.put({ ...named, ...pass.monster });
  } else {
    const copy = pass?.monster ?? fallbackCopy(ctx, written, known);
    await repositories.monsters.put(monsterFor(ctx, written, known, copy));
  }
  // The hatch line the name brought stays; otherwise the pack's own is said now.
  if (pass?.lines && !named) ctx.set({ line: { slot: 'hatch', text: pass.lines.hatch } });
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
 * The server rejected the text (abuse, or an attempt to steer the model): nothing made from it
 * stays. A task already on the phone for it goes with its monster and its session, the kept words
 * of the ramble go, and nothing is said: the composer asks, in the interface's own plain words,
 * for something else.
 */
async function dropRejected(ctx: DayContext, existing: TaskRow | null): Promise<void> {
  const { transcripts, forgetTask } = ctx.deps.repositories;
  if (existing) {
    // Any words still kept for a pick are this task's own.
    for (let one = await transcripts.pending(); one; one = await transcripts.pending()) {
      await transcripts.remove(one.id);
    }
    await stopWithoutAWord(ctx);
    await ctx.deps.repositories.unsortedWords.remove(existing.id);
    await forgetTask(existing.id);
  } else {
    const transcriptId = ctx.memory.offer?.transcriptId;
    if (transcriptId) await transcripts.remove(transcriptId);
    ctx.memory.offer = null;
    ctx.set({ pick: { kind: 'none' }, line: null, heardDeadlines: [] });
  }
  ctx.set({ notice: 'say_it_another_way' });
}

/**
 * Writes what a task call answered first, and leaves the rest to arrive by itself. `existing` is
 * a task already on the phone that was waiting for its answer: its words stay exactly as the
 * person typed them, and nothing is offered again.
 */
export async function applyCall(ctx: DayContext, call: TaskCall, existing: TaskRow | null) {
  const { repositories } = ctx.deps;
  const { first } = call;
  const offer = ctx.memory.offer;

  if (first.verdict === 'crisis') {
    if (existing) await repositories.forgetTask(existing.id);
    return enterCrisis(ctx);
  }
  if (first.verdict === 'reject') return dropRejected(ctx, existing);

  // An answer the trusted judge did not give clears nothing: a pass stays unscreened, on the quiet
  // path, and a serious one stays serious; either way the task is screened again.
  const trusted = first.trusted !== false;
  const screen: TaskScreen = trusted || first.verdict === 'serious' ? first.verdict : 'unscreened';
  const waited: TaskRow | null = existing && {
    ...existing,
    screen,
    seriousOverridden: first.seriousOverridden,
  };
  if (waited) await repositories.tasks.put(waited);
  const task: TaskRow = waited
    ? await sortKeptWords(ctx, waited, first)
    : {
        ...newTask(ctx, first.oneThing.text, offer?.source ?? 'typed', screen),
        seriousOverridden: first.seriousOverridden,
        dueDate: first.oneThing.dueDate,
      };
  await repositories.tasks.put(task);
  ctx.memory.untrustedTaskId = trusted ? null : task.id;
  if (!trusted) ctx.memory.screenAskedAt = ctx.now();
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
  const labels = first.labels ?? null;
  if (call.name) {
    ctx.later(
      call.name.catch(() => null),
      (name) => applyName(ctx, task.id, labels, name),
    );
  }
  ctx.later(
    call.rest.then(
      (rest): RestOutcome => ({ rest }),
      (): RestOutcome => 'failed',
    ),
    (outcome) => applyRest(ctx, task.id, labels, outcome),
  );
}
