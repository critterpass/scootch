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
