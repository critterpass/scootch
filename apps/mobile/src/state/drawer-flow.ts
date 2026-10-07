import { editItem, sameThing, mentionAgain, type Id } from '@scootch/domain';

import type { DayContext } from './day-types';

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
