import {
  screenInputResponseSchema,
  taskCreateLinesResponseSchema,
  taskCreateResponseSchema,
  taskCreateStartResponseSchema,
  type ScreenInputRequest,
  type ScreenInputResponse,
  type TaskCreateLinesResponse,
  type TaskCreateRequest,
  type TaskCreateResponse,
  type TaskCreateStartResponse,
} from '@scootch/domain';

import type { HttpClient } from './http-client';

/** The task call writes every line of a session and checks each one, so it may take a while. */
export const TASK_CREATE_TIMEOUT_MS = 25_000;
/** The care screen answers in well under a second; past this it counts as not screened. */
/** Stage one writes nothing funny, so the screen has its one thing within a few seconds. */
export const TASK_START_TIMEOUT_MS = 12_000;
export const SCREEN_INPUT_TIMEOUT_MS = 4_000;

/** The API routes the app calls, typed by their contracts. */
export interface ScootchApi {
  /** The care screen for one piece of text: pass, serious, crisis or reject. */
  screenInput(request: ScreenInputRequest): Promise<ScreenInputResponse>;
  taskCreate(request: TaskCreateRequest): Promise<TaskCreateResponse>;
  /** Stage one of the task call: the verdict, the one thing, the rest, and a continuation. */
  taskCreateStart(request: TaskCreateRequest): Promise<TaskCreateStartResponse>;
  /** Stage two: whatever of the monster's words and the session's lines the server has. */
  taskCreateLines(continuation: string): Promise<TaskLinesAnswer>;
}

/**
 * Stage two as the phone reads it. The server may send the name ahead of the line pack, so every
 * part is optional here and the task client takes what is present.
 */
const taskLinesAnswerSchema = taskCreateLinesResponseSchema.partial();
export type TaskLinesAnswer = Partial<TaskCreateLinesResponse>;

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
    taskCreateStart: (request) =>
      http.post(
        '/v1/task-create',
        { ...request, staged: true },
        (json) => taskCreateStartResponseSchema.parse(json),
        { timeoutMs: TASK_START_TIMEOUT_MS },
      ),
    taskCreateLines: (continuation) =>
      http.post(
        '/v1/task-create/lines',
        { continuation },
        (json) => {
          const { monster, lines, notifications } = taskLinesAnswerSchema.parse(json);
          return {
            ...(monster ? { monster } : {}),
            ...(lines ? { lines } : {}),
            ...(notifications ? { notifications } : {}),
          };
        },
        { timeoutMs: TASK_CREATE_TIMEOUT_MS },
      ),
  };
}
