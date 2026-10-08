import { huntingBeatResponseSchema, huntingCountResponseSchema } from '@scootch/domain';

import type { HttpClient } from './http-client';

/** A beat and a count are company, never work: neither may hold anything up for long. */
const TIMEOUT_MS = 5000;

/** The two routes of "others hunting". */
export interface HuntingApi {
  /** Says this device's session began (`true`) or ended (`false`). It carries nothing else. */
  beat(hunting: boolean): Promise<void>;
  /** How many devices are in a session now, this one included. Exact; the phone rounds it. */
  count(): Promise<number>;
}

export function createHuntingApi(http: HttpClient): HuntingApi {
  return {
    beat: async (hunting) => {
      await http.post(
        '/v1/hunting/beat',
        { hunting },
        (json) => huntingBeatResponseSchema.parse(json),
        { timeoutMs: TIMEOUT_MS },
      );
    },
    count: () =>
      http.request(
        'GET',
        '/v1/hunting/count',
        null,
        (json) => huntingCountResponseSchema.parse(json).count,
        { timeoutMs: TIMEOUT_MS },
      ),
  };
}
