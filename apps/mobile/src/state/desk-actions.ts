import {
  carveInto,
  finishTask,
  lateSlip,
  openDesk as reopen,
  partialCredit,
  periodBeforeHeardTime,
  periodMinutes,
  startPeriod,
  swapOntoDesk,
  type PartialChoice,
} from '@phusclass/domain/board';

import { addCarving } from '../data/carvings-repository';
import { startSession } from '../data/sessions-repository';

import { KEYS, type BoardCore } from './board-core';
import { deskHappening, type OpenSession } from './board-view';

/** What happens at the desk: his pick, a swap, the drum, the finish, partial credit, a slip. */
export function deskActions(core: BoardCore) {
  const { deps } = core;

  async function recordStart(session: OpenSession, insideFuse: boolean): Promise<void> {
    await startSession(deps.db, {
      id: session.id,
      task_id: session.taskId,
      started_at: session.startedAt,
      minutes: session.minutes,
      inside_fuse: insideFuse ? 1 : 0,
      happening: session.happening,
    });
  }

  return {
    /** His pick for an empty desk, with the reason for his line. */
    pick: () => core.act(() => core.refill()),

    /** Any open task onto the desk; what was there goes back on the board. */
    swap: (id: string) =>
      core.act(async () => {
        const before = core.state.tasks;
        const after = swapOntoDesk(before, id, deps.clock().at);
        const changed = after.filter((one, index) => one !== before[index]);
        if (changed.length === 0) return;
        core.state = { ...core.state, deskReason: 'swapped' };
        await core.save(changed);
      }),

    /** The desk is in front of the user again: the fuse burns from now. */
    openDesk: () =>
      core.act(async () => {
        const desk = core.desk();
        if (desk !== undefined) await core.save([reopen(desk, deps.clock().at)]);
      }),

    /**
     * The drum. `chosen` is the length picked on the desk; otherwise the length set in settings,
     * fifteen on a pop quiz, and always ending in time to get ready for a time heard today. In
     * plain company after a crisis nothing happens in the period.
     */
    start: (chosen?: number, options: { readonly plain?: boolean } = {}) =>
      core.act(async () => {
        const now = deps.clock();
        const desk = core.desk();
        if (desk === undefined || core.state.session !== null) return null;
        const happening = options.plain === true ? null : deskHappening(desk);
        const asked = periodMinutes({
          chosen: chosen ?? (happening === 'pop quiz' ? null : core.state.periodLength),
          happening,
        });
        const minutes = periodBeforeHeardTime(asked, desk, now) ?? asked;
        const started = startPeriod(desk, now.at);
        const session = {
          id: deps.newId(),
          taskId: desk.id,
          startedAt: now.at,
          minutes,
          happening,
        };
        await core.save([started]);
        await recordStart(session, started.desk?.insideFuse === true);
        core.state = {
          ...core.state,
          session,
          lastFinish: null,
          lastSlip: null,
          recessOffered: false,
          recess: null,
        };
        return session;
      }),

    /** "Done." Graded (unless heavy), carved, logged, and recess is offered. */
    finish: () =>
      core.act(async () => {
        const session = core.state.session;
        const desk = session === null ? undefined : core.task(session.taskId);
        if (session === null || desk?.status !== 'desk') return null;
        const finished = finishTask(desk, deps.clock(), session.minutes);
        await core.save([finished.task]);
        await addCarving(deps.db, finished.carving);
        await core.endOpenSession('done');
        const finishes = core.state.finishes + 1;
        await core.writeKv(KEYS.finishes, String(finishes));
        const result = { ...finished, happening: session.happening };
        core.state = {
          ...core.state,
          carvings: [...carveInto(core.state.carvings, finished.carving)],
          finishes,
          lastFinish: result,
          recessOffered: true,
          deskReason: null,
        };
        return result;
      }),

    /** "Not yet": another period, back on the board with a line for next time, or erase. */
    partial: (choice: PartialChoice, note?: string) =>
      core.act(async () => {
        const at = deps.clock().at;
        const session = core.state.session;
        const desk = session === null ? undefined : core.task(session.taskId);
        if (session === null || desk === undefined) return;
        const changed = partialCredit(desk, choice, at, note);
        await core.endOpenSession(choice);
        await core.save([changed]);
        if (choice === 'another period') {
          const again = { ...session, id: deps.newId(), startedAt: at };
          await recordStart(again, changed.desk?.insideFuse === true);
          core.state = { ...core.state, session: again };
          return;
        }
        await core.refill(desk.id);
      }),

    /** A late slip on the desk's task, with its excuse; the caller says if it is accepted. */
    slip: (reason: string, accepted: boolean) =>
      core.act(async () => {
        const desk = core.desk();
        if (desk === undefined) return null;
        const { task, outcome } = lateSlip(desk, { reason, accepted }, deps.clock().at);
        await core.endOpenSession('slipped');
        await core.save([task]);
        core.state = { ...core.state, lastSlip: { taskId: desk.id, outcome } };
        await core.refill(desk.id);
        return outcome;
      }),
  };
}
