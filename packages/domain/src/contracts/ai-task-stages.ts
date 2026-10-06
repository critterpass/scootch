import { z } from 'zod';

import {
  dayNotificationSchema,
  heardDeadlineSchema,
  monsterCopySchema,
  oneThingSchema,
  parkedItemSchema,
  sessionLinePackSchema,
  taskCreateCrisisSchema,
  taskCreateRejectSchema,
  taskCreateRequestSchema,
  taskCreateSeriousSchema,
  taskLabelsSchema,
} from './ai-task-call';
import { energySchema } from './common';

/**
 * The task call in two stages, for the moment after the user stops talking. Stage one answers
 * fast with what the screen shows first; stage two brings the monster's words. Both are served
 * beside the single call, which stays as it is.
 *
 * Stage one is `POST /v1/task-create` with `staged: true`.
 */
export const taskCreateStartRequestSchema = taskCreateRequestSchema.extend({
  staged: z.literal(true),
});
export type TaskCreateStartRequest = z.infer<typeof taskCreateStartRequestSchema>;

/**
 * What stage two is asked with. The token is opaque to the phone, belongs to the device that got
 * it and stops working at `expiresAt`. It holds the one thing, never the text it came from.
 */
export const taskContinuationSchema = z.object({
  token: z.string().min(1).max(2048),
  expiresAt: z.iso.datetime(),
});
export type TaskContinuation = z.infer<typeof taskContinuationSchema>;

/** A pass, before anything funny is written: the task, the rest, and what picks the monster. */
export const taskCreateStartPassSchema = z.object({
  verdict: z.literal('pass'),
  seriousOverridden: z.boolean(),
  energy: energySchema,
  oneThing: oneThingSchema,
  parked: z.array(parkedItemSchema).max(30),
  /** Each line states the date plainly; it is not written by a model. */
  deadlines: z.array(heardDeadlineSchema).max(10),
  labels: taskLabelsSchema,
  continuation: taskContinuationSchema,
});
export type TaskCreateStartPass = z.infer<typeof taskCreateStartPassSchema>;

/** Serious, crisis and reject answer in full at stage one: they have no stage two. */
export const taskCreateStartResponseSchema = z.discriminatedUnion('verdict', [
  taskCreateStartPassSchema,
  taskCreateSeriousSchema,
  taskCreateCrisisSchema,
  taskCreateRejectSchema,
]);
export type TaskCreateStartResponse = z.infer<typeof taskCreateStartResponseSchema>;

/** Stage two, `POST /v1/task-create/lines`: the continuation and nothing else. */
export const taskCreateLinesRequestSchema = z.object({
  continuation: taskContinuationSchema.shape.token,
});
export type TaskCreateLinesRequest = z.infer<typeof taskCreateLinesRequestSchema>;

/** The monster's words, the session's lines and the day's notifications for the one thing. */
export const taskCreateLinesResponseSchema = z.object({
  monster: monsterCopySchema,
  lines: sessionLinePackSchema,
  /** Soft: at most one. Cheeky and Unhinged: at most three. */
  notifications: z.array(dayNotificationSchema).max(3),
});
export type TaskCreateLinesResponse = z.infer<typeof taskCreateLinesResponseSchema>;
