import type { z } from 'zod';

import {
  rambleEnergyRequestSchema,
  rambleEnergyResponseSchema,
  screenInputRequestSchema,
  screenInputResponseSchema,
  sharePrivateRequestSchema,
  sharePrivateResponseSchema,
  tableNameRequestSchema,
  tableNameResponseSchema,
  taskBodyTypeRequestSchema,
  taskBodyTypeResponseSchema,
  taskSizeRequestSchema,
  taskSizeResponseSchema,
  taskWorkModeRequestSchema,
  taskWorkModeResponseSchema,
} from './ai-labels';
import {
  dayMorningLineRequestSchema,
  dayMorningLineResponseSchema,
  sessionStuckRequestSchema,
  sessionStuckResponseSchema,
  taskBargainRequestSchema,
  taskBargainResponseSchema,
  taskPickRequestSchema,
  taskPickResponseSchema,
  taskShrinkRequestSchema,
  taskShrinkResponseSchema,
  weekRecordNameRequestSchema,
  weekRecordNameResponseSchema,
  weekSentenceRequestSchema,
  weekSentenceResponseSchema,
} from './ai-small-routes';
import { taskCreateRequestSchema, taskCreateResponseSchema } from './ai-task-call';
import {
  taskCreateLinesRequestSchema,
  taskCreateLinesResponseSchema,
  taskCreateNameRequestSchema,
  taskCreateNameResponseSchema,
  taskCreatePackRequestSchema,
  taskCreatePackResponseSchema,
  taskCreateStartRequestSchema,
  taskCreateStartResponseSchema,
} from './ai-task-stages';

export * from './ai-labels';
export * from './ai-small-routes';
export * from './ai-task-call';
export * from './ai-task-stages';

/**
 * Every AI route, keyed by its id. The id is also the route's file name in the
 * API, its eval set's name and the stem of its fixtures
 * (`<id>.<language>.json`). A failed call answers with `wireErrorSchema`.
 */
export const aiRoutes = {
  'screen.input': { request: screenInputRequestSchema, response: screenInputResponseSchema },
  'task.create': { request: taskCreateRequestSchema, response: taskCreateResponseSchema },
  // The same route as `task.create`, asked with `staged: true`.
  'task.create_start': {
    request: taskCreateStartRequestSchema,
    response: taskCreateStartResponseSchema,
  },
  'task.create_lines': {
    request: taskCreateLinesRequestSchema,
    response: taskCreateLinesResponseSchema,
  },
  // Stage two in two parts: the name and the hatch line first, then the rest of the pack.
  'task.create_name': {
    request: taskCreateNameRequestSchema,
    response: taskCreateNameResponseSchema,
  },
  'task.create_pack': {
    request: taskCreatePackRequestSchema,
    response: taskCreatePackResponseSchema,
  },
  'task.shrink': { request: taskShrinkRequestSchema, response: taskShrinkResponseSchema },
  'task.bargain': { request: taskBargainRequestSchema, response: taskBargainResponseSchema },
  'session.stuck': { request: sessionStuckRequestSchema, response: sessionStuckResponseSchema },
  'task.pick': { request: taskPickRequestSchema, response: taskPickResponseSchema },
  'day.morning_line': {
    request: dayMorningLineRequestSchema,
    response: dayMorningLineResponseSchema,
  },
  'week.sentence': { request: weekSentenceRequestSchema, response: weekSentenceResponseSchema },
  'week.record_name': {
    request: weekRecordNameRequestSchema,
    response: weekRecordNameResponseSchema,
  },
  'task.work_mode': { request: taskWorkModeRequestSchema, response: taskWorkModeResponseSchema },
  'task.body_type': { request: taskBodyTypeRequestSchema, response: taskBodyTypeResponseSchema },
  'task.size': { request: taskSizeRequestSchema, response: taskSizeResponseSchema },
  'ramble.energy': { request: rambleEnergyRequestSchema, response: rambleEnergyResponseSchema },
  'share.private': { request: sharePrivateRequestSchema, response: sharePrivateResponseSchema },
  'table.name': { request: tableNameRequestSchema, response: tableNameResponseSchema },
} as const;

export type AiRouteId = keyof typeof aiRoutes;
export type AiRequest<R extends AiRouteId> = z.infer<(typeof aiRoutes)[R]['request']>;
export type AiResponse<R extends AiRouteId> = z.infer<(typeof aiRoutes)[R]['response']>;

/**
 * The shape of a recorded fixture in `packages/voice/fixtures/`. `case` names
 * a second recording of the same route, such as `serious` or `crisis`.
 */
export type AiFixture<R extends AiRouteId = AiRouteId> = {
  route: R;
  case?: string;
  request: AiRequest<R>;
  response: AiResponse<R>;
};
