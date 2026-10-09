import { z } from 'zod';

/** The two launch languages. Every AI request carries one. */
export const languageSchema = z.enum(['en', 'vi']);
export type Language = z.infer<typeof languageSchema>;

/** Scootch's three attitudes. Cheeky is the default at first launch. */
export const attitudeSchema = z.enum(['soft', 'cheeky', 'unhinged']);
export type Attitude = z.infer<typeof attitudeSchema>;

export const energySchema = z.enum(['low', 'medium', 'fine']);
export type Energy = z.infer<typeof energySchema>;

/** The session lengths a user can pick. A bargain may go below ten minutes. */
export const sessionMinutesSchema = z.union([z.literal(10), z.literal(25), z.literal(50)]);
export type SessionMinutes = z.infer<typeof sessionMinutesSchema>;

/**
 * The care screen's answer for one piece of text.
 * `serious` and `crisis` switch the comedy off; `reject` is abuse or an
 * injection attempt. Code checks this flag and never re-derives it.
 */
export const screenVerdictSchema = z.enum(['pass', 'serious', 'crisis', 'reject']);
export type ScreenVerdict = z.infer<typeof screenVerdictSchema>;

/** The guess sheet's five steps, in minutes: 30 min, 1 hour, 2 hours, 3 hours and half a day. */
export const GUESS_MINUTES = [30, 60, 120, 180, 360] as const;
export const guessMinutesSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(120),
  z.literal(180),
  z.literal(360),
]);
export type GuessMinutes = z.infer<typeof guessMinutesSchema>;

/** A calendar day in the user's local time, `YYYY-MM-DD`. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export type IsoDate = z.infer<typeof isoDateSchema>;

/** An instant with an offset, `YYYY-MM-DDTHH:mm:ss(.sss)(Z|±HH:mm)`. */
export const isoDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/,
    'expected an ISO date-time with an offset',
  );
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/** An ISO week, `YYYY-Www`. Weeks run Monday to Sunday. */
export const isoWeekSchema = z.string().regex(/^\d{4}-W\d{2}$/, 'expected YYYY-Www');
export type IsoWeek = z.infer<typeof isoWeekSchema>;

/** A wall-clock time, `HH:mm`, 24-hour. */
export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:mm');
export type ClockTime = z.infer<typeof clockTimeSchema>;

/** Ids are opaque strings made on the phone (a UUID in practice). */
export const idSchema = z.string().min(1).max(64);
export type Id = z.infer<typeof idSchema>;

/** One line Scootch says. The voice check enforces the tighter per-slot limits. */
export const lineSchema = z.string().min(1).max(240);

/** Task text as the user said or typed it, or as Scootch reworded it. */
export const taskTextSchema = z.string().min(1).max(280);

export const wireErrorCodeSchema = z.enum([
  'bad_request',
  'unauthorized',
  'rate_limited',
  'not_found',
  'model_unavailable',
  'model_timeout',
  'voice_check_failed',
  'internal',
]);
export type WireErrorCode = z.infer<typeof wireErrorCodeSchema>;

/** The error body of every non-2xx API answer. */
export const wireErrorSchema = z.object({
  error: z.object({
    code: wireErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    detail: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type WireError = z.infer<typeof wireErrorSchema>;
