import { z } from 'zod';

import { monsterBodyTypeSchema, monsterSpecSchema } from './art';
import { languageSchema } from './common';
import { hauntSeedSchema } from './haunt';
import { hauntPageIdPattern } from './public-pages';
import { TABLE_MAX_SEATS } from './table-messages';

/**
 * What the routes for sitting together and haunting answer with, beside the table's own socket
 * messages. Nothing here carries a task or anyone's own words but a display name.
 */

/** A table opened without Plus seats this many: the opener and one friend. */
export const TABLE_FREE_SEATS = 2;

const tableIdSchema = z.string().regex(/^[a-z2-7]{16}$/);
const accountIdSchema = z.string().regex(/^[a-z2-7]{12}$/);
const displayNameSchema = z.string().min(1).max(20).nullable();
const capacitySchema = z.number().int().min(TABLE_FREE_SEATS).max(TABLE_MAX_SEATS);

/** `POST /v1/tables`: the new table, and how many it seats (fixed when it opens). */
export const openTableResponseSchema = z.object({
  tableId: tableIdSchema,
  capacity: capacitySchema,
});
export type OpenTableResponse = z.infer<typeof openTableResponseSchema>;

/**
 * `POST /v1/tables/join` and `POST /v1/tables/:id/join`. `madeFriends` is true when sitting down
 * through a link made the caller and the link's maker friends.
 */
export const joinTableResponseSchema = z.object({
  tableId: tableIdSchema,
  capacity: capacitySchema,
  madeFriends: z.boolean(),
});
export type JoinTableResponse = z.infer<typeof joinTableResponseSchema>;

/** `GET /v1/friends/tables`: the open tables a friend is at that the caller may sit down at. */
export const friendsTablesResponseSchema = z.object({
  tables: z.array(
    z.object({
      tableId: tableIdSchema,
      capacity: capacitySchema,
      seatsTaken: z.number().int().min(1).max(TABLE_MAX_SEATS),
      /** The caller's friends seated there, never anyone else. */
      friends: z.array(z.object({ accountId: accountIdSchema, displayName: displayNameSchema })),
    }),
  ),
});
export type FriendsTablesResponse = z.infer<typeof friendsTablesResponseSchema>;

/** `GET /v1/tables/mine`: where the caller holds a seat, so a relaunched app can go back to it. */
export const myTableResponseSchema = z.object({
  table: z
    .object({
      tableId: tableIdSchema,
      capacity: capacitySchema,
      /** Epoch milliseconds when the running session ends; null with none. */
      endsAt: z.number().int().nullable(),
      minutes: z.number().int().nullable(),
      serverNow: z.number().int(),
    })
    .nullable(),
});
export type MyTableResponse = z.infer<typeof myTableResponseSchema>;

/**
 * `POST /v1/codes/classify`: what a pasted code or link is for, so one field can take any of
 * them. The answer is the kind and the bare code, and nothing about whose it is. A code that is
 * unknown, used or expired is `unknown`.
 */
export const pastedCodeKindSchema = z.enum(['table', 'friend', 'haunt', 'unknown']);
export type PastedCodeKind = z.infer<typeof pastedCodeKindSchema>;
export const classifyCodeResponseSchema = z.strictObject({
  kind: pastedCodeKindSchema,
  /** The bare code to send on; null when the kind is `unknown`. */
  code: z.string().nullable(),
});
export type ClassifyCodeResponse = z.infer<typeof classifyCodeResponseSchema>;

/**
 * What the website's friend link page reads (`GET /v1/friend-invite/:code`). `gone` is a link
 * that was used or has run out, and names nobody.
 */
export const friendInvitePageSchema = z.strictObject({
  state: z.enum(['valid', 'gone']),
  fromName: displayNameSchema,
});
export type FriendInvitePage = z.infer<typeof friendInvitePageSchema>;

/**
 * The words the server wrote for a haunt's monster, with its own signature over them, as the
 * task call gave them to the sender's phone. They are the server's comedy, never the task.
 */
export const hauntMonsterWordsSchema = z.strictObject({
  name: z.string().min(1).max(60),
  title: z.string().max(60),
  flavourText: z.string().min(1).max(160),
  language: languageSchema,
  signature: z.string().min(1).max(128),
});
export type HauntMonsterWords = z.infer<typeof hauntMonsterWordsSchema>;

/** A haunt as its receiver's phone is given it: waiting, or just caught. */
export const receivedHauntSchema = z.object({
  id: z.string().regex(hauntPageIdPattern),
  bodyType: monsterBodyTypeSchema,
  seed: hauntSeedSchema,
  dare: z.string().max(24),
  sentAt: z.iso.datetime(),
  /** After this the haunt is gone for everyone. */
  expiresAt: z.iso.datetime(),
  from: z.object({ accountId: accountIdSchema, displayName: displayNameSchema }).nullable(),
  /**
   * The monster's drawing as its sender's phone had it. Null when none was sent: the phone then
   * draws it from the body and the seed alone.
   */
  spec: monsterSpecSchema.nullable(),
  /** Null for a haunt sent without words. The phone then names the monster itself. */
  words: hauntMonsterWordsSchema.nullable(),
});
export type ReceivedHaunt = z.infer<typeof receivedHauntSchema>;

/** `GET /v1/haunts/waiting`: a count and nothing else, cheap enough to ask on every foreground. */
export const hauntsWaitingResponseSchema = z.strictObject({ waiting: z.number().int().min(0) });
export type HauntsWaitingResponse = z.infer<typeof hauntsWaitingResponseSchema>;

/**
 * `POST /v1/push/tokens`: a token Apple gave this phone. `kind` says what it is for: `alert` is
 * the device's own token, `live_activity_start` the push-to-start token, and `live_activity` the
 * token of one running activity. `environment` is the APNs host the token belongs to.
 */
export const pushTokenKindSchema = z.enum(['alert', 'live_activity_start', 'live_activity']);
export type PushTokenKind = z.infer<typeof pushTokenKindSchema>;
export const registerPushTokenRequestSchema = z.strictObject({
  token: z.string().regex(/^[0-9a-f]{64,200}$/),
  kind: pushTokenKindSchema,
  environment: z.enum(['sandbox', 'production']),
  /** The bundle id the token was issued to: it is the push's topic. */
  bundleId: z.enum(['app.scootch', 'app.scootch.dev']),
});
export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>;
