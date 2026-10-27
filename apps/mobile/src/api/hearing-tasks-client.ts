import { hearingTasksResponseSchema } from '@phusclass/domain';
import { ONLINE_WAIT_MS, type OnlineSplit } from '@phusclass/domain/hearing';

import type { HttpClient } from './http-client';

/**
 * The server's hearing of one utterance as tasks, with their chalk names. No connection, or no
 * answer in time, is `null`: the phone's rules hear it instead. Nothing is asked without a
 * connection.
 */
export function hearingTasksSplit(http: HttpClient, online: () => Promise<boolean>): OnlineSplit {
  return async (text) => {
    if (!(await online())) return null;
    const answer = await http.post(
      '/v1/hearing/tasks',
      { text },
      (json) => hearingTasksResponseSchema.parse(json),
      { timeoutMs: ONLINE_WAIT_MS },
    );
    return answer.tasks;
  };
}
