import {
  screenInputResponseSchema,
  taskCreateResponseSchema,
  type ScreenInputRequest,
  type ScreenInputResponse,
  type TaskCreateRequest,
  type TaskCreateResponse,
} from '@scootch/domain';

import type { HttpClient } from './http-client';

/** The task call writes every line of a session and checks each one, so it may take a while. */
export const TASK_CREATE_TIMEOUT_MS = 25_000;
/** The care screen answers in well under a second; past this it counts as not screened. */
export const SCREEN_INPUT_TIMEOUT_MS = 4_000;

/** The API routes the app calls, typed by their contracts. */
export interface ScootchApi {
  /** The care screen for one piece of text: pass, serious, crisis or reject. */
  screenInput(request: ScreenInputRequest): Promise<ScreenInputResponse>;
  taskCreate(request: TaskCreateRequest): Promise<TaskCreateResponse>;
}

export function createScootchApi(http: HttpClient): ScootchApi {
  return {
    screenInput: (request) =>
      http.post('/v1/screen-input', request, (json) => screenInputResponseSchema.parse(json), {
        timeoutMs: SCREEN_INPUT_TIMEOUT_MS,
      }),
    taskCreate: (request) =>
      http.post('/v1/task-create', request, (json) => taskCreateResponseSchema.parse(json), {
        timeoutMs: TASK_CREATE_TIMEOUT_MS,
      }),
  };
}
