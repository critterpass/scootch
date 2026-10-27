import type { Instant, IsoDate, Moment } from './moment';
import { pickNext, type PickContext, type Ranked } from './pick';
import { shortName } from './short-name';
import { isOpen, type Task } from './task';

/**
 * What the board can do to its tasks. Each takes the whole board and returns it changed, so the
 * one-task-on-the-desk rule holds in one place.
 */

function replace(tasks: readonly Task[], changed: readonly Task[]): Task[] {
  const byId = new Map(changed.map((task) => [task.id, task]));
  return tasks.map((task) => byId.get(task.id) ?? task);
}

/** The task on the desk, if any. */
export function deskTask(tasks: readonly Task[]): Task | null {
  return tasks.find((task) => task.status === 'desk') ?? null;
}

function onDesk(task: Task, at: Instant): Task {
  return {
    ...task,
    status: 'desk',
    desk: { since: at, opened: at, startedAt: null, insideFuse: null },
    lastTouched: at,
  };
}

function offDesk(task: Task): Task {
  return { ...task, status: 'board', desk: null };
}

/**
 * Puts a task on the desk by hand. Allowed for any open task; whatever was on the desk goes back
 * on the board unchanged. He says one line about the swap; nothing else changes.
 */
export function swapOntoDesk(tasks: readonly Task[], id: string, at: Instant): Task[] {
  const chosen = tasks.find((task) => task.id === id);
  if (chosen === undefined || !isOpen(chosen) || chosen.status === 'desk') return [...tasks];
  const current = deskTask(tasks);
  const placed = { ...onDesk(chosen, at), order: { ...chosen.order, swappedAt: at } };
  return replace(tasks, current === null ? [placed] : [offDesk(current), placed]);
}

/**
 * When the desk is empty, he puts his pick on it. Returns the board and the pick (with its reason
 * for his line), or the board unchanged when the desk is taken or the board is empty.
 */
export function fillDesk(
  tasks: readonly Task[],
  context: PickContext,
): { readonly tasks: Task[]; readonly picked: Ranked | null } {
  if (deskTask(tasks) !== null) return { tasks: [...tasks], picked: null };
  const picked = pickNext(tasks, context);
  if (picked === null) return { tasks: [...tasks], picked: null };
  const placed = onDesk(picked.task, context.now.at);
  return { tasks: replace(tasks, [placed]), picked: { ...picked, task: placed } };
}

/** The desk was opened in front of the user: the fuse starts burning again. */
export function openDesk(task: Task, at: Instant): Task {
  if (task.status !== 'desk' || task.desk === null || task.desk.startedAt !== null) return task;
  return { ...task, desk: { ...task.desk, opened: at } };
}

/** New words for a task, and a short name worked out from them. */
export function reword(task: Task, text: string, at: Instant): Task {
  const words = text.trim();
  return words === '' ? task : { ...task, text: words, short: shortName(words), lastTouched: at };
}

/** A new due day, or none. */
export function redate(task: Task, dueDate: IsoDate | null, at: Instant): Task {
  return { ...task, dueDate, lastTouched: at };
}

/**
 * Ticked off from the board, without a period. It is done and in the logbook, quietly: no
 * comment, no carving.
 */
export function tickOff(task: Task, now: Moment): Task {
  if (!isOpen(task)) return task;
  return {
    ...task,
    status: 'done',
    desk: null,
    lastTouched: now.at,
    done: {
      at: now.at,
      day: now.day,
      periodMinutes: null,
      comment: null,
      carving: null,
      giayKhen: false,
    },
  };
}

/** Rubbed off the board. A decision to drop something gets no comment, so there is no outcome. */
export function erase(task: Task, at: Instant): Task {
  return { ...task, status: 'erased', desk: null, lastTouched: at };
}
