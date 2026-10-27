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
