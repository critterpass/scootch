import type { DayContext, PickEvent } from './day-types';
import {
  askSmaller,
  counterOffer,
  deadlineAnswered,
  deadlineItem,
  pickForMe,
  setBargainedSession,
  setTaskAside,
  swapItemIn,
  tooBig,
} from './pick-flow';
import { afterPicked, resolveTranscript } from './task-flow';

/**
 * The events between a sent ramble and a set task: the pick, a heard date, the drawer's swap,
 * bargaining and the hatch.
 */
export async function applyPickEvent(ctx: DayContext, event: PickEvent): Promise<void> {
  switch (event.type) {
    case 'one_thing_picked':
      await resolveTranscript(ctx);
      ctx.set({ heardDeadlines: [] });
      afterPicked(ctx);
      return;
    case 'deadline_answered': {
      deadlineAnswered(ctx, event.text);
      const itemId = event.choice === 'today' ? await deadlineItem(ctx, event.text) : null;
      if (itemId !== null && (await swapItemIn(ctx, itemId))) {
        ctx.set({ pick: { kind: 'offered', reveal: null, another: false }, line: null });
      }
      return;
    }
    case 'drawer_item_swapped_in':
      if (await swapItemIn(ctx, event.itemId)) {
        await resolveTranscript(ctx);
        ctx.set({ heardDeadlines: [], line: null });
        afterPicked(ctx);
      }
      return;
    case 'pick_for_me':
      pickForMe(ctx);
      return;
    case 'excuse_given':
      counterOffer(ctx, event.text);
      return;
    case 'smaller_asked':
      askSmaller(ctx);
      return;
    case 'deal_struck':
      await resolveTranscript(ctx);
      setBargainedSession(ctx, null, event.treat ?? null);
      return;
    case 'too_big':
      await tooBig(ctx);
      return;
    case 'monster_met':
      ctx.set({ pick: { kind: 'none' } });
      return;
    case 'carried_task_set_aside':
      await setTaskAside(ctx);
      return;
  }
}
