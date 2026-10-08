import { clockAt, type InTheWay, type TaskCreateRequest } from '@scootch/domain';

import type { DayContext, Offer } from './day-types';

/**
 * The offer as it may be sent and kept. "Anything in the way?" is never asked about something
 * heavy, so its answer goes no further when the day already holds something heavy or the phone's
 * own gate held the words back.
 */
export function withoutInTheWayWhenHeavy(ctx: DayContext, offer: Offer, held: boolean): Offer {
  if (offer.inTheWay === undefined) return offer;
  if (!held && !ctx.memory.state.heavyToday) return offer;
  const { inTheWay: _dropped, ...rest } = offer;
  return rest;
}

/** The phone's wall clock, sent with every task call so "at 3" is read against it. */
export function localTimeField(ctx: DayContext): Pick<TaskCreateRequest, 'localTime'> {
  return { localTime: clockAt(ctx.now(), ctx.deps.timeZone()) };
}

/** What is in the way, for the first stage of the call the answer was given with. */
export function inTheWayField(offer: Offer): { readonly inTheWay?: InTheWay } {
  return offer.inTheWay === undefined ? {} : { inTheWay: offer.inTheWay };
}

/**
 * The answer is kept with the thing it was given about, once that thing is set: today's own,
 * made from this offer. A thing screened serious keeps none, whatever was tapped before it was read.
 */
export async function keepInTheWay(ctx: DayContext, offer: Offer): Promise<void> {
  if (offer.inTheWay === undefined) return;
  const { today } = ctx.memory.state;
  if (today.kind !== 'task_set' || today.task.screen === 'serious') return;
  if ((today.task.inTheWay ?? null) !== null) return;
  // Read again: the name or the pack may have been written to the row since today was read.
  const task = await ctx.deps.repositories.tasks.get(today.task.id);
  if (task === null || task.screen === 'serious') return;
  await ctx.deps.repositories.tasks.put({ ...task, inTheWay: offer.inTheWay });
  await ctx.refresh();
}
