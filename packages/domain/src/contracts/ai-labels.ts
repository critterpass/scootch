import { z } from 'zod';

import { monsterBodyTypeSchema, workModeSchema } from './art';
import { energySchema, languageSchema, screenVerdictSchema } from './common';

/**
 * How a typed decision was reached. Low confidence is a normal outcome, not an
 * error: the server has already resolved it to the quieter answer, and the
 * flag lets the phone know the answer is a cautious one.
 */
export const decisionMetaSchema = z.object({
  /** The winning label's probability, 0 to 1. 0 when nothing answered. */
  confidence: z.number().min(0).max(1),
  lowConfidence: z.boolean(),
  /**
   * `jev` is the decision model, `fallback` the small generation model, and
   * `default` means neither answered in time and the quiet default was used.
   */
  answeredBy: z.enum(['jev', 'fallback', 'default']),
});
export type DecisionMeta = z.infer<typeof decisionMetaSchema>;

/** Text to judge. Only the text the question needs is sent. */
const labelRequestSchema = z.object({
  language: languageSchema,
  text: z.string().min(1).max(2000),
});

// screen.input: pass, serious, crisis or reject for anything the user wrote.

export const screenInputRequestSchema = z.object({
  language: languageSchema,
  text: z.string().min(1).max(4000),
  source: z.enum(['ramble', 'typed', 'web_maker']),
});
export type ScreenInputRequest = z.infer<typeof screenInputRequestSchema>;

/**
 * A timeout or an error never reaches the phone as `pass`: it arrives as
 * `serious` with `answeredBy: 'default'`. Nor does a `pass` only the fallback
 * model gave: it arrives as `serious` with `answeredBy: 'fallback'`. Both carry
 * `reason: 'unscreened'`: nobody trusted has judged the text, so the phone
 * treats it as it does offline (plain company, no joke) and asks again later.
 * Any answer not from `jev` may be asked again once Jev is back.
 */
export const screenInputResponseSchema = decisionMetaSchema.extend({
  verdict: screenVerdictSchema,
  reason: z.enum(['unscreened']).optional(),
});
export type ScreenInputResponse = z.infer<typeof screenInputResponseSchema>;

// task.work_mode: which of the 30 work modes fits the task.

export const taskWorkModeRequestSchema = labelRequestSchema;
export type TaskWorkModeRequest = z.infer<typeof taskWorkModeRequestSchema>;

export const taskWorkModeResponseSchema = decisionMetaSchema.extend({
  /** `null` when nothing fits well enough; the plain working loop is drawn. */
  workMode: workModeSchema.nullable(),
});
export type TaskWorkModeResponse = z.infer<typeof taskWorkModeResponseSchema>;

// task.body_type: which of the 20 monster bodies fits the task.

export const taskBodyTypeRequestSchema = labelRequestSchema;
export type TaskBodyTypeRequest = z.infer<typeof taskBodyTypeRequestSchema>;

export const taskBodyTypeResponseSchema = decisionMetaSchema.extend({
  /** `null` when nothing fits well enough; the phone picks a body from the seed. */
  bodyType: monsterBodyTypeSchema.nullable(),
});
export type TaskBodyTypeResponse = z.infer<typeof taskBodyTypeResponseSchema>;

// task.size: does the task fit ten minutes, or should Scootch offer to shrink it.

export const taskSizeRequestSchema = labelRequestSchema;
export type TaskSizeRequest = z.infer<typeof taskSizeRequestSchema>;

export const taskSizeResponseSchema = decisionMetaSchema.extend({
  fitsTenMinutes: z.boolean(),
});
export type TaskSizeResponse = z.infer<typeof taskSizeResponseSchema>;

// ramble.energy: low, medium or fine, when the user picks "guess".

export const rambleEnergyRequestSchema = labelRequestSchema;
export type RambleEnergyRequest = z.infer<typeof rambleEnergyRequestSchema>;

/** Low confidence resolves to `low`, the answer that asks least of the user. */
export const rambleEnergyResponseSchema = decisionMetaSchema.extend({
  energy: energySchema,
});
export type RambleEnergyResponse = z.infer<typeof rambleEnergyResponseSchema>;

// share.private: should Scootch avoid offering to share this task.

export const sharePrivateRequestSchema = labelRequestSchema;
export type SharePrivateRequest = z.infer<typeof sharePrivateRequestSchema>;

/** Low confidence resolves to `true`: no share is offered. */
export const sharePrivateResponseSchema = decisionMetaSchema.extend({
  private: z.boolean(),
});
export type SharePrivateResponse = z.infer<typeof sharePrivateResponseSchema>;

// table.name: is a display name acceptable at a table.

export const tableNameRequestSchema = z.object({
  language: languageSchema,
  name: z.string().min(1).max(40),
});
export type TableNameRequest = z.infer<typeof tableNameRequestSchema>;

/** Low confidence resolves to `false`: the user is asked for another name. */
export const tableNameResponseSchema = decisionMetaSchema.extend({
  acceptable: z.boolean(),
});
export type TableNameResponse = z.infer<typeof tableNameResponseSchema>;
