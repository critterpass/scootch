import type { TaskLabels } from '@scootch/domain';

import type { ScootchApi } from './scootch-api';
import {
  trustedJudge,
  type TaskCall,
  type TaskCallOptions,
  type TaskClient,
  type TaskFirstStage,
  type TaskName,
  type TaskRest,
} from './task-client';

type StagedApi = Pick<
  ScootchApi,
  'taskCreateStart' | 'taskCreateLines' | 'taskCreateName' | 'taskCreatePack'
>;

/**
 * Stage two, name first: the monster's words and the hatch line, then every other line while the
 * hatch plays. A server without the name route answers stage two in one piece, as before; a pack
 * that never comes leaves the name standing and the offline lines speaking.
 */
function nameFirst(
  api: StagedApi,
  token: string,
  labels: TaskLabels,
  options: TaskCallOptions,
): Pick<TaskCall, 'name' | 'rest'> {
  const named = api.taskCreateName(token).catch(() => null);
  const name = named.then((answer): TaskName | null =>
    answer === null ? null : { monster: answer.monster, hatch: answer.hatch },
  );
  const rest = named.then(async (answer): Promise<TaskRest> => {
    if (answer === null) {
      const whole = await api.taskCreateLines(token);
      return {
        verdict: 'pass',
        labels,
        monster: whole.monster ?? null,
        lines: whole.lines ?? null,
        notifications: whole.notifications ?? [],
      };
    }
    const pack = await api
      .taskCreatePack(answer.continuation.token, options.treat?.() ?? null)
      .catch(() => null);
    return {
      verdict: 'pass',
      labels,
      monster: answer.monster,
      lines: pack === null ? null : { ...pack.lines, hatch: answer.hatch },
      notifications: pack?.notifications ?? [],
    };
  });
  // The store reads the failure when it is ready to; until then it must not be unhandled.
  rest.catch(() => undefined);
  return { name, rest };
}

/**
 * The task call in stages. Stage one answers with the verdict, the one thing and the parked rest,
 * which is all the screen needs to start; then the monster's name, so the hatch can show; then the
 * session's lines. Whatever parts the server sends are taken as they are, and a missing part is
 * `null` for the store to fill in.
 */
export function createStagedTaskClient(api: StagedApi): TaskClient {
  return {
    async createTask(input, options = {}): Promise<TaskCall> {
      const start = await api.taskCreateStart(input);
      if (start.verdict === 'crisis' || start.verdict === 'reject' || start.verdict === 'choose') {
        return { first: { verdict: start.verdict }, rest: Promise.resolve(null) };
      }
      const shared = {
        energy: start.energy,
        oneThing: start.oneThing,
        parked: start.parked,
        deadlines: start.deadlines,
        ...(start.heardTime === undefined ? {} : { heardTime: start.heardTime }),
        ...trustedJudge(start.answeredBy),
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
      // A pass the trusted judge did not give asks for nothing funny: the task is screened again.
      if (first.trusted === false) return { first, rest: Promise.resolve(null) };
      return { first, ...nameFirst(api, start.continuation.token, labels, options) };
    },
  };
}
