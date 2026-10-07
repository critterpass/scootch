import type { Id } from '@scootch/domain';

import type { DayEvent } from '../../state/day-types';

/**
 * What the drawer's rows ask of the day. The task waiting for tomorrow is listed among them under
 * its own id, and is a task, not a parked thing: the same tap means its own event.
 */
export function drawerRowEvents(waitingId: Id | null, send: (event: DayEvent) => void) {
  const waits = (id: Id) => id === waitingId;
  return {
    onSwapIn: (itemId: Id) =>
      send(
        waits(itemId)
          ? { type: 'waiting_task_swapped_in', taskId: itemId }
          : { type: 'drawer_item_swapped_in', itemId },
      ),
    onRemove: (itemId: Id) =>
      send(
        waits(itemId)
          ? { type: 'waiting_task_removed', taskId: itemId }
          : { type: 'drawer_item_removed', itemId },
      ),
    onEdit: (itemId: Id, text: string) =>
      send(
        waits(itemId)
          ? { type: 'waiting_task_edited', taskId: itemId, text }
          : { type: 'drawer_item_edited', itemId, text },
      ),
  };
}
