import {
  instantFromIso,
  isoFromInstant,
  sessionEarnings,
  type SessionTone,
  type Sitting,
  type TaskRow,
} from '@scootch/domain';

import type { DayContext } from './day-types';
import { showsComedy } from './shows-comedy';

/** A number from 0 up to 1 that depends on every character of `text` and on nothing else. */
function fractionOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0) / 2 ** 32;
}

/**
 * Writes what a finished session earned, as the rewards rules name it: the caught monster's card
 * numbers, one permanent piece of the world, and the day's bar of the record when the day has
 * none yet, and the surprise drop when the rules gave one. A serious task leaves a plain piece and
 * its bar and no card. The treat is handed over by the screen, so it is not written here.
 *
 * A task finished before the server answered for it has no monster: its piece is a plain one.
 */
export async function persistFinishEarnings(
  ctx: DayContext,
  task: TaskRow,
  tone: SessionTone,
  treat: string | null,
): Promise<void> {
  const { repositories, nextId } = ctx.deps;
  const caughtOn = ctx.memory.state.localDate;
  const sittings: Sitting[] = (await repositories.sessions.where('taskId', task.id)).flatMap(
    (row) =>
      row.endedAt === null
        ? []
        : [{ startedAt: instantFromIso(row.startedAt), endedAt: instantFromIso(row.endedAt) }],
  );
  const monster = (await repositories.monsters.where('taskId', task.id))[0] ?? null;
  const caughtBefore = (await repositories.monsters.all()).filter(
    (one) => one.number !== null,
  ).length;

  const earned = sessionEarnings({
    ending: 'finished',
    tone,
    history: {
      firstMentionedOn: task.firstMentionedOn,
      caughtOn,
      // The row remembers that it was carried over, not how many times.
      carriedOverCount: task.carriedOver ? 1 : 0,
      shrinkCount: task.shrinkCount,
      sittings,
    },
    treat,
    dayHasBar: (await repositories.recordBars.get(caughtOn)) !== null,
    drop: { seed: task.id, catchNumber: caughtBefore + 1 },
  });

  const seed = monster?.spec.seed ?? task.id;
  await repositories.transaction(async () => {
    for (const earning of earned) {
      if (earning.kind === 'card') {
        if (!monster || monster.number !== null || !showsComedy(task, 'card')) continue;
        await repositories.monsters.put({
          ...monster,
          caughtAt: isoFromInstant(ctx.now()),
          caughtOn,
          number: earning.number,
          rarity: earning.stats.rarity,
          daysLurked: earning.stats.daysLurked,
          catchMinutes: earning.stats.catchMinutes,
          dread: earning.stats.dread,
        });
      } else if (earning.kind === 'world_piece') {
        const home = earning.piece === 'monster' && monster !== null;
        await repositories.worldPieces.put({
          id: nextId(),
          kind: home ? 'monster' : 'plain',
          monsterId: home ? monster.id : null,
          x: fractionOf(`${seed}/x`),
          y: fractionOf(`${seed}/y`),
          seed,
          addedOn: caughtOn,
        });
      } else if (earning.kind === 'record_bar') {
        await repositories.recordBars.put({
          ...earning.bar,
          seed: monster?.spec.seed ?? caughtOn,
          monsterId: monster?.id ?? null,
        });
      } else if (earning.kind === 'surprise_drop') {
        await repositories.surpriseDrops.put({
          id: nextId(),
          taskId: task.id,
          catchNumber: caughtBefore + 1,
          pick: earning.drop.pick,
          droppedOn: caughtOn,
          choice: null,
        });
      }
    }
  });
}
