import { z } from 'zod';

import { workModeSchema } from './art';
import {
  attitudeSchema,
  energySchema,
  idSchema,
  isoDateSchema,
  isoWeekSchema,
  languageSchema,
  lineSchema,
  taskTextSchema,
} from './common';

/**
 * The task a short reply is about. It has already been screened: the phone
 * sends the stored flag, and `serious: true` gets plain words with no joke.
 */
export const taskContextSchema = z.object({
  text: taskTextSchema,
  serious: z.boolean(),
  /** `null` for a serious task, or before the monster has hatched. */
  monsterName: z.string().min(1).max(60).nullable(),
});
export type TaskContext = z.infer<typeof taskContextSchema>;

const spokenRequestSchema = z.object({
  language: languageSchema,
  attitude: attitudeSchema,
});

// task.shrink: "too big" makes the task, and the monster, smaller.

export const taskShrinkRequestSchema = spokenRequestSchema.extend({
  task: taskContextSchema,
  /** Earlier, larger versions of this task, oldest first. */
  previous: z.array(taskTextSchema).max(5),
});
export type TaskShrinkRequest = z.infer<typeof taskShrinkRequestSchema>;

export const taskShrinkResponseSchema = z.object({
  /** A smaller ask than `task.text`. The phone refuses one that is not. */
  task: taskTextSchema,
  line: lineSchema,
});
export type TaskShrinkResponse = z.infer<typeof taskShrinkResponseSchema>;

// task.bargain: an excuse only ever makes the ask smaller.

export const taskBargainRequestSchema = spokenRequestSchema.extend({
  task: taskContextSchema,
  /** What the user said, in their words. */
  excuse: z.string().min(1).max(500),
  /** The length currently on offer. */
  minutes: z.number().int().min(1).max(50),
});
export type TaskBargainRequest = z.infer<typeof taskBargainRequestSchema>;

export const taskBargainResponseSchema = z.object({
  counterOffer: z.object({
    task: taskTextSchema,
    /** Never more than the request's `minutes`; the phone clamps it. */
    minutes: z.number().int().min(1).max(50),
  }),
  line: lineSchema,
});
export type TaskBargainResponse = z.infer<typeof taskBargainResponseSchema>;

// session.stuck: the next tiny step, from "I'm stuck" or the timed check-in.

export const sessionStuckRequestSchema = spokenRequestSchema.extend({
  task: taskContextSchema,
  /** Steps already offered in this session, so "Smaller" gets a smaller one. */
  previousSteps: z.array(lineSchema).max(5),
});
export type SessionStuckRequest = z.infer<typeof sessionStuckRequestSchema>;

export const sessionStuckResponseSchema = z.object({ step: lineSchema });
export type SessionStuckResponse = z.infer<typeof sessionStuckResponseSchema>;

// task.pick: Scootch chooses when the user cannot. Candidates are screened drawer items.

export const taskPickRequestSchema = spokenRequestSchema.extend({
  energy: energySchema,
  localDate: isoDateSchema,
  candidates: z
    .array(z.object({ id: idSchema, text: taskTextSchema, dueDate: isoDateSchema.nullable() }))
    .min(1)
    .max(30),
  /** Candidates already offered and turned down with "Pick again". */
  declinedIds: z.array(idSchema).max(30),
});
export type TaskPickRequest = z.infer<typeof taskPickRequestSchema>;

export const taskPickResponseSchema = z.object({
  /** One of the request's candidate ids, and not a declined one. */
  pickedId: idSchema,
  /** The pick said small, "Reply to Sam. Two sentences." */
  ask: taskTextSchema,
  line: lineSchema,
});
export type TaskPickResponse = z.infer<typeof taskPickResponseSchema>;

// day.morning_line: the first line of the day.

export const dayMorningLineRequestSchema = spokenRequestSchema.extend({
  localDate: isoDateSchema,
  /**
   * `fresh`: nothing carried over. `carry_over`: yesterday's task is waiting.
   * `returning`: the user has been away. No count of days is ever sent, so no
   * line can mention one.
   */
  kind: z.enum(['fresh', 'carry_over', 'returning']),
  /** Set only when `kind` is `carry_over`. */
  carryOver: taskContextSchema.nullable(),
});
export type DayMorningLineRequest = z.infer<typeof dayMorningLineRequestSchema>;

export const dayMorningLineResponseSchema = z.object({
  line: lineSchema,
  /** A first small step for a carried-over task; otherwise `null`. */
  firstStep: taskTextSchema.nullable(),
});
export type DayMorningLineResponse = z.infer<typeof dayMorningLineResponseSchema>;

// week.sentence: one sentence that reflects the week's patterns back.

/**
 * Plain statistics worked out on the phone. They describe starts and finishes
 * only; nothing here counts a day without a session.
 */
export const weekStatsSchema = z.object({
  sessionsStarted: z.number().int().min(0),
  sessionsFinished: z.number().int().min(0),
  /** The local hour, 0 to 23, when most sessions started; `null` with too few. */
  usualStartHour: z.number().int().min(0).max(23).nullable(),
  byLength: z.array(
    z.object({
      minutes: z.number().int().min(1).max(50),
      started: z.number().int().min(0),
      finished: z.number().int().min(0),
    }),
  ),
  /** Most used first. */
  workModes: z.array(workModeSchema).max(5),
});
export type WeekStats = z.infer<typeof weekStatsSchema>;

export const weekSentenceRequestSchema = spokenRequestSchema.extend({
  week: isoWeekSchema,
  stats: weekStatsSchema,
});
export type WeekSentenceRequest = z.infer<typeof weekSentenceRequestSchema>;

export const weekSentenceResponseSchema = z.object({ sentence: lineSchema });
export type WeekSentenceResponse = z.infer<typeof weekSentenceResponseSchema>;

// week.record_name: the name of the week's record.

export const weekRecordNameRequestSchema = spokenRequestSchema.extend({
  week: isoWeekSchema,
  /**
   * One entry per bar on the record, in playing order. Bars from serious
   * tasks are left out, and a task marked private sends its monster name only.
   */
  bars: z
    .array(
      z.object({
        monsterName: z.string().min(1).max(60),
        task: taskTextSchema.nullable(),
      }),
    )
    .min(1)
    .max(7),
});
export type WeekRecordNameRequest = z.infer<typeof weekRecordNameRequestSchema>;

export const weekRecordNameResponseSchema = z.object({
  /** "Molar and the Bin Bags". */
  name: z.string().min(1).max(60),
  /** Scootch's one-line review, printed on the sleeve. */
  linerNote: lineSchema,
});
export type WeekRecordNameResponse = z.infer<typeof weekRecordNameResponseSchema>;
