import {
  drawerViewReducer,
  hasStartLeft,
  sameThing,
  swapIn,
  type DrawerEvent,
  type Id,
  type TaskRow,
} from '@scootch/domain';

import type { DayContext } from './day-types';
import { setSession } from './session-flow';
import { shrinkTask } from './smaller';
import { newTask, park } from './task-rows';

/** The length a session is asked for when none was chosen. */
const USUAL_MINUTES = 10;

/** Today's one thing while it can still be swapped, shrunk or set aside: set, not started. */
function setTask(ctx: DayContext): TaskRow | null {
  const { today } = ctx.memory.state;
  return 'task' in today && today.task.status === 'set' ? today.task : null;
}

/** The drawer shows or hides by the domain's rule: only the person's own pull opens it. */
export function drawerEvent(ctx: DayContext, event: DrawerEvent): void {
  const { drawer } = ctx.memory.state;
  const { view } = drawerViewReducer({ open: drawer.open }, event);
  ctx.set({ drawer: { ...drawer, open: view.open } });
}

/**
 * Makes a drawer item today's one thing, by the domain's swap: the thing it replaces goes into
 * the drawer in its place, with its monster gone. False when the domain refuses the swap.
 */
export async function swapItemIn(ctx: DayContext, itemId: Id): Promise<boolean> {
  const { repositories } = ctx.deps;
  // Taking a thing on with nothing set uses one of the day's starts; swapping one for another does not.
  if (setTask(ctx) === null && !hasStartLeft(ctx.memory.state.today)) return false;
  const before = await repositories.drawerItems.all();
  const result = swapIn({
    drawer: before,
    itemId,
    current: setTask(ctx),
    today: ctx.memory.state.localDate,
    now: ctx.now(),
    nextId: ctx.deps.nextId,
  });
  if (!result.ok) return false;

  await repositories.drawerItems.remove(itemId);
  for (const item of result.drawer) await repositories.drawerItems.put(item);
  if (result.replacedTaskId !== null) await repositories.forgetTask(result.replacedTaskId);
  const { oneThing } = result;
  // A task that was parked whole comes back as itself, with its monster and its lines.
  const whole = await repositories.tasks.get(itemId);
  await repositories.tasks.put(
    whole && whole.status !== 'finished'
      ? { ...whole, localDate: oneThing.localDate, carriedOver: false, status: 'set' }
      : {
          ...newTask(ctx, oneThing.text, oneThing.source, oneThing.screen),
          firstMentionedOn: oneThing.firstMentionedOn,
          dueDate: oneThing.dueDate,
        },
  );
  ctx.memory.restPending = false;
  ctx.memory.turnedDown = [];
  drawerEvent(ctx, { type: 'swapped_in' });
  await ctx.refresh();
  return true;
}

/** The drawer item a heard date was parked as. */
export async function deadlineItem(ctx: DayContext, text: string): Promise<Id | null> {
  const items = await ctx.deps.repositories.drawerItems.all();
  return items.find((item) => item.dueDate !== null && sameThing(item.text, text))?.id ?? null;
}

/** A heard date has been answered, so it is not said again. */
export function deadlineAnswered(ctx: DayContext, text: string): void {
  const left = ctx.memory.state.heardDeadlines.filter((one) => !sameThing(one.text, text));
  ctx.set({ heardDeadlines: left });
}

/**
 * "Pick for me": the shortest thing in the drawer that has not just been turned down. "Pick
 * again" turns the offered one down; when everything has been, the round starts over.
 */
export function pickForMe(ctx: DayContext): void {
  const { pick, drawer } = ctx.memory.state;
  if (drawer.items.length === 0) return;
  if (pick.kind === 'picked_for_me') {
    // The only thing parked cannot be turned down for another: there is no other.
    if (drawer.items.length === 1) return;
    ctx.memory.turnedDown.push(pick.itemId);
  }
  let open = drawer.items.filter((item) => !ctx.memory.turnedDown.includes(item.id));
  if (open.length === 0) {
    ctx.memory.turnedDown = [];
    open = [...drawer.items];
  }
  const [smallest] = [...open].sort(
    (a, b) => a.text.length - b.text.length || a.id.localeCompare(b.id),
  );
  if (smallest) ctx.set({ pick: { kind: 'picked_for_me', itemId: smallest.id } });
}

/** A session is set at the length the person chose, or the usual one. */
export function setChosenSession(
  ctx: DayContext,
  minutes: number | null,
  treat: string | null,
): void {
  ctx.set({ pick: { kind: 'none' } });
  setSession(ctx, minutes ?? USUAL_MINUTES, treat);
}

/** "Too big", at the hatch: the task and its monster get smaller together. */
export async function tooBig(ctx: DayContext): Promise<void> {
  const task = setTask(ctx);
  if (!task) return;
  await shrinkTask(ctx, task);
  if (ctx.memory.state.pick.kind === 'hatching') {
    ctx.set({ pick: { kind: 'hatching', shrunk: true } });
  }
  await ctx.refresh();
}

/** The discard button on a set task: it waits in the drawer, with no trace here. */
export async function setTaskAside(ctx: DayContext): Promise<void> {
  const task = setTask(ctx);
  if (!task) return;
  await park(ctx, [{ text: task.originalText, dueDate: task.dueDate }], task.screen);
  await ctx.deps.repositories.forgetTask(task.id);
  ctx.set({ pick: { kind: 'none' }, line: null });
  await ctx.refresh();
}
