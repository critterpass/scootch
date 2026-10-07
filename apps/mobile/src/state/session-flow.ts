import {
  addDays,
  hasStartLeft,
  isoFromInstant,
  sessionReducer,
  sessionSet,
  type LiveSession,
  type SessionEffect,
  type SessionEvent,
  type SessionRow,
  type SessionState,
  type TaskRow,
} from '@scootch/domain';

import type { SessionContext } from '../effects/adapters';

import type { DayContext } from './day-types';
import { persistFinishEarnings } from './finish-earnings';
import { unansweredThoughts } from './parked-thoughts';
import { shrinkTask } from './smaller';
import { NO_AFTER_LINES, afterLinesFor, lineFor, toneFor } from './lines';

/** A session that has started and not yet ended. */
export const UNDER_WAY: readonly string[] = [
  'running',
  'stuck',
  'holding',
  'time_up',
  'not_finished',
];

const TEXT_MAX = 280;
const TREAT_MAX = 80;

/**
 * How many tiny next steps down the stuck card is: the ones the task itself has already shrunk
 * to, and one more for each "Smaller" tapped on the card.
 */
export function stepDown(task: Pick<TaskRow, 'shrinkCount'>, session: SessionState | null): number {
  const tapped = session !== null && 'stepShrinks' in session ? session.stepShrinks : 0;
  return task.shrinkCount + tapped;
}

export function contextFor(ctx: DayContext, task: TaskRow): SessionContext {
  const { settings, session } = ctx.memory.state;
  return {
    title: task.text,
    liveLine: lineFor('working', task, settings, ctx.memory.workingTurn) ?? '',
    // Each "Smaller" on the stuck card asks for the next step down.
    lineFor: (slot) =>
      lineFor(slot, task, settings, slot === 'tinyNextStep' ? stepDown(task, session) : 0),
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
      // One open session per task: a start that finds one already open carries on with it.
      const open = (await repositories.sessions.where('taskId', task.id)).find(
        (one) => one.endedAt === null,
      );
      if (open) {
        ctx.memory.sessionRowId = open.id;
        continue;
      }
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
      await carryToTomorrow(ctx, current);
      current = (await repositories.tasks.get(current.id)) ?? current;
    } else if (effect.kind === 'forget_task') {
      // The thoughts parked on the way are the person's own, not the task's: they stay.
      const thoughts = await unansweredThoughts(ctx, effect.taskId);
      await repositories.forgetTask(effect.taskId);
      for (const thought of thoughts) await repositories.parkedThoughts.put(thought);
      ctx.memory.sessionRowId = null;
    }
    // Every other effect is the runner's to perform.
  }
}

/**
 * The task waits for tomorrow and today rests. The start it used today stays counted: its
 * session keeps today's date.
 */
async function carryToTomorrow(ctx: DayContext, task: TaskRow): Promise<void> {
  const { tasks, days } = ctx.deps.repositories;
  const { localDate } = ctx.memory.state;
  await tasks.put({ ...task, localDate: addDays(localDate, 1), carriedOver: true, status: 'set' });
  const day = await days.get(localDate);
  if (day && day.status === 'open') await days.put({ ...day, status: 'done' });
}

/**
 * "That's it for today": the day rests without a finish. A task that is set, or was started and
 * left, waits for tomorrow; nothing is dropped. A serious task has its own "Not today".
 */
export async function restForToday(ctx: DayContext): Promise<void> {
  const { today, localDate } = ctx.memory.state;
  if (today.kind === 'task_set') {
    await carryToTomorrow(ctx, today.task);
    ctx.set({ pick: { kind: 'none' }, session: null, line: null });
  } else if (today.kind === 'nothing_yet') {
    const day = await ctx.deps.repositories.days.get(localDate);
    if (day && day.status === 'open')
      await ctx.deps.repositories.days.put({ ...day, status: 'done' });
  }
  await ctx.refresh();
}

export function currentTask(ctx: DayContext): TaskRow | null {
  const { today } = ctx.memory.state;
  return 'task' in today ? today.task : null;
}

/** The session is set for today's one thing and waits for the start. */
export function setSession(ctx: DayContext, minutes: number, treat: string | null): void {
  const task = currentTask(ctx);
  if (!task) return;
  // A second tap on Start arrives while the first one's session is already going: it changes
  // nothing. Only a session that has not started, or is over, makes way for a new one.
  const { session } = ctx.memory.state;
  if (session && session.phase !== 'let_go' && UNDER_WAY.includes(session.phase)) return;
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
    afterLines: NO_AFTER_LINES,
  });
}

/** Runs one event through the session reducer at the current time, stores the result and performs the effects. */
export async function applySession(ctx: DayContext, event: SessionEvent): Promise<void> {
  const { session } = ctx.memory.state;
  const task = currentTask(ctx);
  if (!session || !task) return;
  // A start goes through the day's limit like everything else. A task already started today has
  // used its start and may be picked up again.
  const { today } = ctx.memory.state;
  if (event.type === 'started' && today.kind === 'task_set' && task.status === 'set') {
    if (!hasStartLeft(today)) return;
  }

  const step = sessionReducer(session, event, ctx.now());
  ctx.set({ session: step.state });
  if (step.state.phase === 'not_finished' && session.phase !== 'not_finished') {
    await markNotFinished(ctx);
  }
  await persist(ctx, step.state.phase === 'let_go' ? null : step.state, task, step.effects);
  ctx.deps.runner.run(step.effects, contextFor(ctx, task));
  const handedOver = step.effects.some(
    (effect) => effect.kind === 'hand_over_treat' || effect.kind === 'show_parked_thoughts',
  );
  // The finish's own screens take their lines from the task while it is still at hand.
  if (handedOver)
    ctx.set({ afterLines: afterLinesFor(task, session.phase === 'let_go' ? null : session.treat) });
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
