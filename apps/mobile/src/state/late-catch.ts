import {
  cardStats,
  instantFromIso,
  isoFromInstant,
  type Sitting,
  type TaskRow,
} from '@scootch/domain';

import { enterCrisis } from './care-flow';
import type { DayContext, DayMemory } from './day-types';
import { showsComedy } from './shows-comedy';
import { wordsToAsk } from './late-words';
import { applyCall, treatNamed } from './task-answers';

/** Every sitting a task took that has ended. */
export async function sittingsOf(ctx: Pick<DayContext, 'deps'>, task: TaskRow): Promise<Sitting[]> {
  return (await ctx.deps.repositories.sessions.where('taskId', task.id)).flatMap((row) =>
    row.endedAt === null
      ? []
      : [{ startedAt: instantFromIso(row.startedAt), endedAt: instantFromIso(row.endedAt) }],
  );
}

/**
 * A monster that arrived for a task already finished: the finish could only put down a plain
 * piece and no card. The monster is caught as of that finish, with the card numbers the finish
 * would have printed, and the plain piece becomes its piece, where it already stands. Nothing is
 * shown or played for it: it is simply in the world and the zoo from now on.
 */
export async function catchLateMonster(ctx: DayContext, task: TaskRow): Promise<void> {
  const { repositories } = ctx.deps;
  if (task.status !== 'finished' || !showsComedy(task, 'card')) return;
  const monster = (await repositories.monsters.where('taskId', task.id))[0] ?? null;
  if (!monster || monster.number !== null) return;
  const caughtOn = task.localDate;
  const stats = cardStats({
    firstMentionedOn: task.firstMentionedOn,
    caughtOn,
    carriedOverCount: task.carriedOver ? 1 : 0,
    shrinkCount: task.shrinkCount,
    sittings: await sittingsOf(ctx, task),
  });
  const caughtBefore = (await repositories.monsters.all()).filter((one) => one.number !== null);
  await repositories.transaction(async () => {
    await repositories.monsters.put({
      ...monster,
      caughtAt: task.finishedAt ?? isoFromInstant(ctx.now()),
      caughtOn,
      number: caughtBefore.length + 1,
      rarity: stats.rarity,
      daysLurked: stats.daysLurked,
      catchMinutes: stats.catchMinutes,
      dread: stats.dread,
    });
    // The finish seeded its plain piece with the task's own id.
    const piece = (await repositories.worldPieces.all()).find(
      (one) => one.kind === 'plain' && one.seed === task.id,
    );
    if (piece)
      await repositories.worldPieces.put({ ...piece, kind: 'monster', monsterId: monster.id });
    const bar = await repositories.recordBars.get(caughtOn);
    if (bar && bar.monsterId === null)
      await repositories.recordBars.put({ ...bar, monsterId: monster.id });
  });
}

const askedFor = new WeakMap<DayMemory, Set<string>>();

/**
 * A finished task nobody has screened is asked about once each time the app runs, when there is
 * a connection: Scootch said its monster would come. True when one is being asked about now.
 */
export async function askForFinished(ctx: DayContext): Promise<boolean> {
  const { repositories } = ctx.deps;
  const { settings, localDate } = ctx.memory.state;
  const asked = askedFor.get(ctx.memory) ?? new Set<string>();
  askedFor.set(ctx.memory, asked);
  const task = (await repositories.tasks.all())
    .filter((one) => one.status === 'finished' && one.screen === 'unscreened' && !asked.has(one.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!task || !(await ctx.deps.online().catch(() => false))) return false;
  asked.add(task.id);
  ctx.memory.askingPending = true;
  const call = ctx.deps.tasks
    .createTask(
      {
        language: settings.language,
        attitude: settings.attitude,
        energy: 'guess',
        text: await wordsToAsk(ctx, task),
        source: task.source === 'ramble' || task.source === 'drawer' ? task.source : 'typed',
        localDate,
        timeZone: ctx.deps.timeZone(),
        overrideSerious: false,
      },
      treatNamed(ctx),
    )
    .catch(() => null);
  ctx.later(call, async (answer) => {
    ctx.memory.askingPending = false;
    const finished = await repositories.tasks.get(task.id);
    if (answer === null || !finished || finished.status !== 'finished') return;
    const { verdict } = answer.first;
    if (verdict === 'crisis' || verdict === 'reject') {
      // Words from an earlier day change nothing now. Today's are treated as they would have
      // been before the finish: a crisis hides the day, and its words are kept nowhere.
      if (verdict === 'crisis' && finished.localDate === ctx.memory.state.localDate) {
        await repositories.unsortedWords.remove(finished.id);
        await repositories.forgetTask(finished.id);
        await enterCrisis(ctx);
        await ctx.refresh();
      }
      return;
    }
    await applyCall(ctx, answer, finished);
    await ctx.refresh();
  });
  return true;
}
