import type { z } from 'zod';

import { screenInputRequestSchema, screenInputResponseSchema } from './ai-labels';

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
