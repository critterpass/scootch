import type { ScootchApi } from './scootch-api';
import type { TaskCall, TaskClient, TaskFirstStage, TaskRest } from './task-client';

/**
 * The task call in two requests. Stage one answers with the verdict, the one thing and the parked
 * rest, which is all the screen needs to start; stage two brings the monster's words and the
 * session's lines while the reveal and the hatch play. Whatever parts of stage two the server
 * sends are taken as they are, and a missing part is `null` for the store to fill in.
 */
export function createStagedTaskClient(
  api: Pick<ScootchApi, 'taskCreateStart' | 'taskCreateLines'>,
): TaskClient {
  return {
    async createTask(input): Promise<TaskCall> {
      const start = await api.taskCreateStart(input);
      if (start.verdict === 'crisis' || start.verdict === 'reject') {
        return { first: { verdict: start.verdict }, rest: Promise.resolve(null) };
      }
      const shared = {
        energy: start.energy,
        oneThing: start.oneThing,
        parked: start.parked,
        deadlines: start.deadlines,
      };
      if (start.verdict === 'serious') {
        // A serious task answers in full at stage one: it has no monster and no second stage.
        const first: TaskFirstStage = { verdict: 'serious', seriousOverridden: false, ...shared };
        return { first, rest: Promise.resolve({ verdict: 'serious', lines: start.lines }) };
      }
      const { labels } = start;
      const first: TaskFirstStage = {
        verdict: 'pass',
        seriousOverridden: start.seriousOverridden,
        labels,
        ...shared,
      };
      const rest = api.taskCreateLines(start.continuation.token).then((answer): TaskRest => ({
        verdict: 'pass',
        labels,
        monster: answer.monster ?? null,
        lines: answer.lines ?? null,
        notifications: answer.notifications ?? [],
      }));
      // The store reads the failure when it is ready to; until then it must not be unhandled.
      rest.catch(() => undefined);
      return { first, rest };
    },
  };
}
