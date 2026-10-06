import { z } from 'zod';

import { monsterBodyTypeSchema, workModeSchema } from './art';

/**
 * What the website's table invite page reads (`GET /v1/table-invite/:code`): what the table
 * shows everyone seated at it and nothing else. No account id, and never a task: a label is one
 * of the server's own one- or two-word labels.
 */
export const tableInvitePageSchema = z.strictObject({
  /** `closed` for a closed table and for a link that has run out. */
  state: z.enum(['open', 'closed']),
  /** The display name of whoever made the link; null when there is none to show. */
  hostName: z.string().min(1).max(20).nullable(),
  /** When the table closed; null while it is open, or when only the link has run out. */
  closedAt: z.iso.datetime().nullable(),
  /** Who is seated now. Empty unless the invite is open. */
  seats: z.array(
    z.strictObject({
      name: z.string().min(1).max(20).nullable(),
      /** Null when the seat hid its label, or has no work to show. */
      label: z.string().min(1).max(24).nullable(),
      /** The id the critter is drawn from. It says no more than the label, so it hides with it. */
      workMode: workModeSchema.nullable(),
    }),
  ),
});
export type TableInvitePage = z.infer<typeof tableInvitePageSchema>;

/** A haunt's id: 16 characters of lower-case base32, 80 random bits. It is the link's secret. */
export const hauntPageIdPattern = /^[a-z2-7]{16}$/;

/**
 * What the website's haunt page reads (`GET /v1/haunt-page/:id`): the monster's body and seed, a
 * dare id from the preset list, and the sender's display name unless it was sent without one.
 * No account id, no task and no words of the sender's own.
 */
export const hauntPageSchema = z.strictObject({
  id: z.string().regex(hauntPageIdPattern),
  bodyType: monsterBodyTypeSchema,
  seed: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[0-9a-f-]+$/),
  dare: z
    .string()
    .max(24)
    .regex(/^[a-z_]+$/),
  sentAt: z.iso.datetime(),
  /** Null for a haunt sent without a name, and for one that has gone. */
  from: z.strictObject({ displayName: z.string().min(1).max(20).nullable() }).nullable(),
  /** `gone` once it has been caught or shooed; the page never learns which. */
  state: z.enum(['waiting', 'gone']),
});
export type HauntPage = z.infer<typeof hauntPageSchema>;

/** What shooing through the link answers, the same whether or not the haunt was still waiting. */
export const hauntPageShooResponseSchema = z.strictObject({ state: z.literal('gone') });

/** What sending a haunt answers: the id of its page on the website (`/h/<pageId>`). */
export const sendHauntResponseSchema = z.strictObject({
  sent: z.literal(true),
  pageId: z.string().regex(hauntPageIdPattern),
});
export type SendHauntResponse = z.infer<typeof sendHauntResponseSchema>;

/** What making a table invite answers: the code of its page on the website (`/t/<code>`). */
export const tableInviteResponseSchema = z.strictObject({
  code: z.string().regex(/^[a-z2-7]{10}$/),
  expiresAt: z.iso.datetime(),
});
export type TableInviteResponse = z.infer<typeof tableInviteResponseSchema>;
