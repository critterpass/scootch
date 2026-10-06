import { z } from 'zod';

import { workModeSchema } from './art';
import { sessionMinutesSchema } from './common';

/**
 * Messages between a phone and its table. Joining is the WebSocket connection
 * itself; the person's id comes from the verified session, never the client.
 *
 * No message carries task text. A label is one or two words written by the AI;
 * an empty label means the seat shows none (a hidden label or a serious task).
 */
export const TABLE_MAX_SEATS = 4;
export const TABLE_MAX_NUDGES = 3;
export const TABLE_LABEL_MAX_LENGTH = 24;

/** Sent as plain text, not JSON, and answered without waking the table. */
export const TABLE_PING = 'ping';
export const TABLE_PONG = 'pong';

export const TABLE_CLOSE_CODES = {
  left: 1000,
  replaced: 4001,
  /** No seat for this person here: never admitted, removed, or the table has closed. */
  notSeated: 4403,
  tableFull: 4409,
} as const;

/** The longest display name shown on a seat. */
export const TABLE_NAME_MAX_LENGTH = 20;

export const tableUserIdSchema = z.string().min(1).max(64);
export const tableLabelSchema = z.string().max(TABLE_LABEL_MAX_LENGTH);

// Client to server.

export const tableStartMessageSchema = z.object({
  type: z.literal('start'),
  minutes: sessionMinutesSchema,
});

/** A silent nudge to one seat. */
export const tableNudgeMessageSchema = z.object({
  type: z.literal('nudge'),
  to: tableUserIdSchema,
});

/** Change the sender's own label. */
export const tableLabelMessageSchema = z.object({
  type: z.literal('label'),
  label: tableLabelSchema,
});

/**
 * What the sender is doing, as a work mode id and nothing else. The server turns the id into the
 * one or two words the others see. `null` shows no label (a serious or unscreened task);
 * `hidden` shows "busy" whatever the mode. A server may refuse `label` messages and accept only
 * this one, so that no words typed on a phone can reach a table.
 */
export const tableWorkModeMessageSchema = z.strictObject({
  type: z.literal('mode'),
  workMode: workModeSchema.nullable(),
  hidden: z.boolean(),
});

/** Give up the seat at once; the server closes with `TABLE_CLOSE_CODES.left`. */
export const tableLeaveMessageSchema = z.object({ type: z.literal('leave') });

export const tableClientMessageSchema = z.discriminatedUnion('type', [
  tableStartMessageSchema,
  tableNudgeMessageSchema,
  tableLabelMessageSchema,
  tableWorkModeMessageSchema,
  tableLeaveMessageSchema,
]);
export type TableClientMessage = z.infer<typeof tableClientMessageSchema>;

// Server to client.

/** A seat belongs to a person, not a connection, so it survives a dropped socket. */
export const tableSeatSchema = z.object({
  userId: tableUserIdSchema,
  label: tableLabelSchema,
  /** The person's display name, when the server sends one. */
  name: z.string().min(1).max(TABLE_NAME_MAX_LENGTH).optional(),
  online: z.boolean(),
  nudgesLeft: z.number().int().min(0).max(TABLE_MAX_NUDGES),
});
export type TableSeat = z.infer<typeof tableSeatSchema>;

/** The full snapshot, sent on connect and on every change. */
export const tableStateMessageSchema = z.object({
  type: z.literal('state'),
  /** The receiver's own id. */
  you: tableUserIdSchema,
  hostId: tableUserIdSchema.nullable(),
  seats: z.array(tableSeatSchema).max(TABLE_MAX_SEATS),
  /** Epoch milliseconds when the running session ends; `null` with no session. */
  endsAt: z.number().int().nullable(),
  minutes: sessionMinutesSchema.nullable(),
  /** The server's clock in epoch milliseconds, so the phone can correct its countdown. */
  serverNow: z.number().int(),
});
export type TableStateMessage = z.infer<typeof tableStateMessageSchema>;

/** To the nudged person only. */
export const tableNudgedMessageSchema = z.object({
  type: z.literal('nudged'),
  from: tableUserIdSchema,
});

/** To the sender only. */
export const tableNudgeSentMessageSchema = z.object({
  type: z.literal('nudge_sent'),
  to: tableUserIdSchema,
  nudgesLeft: z.number().int().min(0).max(TABLE_MAX_NUDGES),
});

/** The timer ran out. A `state` with `endsAt: null` follows. */
export const tableSessionEndedMessageSchema = z.object({ type: z.literal('session_ended') });

/**
 * This socket lost to a newer one for the same person. It is final: the
 * client must not reconnect and must not wait for the close to arrive.
 */
export const tableReplacedMessageSchema = z.object({ type: z.literal('replaced') });

export const tableErrorCodeSchema = z.enum([
  'table_full',
  'bad_duration',
  'session_running',
  'no_session',
  'nudge_limit',
  'bad_target',
  'not_seated',
  'bad_message',
  'unknown_type',
  /** A `label` message, or any other attempt to send words for a label. */
  'label_text_refused',
  /** The table has closed, or this person's seat was taken away. */
  'seat_removed',
]);
export type TableErrorCode = z.infer<typeof tableErrorCodeSchema>;

export const tableErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: tableErrorCodeSchema,
});

export const tableServerMessageSchema = z.discriminatedUnion('type', [
  tableStateMessageSchema,
  tableNudgedMessageSchema,
  tableNudgeSentMessageSchema,
  tableSessionEndedMessageSchema,
  tableReplacedMessageSchema,
  tableErrorMessageSchema,
]);
export type TableServerMessage = z.infer<typeof tableServerMessageSchema>;
