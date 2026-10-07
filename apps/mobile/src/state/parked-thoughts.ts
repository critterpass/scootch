import {
  isoFromInstant,
  parkThings,
  type Id,
  type ParkedThought,
  type ParkedThoughtRow,
} from '@scootch/domain';

import type { DayContext } from './day-types';

const TEXT_MAX = 280;

type Reading = Pick<DayContext, 'deps'>;

/** The thoughts parked in a task's sessions that nobody has kept or discarded yet. */
export async function unansweredThoughts(ctx: Reading, taskId: Id): Promise<ParkedThoughtRow[]> {
  const { sessions, parkedThoughts } = ctx.deps.repositories;
  const rows: ParkedThoughtRow[] = [];
  for (const session of await sessions.where('taskId', taskId)) {
    for (const row of await parkedThoughts.where('sessionId', session.id)) {
      if (row.resolution === null) rows.push(row);
    }
  }
  return rows;
}

async function intoDrawer(ctx: DayContext, text: string): Promise<void> {
  const { repositories, nextId } = ctx.deps;
  const drawer = parkThings({
    drawer: await repositories.drawerItems.all(),
    things: [{ text: text.slice(0, TEXT_MAX) }],
    screen: 'unscreened',
    today: ctx.memory.state.localDate,
    now: ctx.now(),
    nextId,
  });
  for (const item of drawer) await repositories.drawerItems.put(item);
}

/**
 * A parked thought is the person's own words, so it is never dropped by anything but their own
 * "let it go". Every thought nobody answered for, in a session that is over (finished, left,
 * rolled over with its day, or gone with a task that was let go), goes to the drawer. A session
 * still under way keeps its thoughts for its own end.
 */
export async function keepUnansweredThoughts(ctx: DayContext): Promise<void> {
  const { sessions, parkedThoughts } = ctx.deps.repositories;
  let kept = false;
  for (const row of await parkedThoughts.all()) {
    if (row.resolution !== null) continue;
    const session = await sessions.get(row.sessionId);
    if (session && session.endedAt === null) continue;
    await intoDrawer(ctx, row.text);
    await parkedThoughts.put({ ...row, resolution: 'keep' });
    kept = true;
  }
  if (kept) await ctx.refresh();
}

/** Keep copies a handed-over thought into the drawer; discard lets it go. */
export async function resolveThought(
  ctx: DayContext,
  thought: ParkedThought,
  resolution: 'keep' | 'discard',
): Promise<void> {
  const { repositories } = ctx.deps;
  const { parkedThoughts } = ctx.memory.state;
  if (resolution === 'keep') await intoDrawer(ctx, thought.text);
  const parkedAt = isoFromInstant(thought.parkedAt);
  for (const row of await repositories.parkedThoughts.all()) {
    if (row.resolution === null && row.text === thought.text && row.parkedAt === parkedAt) {
      await repositories.parkedThoughts.put({ ...row, resolution });
    }
  }
  ctx.set({ parkedThoughts: parkedThoughts.filter((one) => one !== thought) });
  await ctx.refresh();
}
