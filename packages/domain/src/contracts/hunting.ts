import { z } from 'zod';

/**
 * A beat: the phone says a session began (`true`) or ended (`false`). It carries nothing about
 * the task or the session; the server knows the device from its token and keeps one row per
 * device, only while it hunts.
 */
export const huntingBeatRequestSchema = z.strictObject({
  hunting: z.boolean(),
});
export type HuntingBeatRequest = z.infer<typeof huntingBeatRequestSchema>;

/** The beat, said back. */
export const huntingBeatResponseSchema = z.strictObject({
  hunting: z.boolean(),
});
export type HuntingBeatResponse = z.infer<typeof huntingBeatResponseSchema>;

/**
 * How many devices are in a session right now, the caller's own included. The number is exact:
 * the phone rounds it, and shows nothing under its floor.
 */
export const huntingCountResponseSchema = z.strictObject({
  count: z.number().int().min(0),
});
export type HuntingCountResponse = z.infer<typeof huntingCountResponseSchema>;
