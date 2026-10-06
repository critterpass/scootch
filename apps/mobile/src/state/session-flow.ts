import {
  addDays,
  checkInAt,
  instantFromIso,
  isoFromInstant,
  parkThings,
  sessionReducer,
  sessionSet,
  type LiveSession,
  type ParkedThought,
  type SessionEffect,
  type SessionEvent,
  type SessionRow,
  type TaskRow,
} from '@scootch/domain';

import type { SessionContext } from '../effects/adapters';

import type { DayContext } from './day-types';
import { persistFinishEarnings } from './finish-earnings';
import { shrinkTask } from './smaller';
import { lineFor, toneFor } from './lines';

const TEXT_MAX = 280;
const TREAT_MAX = 80;

export function contextFor(ctx: DayContext, task: TaskRow): SessionContext {
  const { settings } = ctx.memory.state;
  return {
    title: task.text,
    liveLine: lineFor('working', task, settings, ctx.memory.workingTurn) ?? '',
    lineFor: (slot) => lineFor(slot, task, settings),
  };
}

/** Writes what one reducer step changed. Each effect is performed once, when it is emitted. */
async function persist(
  ctx: DayContext,
  session: LiveSession | null,
  task: TaskRow,
  effects: readonly SessionEffect[],
): Promise<void> {
  const { repositories, nextId } = ctx.deps;
  let current = task;
  const save = async (changes: Partial<TaskRow>) => {
    current = { ...current, ...changes };
    await repositories.tasks.put(current);
  };

  for (const effect of effects) {
    if (effect.kind === 'grant_start_reward') {
      if (!session || session.startedAt === null || session.endsAt === null) continue;
      const row: SessionRow = {
        id: nextId(),
        taskId: task.id,
        localDate: task.localDate,
        plannedMinutes: session.ask.minutes,
        treat: session.treat,
        startedAt: isoFromInstant(session.startedAt),
        endsAt: isoFromInstant(session.endsAt),
        endedAt: null,
        outcome: null,
        finishMethod: null,
        notFinishedChoice: null,
        tableId: null,
      };
      await repositories.sessions.put(row);
      ctx.memory.sessionRowId = row.id;
      await save({ status: 'started' });
    } else if (effect.kind === 'save_parked_thought') {
      if (ctx.memory.sessionRowId === null) continue;
      await repositories.parkedThoughts.put({
        id: nextId(),
        sessionId: ctx.memory.sessionRowId,
        text: effect.thought.text.slice(0, TEXT_MAX),
        parkedAt: isoFromInstant(effect.thought.parkedAt),
        resolution: null,
      });
    } else if (effect.kind === 'record_session_end') {
      const row = ctx.memory.sessionRowId
        ? await repositories.sessions.get(ctx.memory.sessionRowId)
        : null;
      if (!row) continue;
      await repositories.sessions.put({
        ...row,
        endedAt: isoFromInstant(effect.endedAt),
        outcome: effect.outcome,
        finishMethod: effect.finishMethod,
        notFinishedChoice: effect.notFinishedChoice,
      });
      ctx.memory.sessionRowId = null;
    } else if (effect.kind === 'grant_finish_reward') {
      await save({ status: 'finished', finishedAt: isoFromInstant(ctx.now()) });
      await persistFinishEarnings(ctx, current, effect.tone, session?.treat ?? null);
      ctx.deps.onFinished?.();
    } else if (effect.kind === 'shrink_task') {
      await shrinkTask(ctx, current);
      current = (await repositories.tasks.get(current.id)) ?? current;
    } else if (effect.kind === 'carry_task_to_tomorrow') {
      await save({ localDate: addDays(current.localDate, 1), carriedOver: true, status: 'set' });
    } else if (effect.kind === 'forget_task') {
      await repositories.forgetTask(effect.taskId);
      ctx.memory.sessionRowId = null;
    }
    // Every other effect is the runner's to perform.
  }
}

export function currentTask(ctx: DayContext): TaskRow | null {
  const { today } = ctx.memory.state;
  return 'task' in today ? today.task : null;
}

/** The session is set for today's one thing and waits for the start. */
export function setSession(ctx: DayContext, minutes: number, treat: string | null): void {
  const task = currentTask(ctx);
  if (!task) return;
  ctx.memory.workingTurn = 0;
  ctx.set({
    session: sessionSet({
      taskId: task.id,
      tone: toneFor(task),
      minutes,
      shrinkCount: task.shrinkCount,
      treat: treat === null ? null : treat.slice(0, TREAT_MAX),
    }),
    burst: null,
    treat: null,
    line: null,
  });
}

/** Runs one event through the session reducer at the current time, stores the result and performs the effects. */
export async function applySession(ctx: DayContext, event: SessionEvent): Promise<void> {
  const { session } = ctx.memory.state;
  const task = currentTask(ctx);
  if (!session || !task) return;

  const step = sessionReducer(session, event, ctx.now());
  ctx.set({ session: step.state });
  if (step.state.phase === 'not_finished' && session.phase !== 'not_finished') {
    await markNotFinished(ctx);
  }
  await persist(ctx, step.state.phase === 'let_go' ? null : step.state, task, step.effects);
  ctx.deps.runner.run(step.effects, contextFor(ctx, task));
  await ctx.refresh();
}

/**
 * "Not finished" was tapped: the stored session says so at once, before any of the three choices,
 * so the tap is still there after the app is killed. The row keeps no end until a choice is made.
 */
async function markNotFinished(ctx: DayContext): Promise<void> {
  const { sessions } = ctx.deps.repositories;
  const row = ctx.memory.sessionRowId ? await sessions.get(ctx.memory.sessionRowId) : null;
  if (row) await sessions.put({ ...row, outcome: 'not_finished' });
}

/**
 * The running session as it is stored, brought back after the app was killed: the timer is the
 * stored end time, and the relaunch re-arms the timers without starting or granting anything.
 */
export async function restoreSession(ctx: DayContext, tasks: readonly TaskRow[]): Promise<void> {
  const { repositories } = ctx.deps;
  for (const task of tasks) {
    const row = (await repositories.sessions.where('taskId', task.id)).find(
      (one) => one.endedAt === null,
    );
    if (!row) continue;
    const thoughts: ParkedThought[] = (await repositories.parkedThoughts.where('sessionId', row.id))
      .map((one) => ({ text: one.text, parkedAt: instantFromIso(one.parkedAt) }))
      .sort((a, b) => a.parkedAt - b.parkedAt);
    const startedAt = instantFromIso(row.startedAt);
    const endsAt = instantFromIso(row.endsAt);
    const base: LiveSession = {
      ...sessionSet({
        taskId: task.id,
        tone: toneFor(task),
        minutes: row.plannedMinutes,
        shrinkCount: task.shrinkCount,
        treat: row.treat,
      }),
      startedAt,
      endsAt,
      thoughts,
    };
    ctx.memory.sessionRowId = row.id;
    if (row.outcome === 'not_finished') {
      // The three choices are still waiting. The tap's own moment is not stored: time was up.
      ctx.set({
        session: { ...base, phase: 'not_finished', endedAt: endsAt, warned: true, checkedIn: true },
      });
      ctx.deps.runner.run([{ kind: 'show_line', line: 'notFinished' }], contextFor(ctx, task));
      return;
    }
    // A check-in whose moment has passed was offered while the app was open, or belongs to a
    // stretch nobody was looking at: either way it is not offered now. "I'm stuck" is still there.
    const checkAt = checkInAt({ ...base, phase: 'running' });
    const stored: LiveSession = {
      ...base,
      phase: 'running',
      inForeground: false,
      checkedIn: checkAt !== null && ctx.now() >= checkAt,
    };
    const step = sessionReducer(stored, { type: 'relaunched' }, ctx.now());
    ctx.set({ session: step.state });
    ctx.deps.runner.run(step.effects, contextFor(ctx, task));
    return;
  }
}

/** Keep copies a handed-over thought into the drawer; discard lets it go. */
export async function resolveThought(
  ctx: DayContext,
  thought: ParkedThought,
  resolution: 'keep' | 'discard',
): Promise<void> {
  const { repositories, nextId } = ctx.deps;
  const { localDate, parkedThoughts } = ctx.memory.state;
  if (resolution === 'keep') {
    const drawer = parkThings({
      drawer: await repositories.drawerItems.all(),
      things: [{ text: thought.text.slice(0, TEXT_MAX) }],
      screen: 'unscreened',
      today: localDate,
      now: ctx.now(),
      nextId,
    });
    for (const item of drawer) await repositories.drawerItems.put(item);
  }
  const parkedAt = isoFromInstant(thought.parkedAt);
  for (const row of await repositories.parkedThoughts.all()) {
    if (row.resolution === null && row.text === thought.text && row.parkedAt === parkedAt) {
      await repositories.parkedThoughts.put({ ...row, resolution });
    }
  }
  ctx.set({ parkedThoughts: parkedThoughts.filter((one) => one !== thought) });
  await ctx.refresh();
}
