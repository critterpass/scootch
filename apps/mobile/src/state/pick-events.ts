import type { DayContext, PickEvent } from './day-types';
import {
  deadlineAnswered,
  deadlineItem,
  pickForMe,
  setTaskAside,
  swapItemIn,
  tooBig,
} from './pick-flow';
import { heardTimeAnswered } from './heard-time';
import { afterPicked, dropTaskCall, resolveTranscript } from './task-flow';

/**
 * The events between a sent ramble and a set task: the pick, a heard date, the drawer's swap
 * and the hatch.
 */
export async function applyPickEvent(ctx: DayContext, event: PickEvent): Promise<void> {
  switch (event.type) {
    case 'one_thing_picked':
      await resolveTranscript(ctx);
      ctx.set({ heardDeadlines: [], heardTimeAsked: false });
      afterPicked(ctx);
      return;
    case 'heard_time_answered':
      return heardTimeAnswered(ctx, event.watched);
    case 'deadline_answered': {
      deadlineAnswered(ctx, event.text);
      const itemId = event.choice === 'today' ? await deadlineItem(ctx, event.text) : null;
      if (itemId !== null && (await swapItemIn(ctx, itemId))) {
        ctx.set({ pick: { kind: 'offered', reveal: null }, line: null });
      }
      return;
    }
    case 'drawer_item_swapped_in':
      // Taking something from the drawer while Scootch is thinking is moving on from what was sent.
      dropTaskCall(ctx);
      if (await swapItemIn(ctx, event.itemId)) {
        await resolveTranscript(ctx);
        ctx.set({ heardDeadlines: [], line: null });
        afterPicked(ctx);
      }
      return;
    case 'pick_for_me':
      pickForMe(ctx);
      return;
    case 'pick_dropped':
      if (ctx.memory.state.pick.kind !== 'picked_for_me') return;
      ctx.memory.turnedDown = [];
      ctx.set({ pick: { kind: 'none' } });
      return;
    case 'too_big':
      await tooBig(ctx);
      return;
    case 'monster_met':
      ctx.set({ pick: { kind: 'none' } });
      return;
    case 'task_set_aside':
      await setTaskAside(ctx);
      return;
  }
}
