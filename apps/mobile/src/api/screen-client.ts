import {
  screenInputResponseSchema,
  type ScreenInputRequest,
  type ScreenInputResponse,
} from '@phusclass/domain';

import type { HttpClient } from './http-client';

/** The care screen answers in well under a second; past this it counts as not screened. */
export const SCREEN_INPUT_TIMEOUT_MS = 4_000;

/** The server's care screen for one piece of text: pass, serious, crisis or reject. */
export interface ScreenClient {
  screenInput(request: ScreenInputRequest): Promise<ScreenInputResponse>;
}

export function createScreenClient(http: HttpClient): ScreenClient {
  return {
    screenInput: (request) =>
      http.post('/v1/screen-input', request, (json) => screenInputResponseSchema.parse(json), {
        timeoutMs: SCREEN_INPUT_TIMEOUT_MS,
      }),
  };
}
