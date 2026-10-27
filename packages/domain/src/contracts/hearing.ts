import { z } from 'zod';

import { isoDateTimeSchema } from './common';

/**
 * `POST /v1/hearing/token`: a single-use key to the realtime transcriber, and where to spend it.
 * The phone opens `url` with every `params` entry and the token in the query, then streams the
 * microphone to it. The server chooses the model and the format, so they can change without an
 * app update. No language is named: the transcriber hears whichever one the user speaks.
 */
export const hearingTokenResponseSchema = z.object({
  token: z.string().min(1),
  /** After this the token opens nothing. A socket already open outlives it. */
  expiresAt: isoDateTimeSchema,
  url: z.string().startsWith('wss://'),
  params: z.record(z.string(), z.string()),
});
export type HearingTokenResponse = z.infer<typeof hearingTokenResponseSchema>;

/**
 * `POST /v1/hearing/tasks`: one utterance (a hold to talk, or what was typed) heard as tasks by the
 * server's model. Each task is in the speaker's own words, with fillers and false starts left out
 * and any day or time kept in, so the phone still reads the day; `short` is its chalk name. The
 * phone checks both against what was said, and hears with its own rules when there is no answer.
 */
export const hearingTasksRequestSchema = z.object({
  text: z.string().min(1).max(4000),
});
export type HearingTasksRequest = z.infer<typeof hearingTasksRequestSchema>;

export const hearingTasksResponseSchema = z.object({
  tasks: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        short: z.string().max(80).nullable(),
      }),
    )
    .max(20),
});
export type HearingTasksResponse = z.infer<typeof hearingTasksResponseSchema>;
