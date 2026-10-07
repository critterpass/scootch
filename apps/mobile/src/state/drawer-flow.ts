import {
  ITEM_TEXT_MAX,
  drawerViewReducer,
  editItem,
  hasStartLeft,
  mentionAgain,
  sameThing,
  type Id,
} from '@scootch/domain';

import type { DayContext } from './day-types';
import { park } from './task-rows';

/**
 * A parked thing is taken out of the drawer by the person: swiped away, or ticked off. It leaves
 * the way a faded one does, with no trace, and a task that was parked whole leaves with it. A tick
 * earns nothing: no card, no world piece, and no start is used.
 */
export async function removeDrawerItem(ctx: DayContext, itemId: Id): Promise<void> {
  const { drawerItems, forgetTask } = ctx.deps.repositories;
  if ((await drawerItems.get(itemId)) === null) return;
  await drawerItems.remove(itemId);
  await forgetTask(itemId);
  const { pick } = ctx.memory.state;
  if (pick.kind === 'picked_for_me' && pick.itemId === itemId) ctx.set({ pick: { kind: 'none' } });
  await ctx.refresh();
}

/**
 * A parked thing is reworded. The new words count as mentioning it again, so its fade moves on.
 * They are words nobody has screened; a thing that was heavy stays heavy until a screen says
 * otherwise. A task parked whole had its monster and its lines written for the old words, so they
 * go, and the new words are picked up fresh when the thing is swapped in. Reworded into something
 * already parked, the two become that one thing.
 */
export async function editDrawerItem(ctx: DayContext, itemId: Id, words: string): Promise<void> {
  const { drawerItems, forgetTask } = ctx.deps.repositories;
  const { localDate } = ctx.memory.state;
  const item = await drawerItems.get(itemId);
  if (item === null) return;
  const edited = editItem(item, words, localDate);
  if (edited === item) return;
  await forgetTask(itemId);
  const twin = (await drawerItems.all()).find(
    (one) => one.id !== itemId && sameThing(one.text, edited.text),
  );
  if (twin) {
    await drawerItems.remove(itemId);
    await drawerItems.put(mentionAgain(twin, localDate, edited.dueDate));
  } else {
    await drawerItems.put(edited);
  }
  await ctx.refresh();
}

/**
 * The task carried on to tomorrow is let go from the drawer: it leaves with its monster and comes
 * back on no morning. A start it used today stays used, though nothing else of it is kept.
 */
export async function removeWaitingTask(ctx: DayContext, taskId: Id): Promise<void> {
  const { waitingForTomorrow, localDate } = ctx.memory.state;
  if (waitingForTomorrow?.id !== taskId) return;
  const { sessions, forgetTask, dayNotes } = ctx.deps.repositories;
  const ran = (await sessions.where('taskId', taskId)).some((one) => one.localDate === localDate);
  await forgetTask(taskId);
  if (ran) {
    const notes = await dayNotes.read(localDate);
    await dayNotes.write({ ...notes, startsLetGo: notes.startsLetGo + 1 });
  }
  await ctx.refresh();
}

/**
 * The task waiting for tomorrow is reworded. It still comes back in the morning, in the new
 * words. They are words nobody has screened (a serious task stays serious), and its monster and
 * its lines were written for the old ones, so they go and are written again when it is asked for.
 */
export async function editWaitingTask(ctx: DayContext, taskId: Id, words: string): Promise<void> {
  const task = ctx.memory.state.waitingForTomorrow;
  if (task?.id !== taskId) return;
  const text = words.trim().replace(/\s+/g, ' ').slice(0, ITEM_TEXT_MAX);
  if (text === '' || text === task.text) return;
  const { tasks, monsters } = ctx.deps.repositories;
  await monsters.removeWhere('taskId', taskId);
  await tasks.put({
    ...task,
    text,
    originalText: text,
    screen: task.screen === 'serious' ? 'serious' : 'unscreened',
    lines: null,
    shrinkCount: 0,
  });
  await ctx.refresh();
}

/**
 * "Swap in" on the task waiting for tomorrow: it is today's one thing after all, as it is, with
 * its monster. A thing that is set and not started today goes into the drawer in its place. As
 * with any swap, taking it on with nothing set needs a start left; nothing changes otherwise, or
 * while today's thing has been started.
 */
export async function swapWaitingTaskIn(ctx: DayContext, taskId: Id): Promise<void> {
  const { waitingForTomorrow: task, today, localDate, drawer } = ctx.memory.state;
  if (task?.id !== taskId || today.kind === 'crisis') return;
  const current = 'task' in today ? today.task : null;
  if (current ? current.status !== 'set' : !hasStartLeft(today)) return;
  const { tasks, days, forgetTask } = ctx.deps.repositories;
  if (current) {
    await park(ctx, [{ text: current.originalText, dueDate: current.dueDate }], current.screen);
    await forgetTask(current.id);
  }
  await tasks.put({ ...task, localDate, carriedOver: false, status: 'set' });
  const day = await days.get(localDate);
  if (day && day.status !== 'open') await days.put({ ...day, status: 'open' });
  const { view } = drawerViewReducer({ open: drawer.open }, { type: 'swapped_in' });
  ctx.set({ pick: { kind: 'none' }, line: null, drawer: { ...drawer, open: view.open } });
  await ctx.refresh();
}
