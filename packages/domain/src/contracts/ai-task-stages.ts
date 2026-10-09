import { z } from 'zod';

import {
  dayNotificationSchema,
  heardDeadlineSchema,
  taskHelperFieldsSchema,
  monsterCopySchema,
  oneThingSchema,
  parkedItemSchema,
  sessionLinePackSchema,
  taskCreateChooseSchema,
  taskCreateCrisisSchema,
  taskCreateRejectSchema,
  taskCreateRequestSchema,
  taskCreateSeriousSchema,
  taskJudgeSchema,
  taskLabelsSchema,
} from './ai-task-call';
import { energySchema, lineSchema } from './common';

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
export const taskCreateStartPassSchema = taskJudgeSchema.extend({
  verdict: z.literal('pass'),
  seriousOverridden: z.boolean(),
  energy: energySchema,
  oneThing: oneThingSchema,
  parked: z.array(parkedItemSchema).max(30),
  /** Each line states the date plainly; it is not written by a model. */
  deadlines: z.array(heardDeadlineSchema).max(10),
  labels: taskLabelsSchema,
  continuation: taskContinuationSchema,
  /** A clock time heard for today; see `taskHelperFieldsSchema`. */
  heardTime: taskHelperFieldsSchema.shape.heardTime,
});
export type TaskCreateStartPass = z.infer<typeof taskCreateStartPassSchema>;

/** Serious, crisis, reject and choose answer in full at stage one: they have no stage two. */
export const taskCreateStartResponseSchema = z.discriminatedUnion('verdict', [
  taskCreateStartPassSchema,
  taskCreateSeriousSchema,
  taskCreateCrisisSchema,
  taskCreateRejectSchema,
  taskCreateChooseSchema,
]);
export type TaskCreateStartResponse = z.infer<typeof taskCreateStartResponseSchema>;

/**
 * Stage two, `POST /v1/task-create/lines`: the continuation and nothing else. What stage one was
 * told is in the way rides in the continuation, so no later stage is sent it.
 */
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
  cueNotification: taskHelperFieldsSchema.shape.cueNotification,
});
export type TaskCreateLinesResponse = z.infer<typeof taskCreateLinesResponseSchema>;

/**
 * Stage two can also be asked for in two parts, so the monster can hatch before the whole pack
 * is written. `POST /v1/task-create/name` takes stage one's continuation and answers first with
 * the monster and the hatch line, plus a continuation of its own; `POST /v1/task-create/pack`
 * takes that one, while the hatch plays, and answers with every other line.
 */
export const taskCreateNameRequestSchema = taskCreateLinesRequestSchema;
export type TaskCreateNameRequest = z.infer<typeof taskCreateNameRequestSchema>;

export const taskCreateNameResponseSchema = z.object({
  monster: monsterCopySchema,
  /** Said when the monster appears. */
  hatch: lineSchema,
  /** What the pack is asked with. It carries the monster's name, so the pack is about it. */
  continuation: taskContinuationSchema,
});
export type TaskCreateNameResponse = z.infer<typeof taskCreateNameResponseSchema>;

export const taskCreatePackRequestSchema = z.object({
  continuation: taskContinuationSchema.shape.token,
  /** The treat named for after the session, when it is known already. */
  treat: z.string().trim().min(1).max(40).optional(),
});
export type TaskCreatePackRequest = z.infer<typeof taskCreatePackRequestSchema>;

/** Every session line but the hatch, which the name answer already brought. */
export const taskCreatePackResponseSchema = z.object({
  lines: sessionLinePackSchema.omit({ hatch: true }),
  /** Soft: at most one. Cheeky and Unhinged: at most three. */
  notifications: z.array(dayNotificationSchema).max(3),
  cueNotification: taskHelperFieldsSchema.shape.cueNotification,
});
export type TaskCreatePackResponse = z.infer<typeof taskCreatePackResponseSchema>;
