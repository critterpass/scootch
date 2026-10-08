import {
  isoFromInstant,
  nextStartAfter,
  nextStartFrom,
  sessionReducer,
  startRefused,
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
import { carryToTomorrow } from './rest-flow';
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
    taskId: task.id,
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
      // Every open row of the task ends here, not only the one this run of the app remembers: a
      // second row left open (by an earlier version, or a start taken up twice) would keep the
      // day in a session with nothing running, and home would send the person back into it.
      const open = (await repositories.sessions.where('taskId', task.id)).filter(
        (one) => one.endedAt === null,
      );
      for (const row of open) {
        await repositories.sessions.put({
          ...row,
          // The session ended when the person ended it, and no later than its planned end.
          endedAt: isoFromInstant(Math.min(effect.endedAt, Date.parse(row.endsAt))),
          outcome: effect.outcome,
          finishMethod: effect.finishMethod,
          notFinishedChoice: effect.notFinishedChoice,
        });
      }
      ctx.memory.sessionRowId = null;
    } else if (effect.kind === 'grant_finish_reward') {
      await save({
        status: 'finished',
        finishedAt: isoFromInstant(ctx.now()),
        // A caught thing has no next sitting, so no line waits for one.
        nextStart: nextStartAfter(current.nextStart, 'caught'),
      });
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
      // A session ran for it today: that start stays used, though nothing else of it is kept.
      const { localDate } = ctx.memory.state;
      const ran = (await repositories.sessions.where('taskId', effect.taskId)).some(
        (one) => one.localDate === localDate,
      );
      await repositories.forgetTask(effect.taskId);
      if (ran) {
        const notes = await repositories.dayNotes.read(localDate);
        await repositories.dayNotes.write({ ...notes, startsLetGo: notes.startsLetGo + 1 });
      }
      for (const thought of thoughts) await repositories.parkedThoughts.put(thought);
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
      nextStart: task.nextStart ?? null,
    }),
    burst: null,
    treat: null,
    line: null,
    afterLines: NO_AFTER_LINES,
  });
}

/** Runs one event through the session reducer at the current time, stores the result and performs the effects. */
export async function applySession(
  ctx: DayContext,
  event: SessionEvent,
  line?: string,
): Promise<void> {
  const { session } = ctx.memory.state;
  const kept = await keepLine(ctx, event, line);
  const task = kept ?? currentTask(ctx);
  if (!session || !task) return;
  // A start goes through the day's limit like everything else. A task already started today has
  // used its start and may be picked up again.
  const { today } = ctx.memory.state;
  if (event.type === 'started' && startRefused(today)) return;

  const step = sessionReducer(session, event, ctx.now());
  if ((step.state.phase === 'not_finished') !== (session.phase === 'not_finished')) {
    // Tapped, or taken back before any of the three choices: the stored session says which.
    const back = step.state.phase === 'running' || step.state.phase === 'time_up';
    if (step.state.phase === 'not_finished' || back) await markNotFinished(ctx, !back);
  }
  await persist(ctx, step.state.phase === 'let_go' ? null : step.state, task, step.effects);
  // Shown only once it is stored: a write that fails leaves the screen where storage is.
  ctx.set({ session: step.state });
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
async function markNotFinished(ctx: DayContext, tapped: boolean): Promise<void> {
  const { sessions } = ctx.deps.repositories;
  const row = ctx.memory.sessionRowId ? await sessions.get(ctx.memory.sessionRowId) : null;
  if (row) await sessions.put({ ...row, outcome: tapped ? 'not_finished' : null });
}

/**
 * "Save for tomorrow": the task that is being carried on keeps the words left for its next
 * sitting, exactly as they were given, with today's date. `null` when there is nothing to keep:
 * empty words are the same as Skip, and a line comes only with the carry-on from "not finished".
 */
async function keepLine(
  ctx: DayContext,
  event: SessionEvent,
  line: string | undefined,
): Promise<TaskRow | null> {
  const { session, localDate } = ctx.memory.state;
  const task = currentTask(ctx);
  if (!task || line === undefined || event.type !== 'chose_carry_on') return null;
  if (session?.phase !== 'not_finished') return null;
  const nextStart = nextStartFrom(line, localDate);
  if (nextStart === null) return null;
  const kept = { ...task, nextStart };
  await ctx.deps.repositories.tasks.put(kept);
  return kept;
}
