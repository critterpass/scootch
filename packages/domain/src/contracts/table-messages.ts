import { z } from 'zod';

import { workModeSchema } from './art';
import { sessionMinutesSchema } from './common';

/**
 * Messages between a phone and its table. Joining is the WebSocket connection
 * itself; the person's id comes from the verified session, never the client.
 *
 * No message carries task text. A label is one or two words from a fixed table, and a work mode
 * is an id from the art package's list; an empty label means the seat shows none (a serious or
 * unscreened task).
 *
 * The session clock is the table's: `endsAt` and `minutes` in every snapshot, with `serverNow`
 * beside them so a phone can read the end on its own clock.
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

/**
 * The sender has finished their thing and is staying a while. The seat shows `done` until the
 * next session starts.
 */
export const tableDoneMessageSchema = z.strictObject({ type: z.literal('done') });

/** Give up the seat at once; the server closes with `TABLE_CLOSE_CODES.left`. */
export const tableLeaveMessageSchema = z.object({ type: z.literal('leave') });

export const tableClientMessageSchema = z.discriminatedUnion('type', [
  tableStartMessageSchema,
  tableNudgeMessageSchema,
  tableLabelMessageSchema,
  tableWorkModeMessageSchema,
  tableDoneMessageSchema,
  tableLeaveMessageSchema,
]);
export type TableClientMessage = z.infer<typeof tableClientMessageSchema>;

// Server to client.

export const tableSeatStatusSchema = z.enum(['here', 'working', 'away']);
export type TableSeatStatus = z.infer<typeof tableSeatStatusSchema>;

/** A seat belongs to a person, not a connection, so it survives a dropped socket. */
export const tableSeatSchema = z.object({
  userId: tableUserIdSchema,
  label: tableLabelSchema,
  /**
   * The art package's work mode id, so the seat's critter can be drawn at its kind of work.
   * `null` whenever the label says nothing of the work: no mode, or a hidden label.
   */
  workMode: workModeSchema.nullable().default(null),
  /** The person's display name, when the server sends one. */
  name: z.string().min(1).max(TABLE_NAME_MAX_LENGTH).optional(),
  online: z.boolean(),
  /**
   * On another person's seat: the nudges the receiver may still send that person this session
   * (three per person). On the receiver's own seat: the most they may still send anyone.
   */
  nudgesLeft: z.number().int().min(0).max(TABLE_MAX_NUDGES),
  /**
   * `here` with a connection open. `working` with none while the table's session runs for
   * someone who was in it: a locked phone, not an empty chair. `away` otherwise.
   */
  status: tableSeatStatusSchema.optional(),
  /** They said they have finished, this session. */
  done: z.boolean().optional(),
  /** Epoch milliseconds when they sat down. */
  seatedAt: z.number().int().optional(),
});
export type TableSeat = z.infer<typeof tableSeatSchema>;

/** The full snapshot, sent on connect and on every change. */
export const tableStateMessageSchema = z.object({
  type: z.literal('state'),
  /** The receiver's own id. */
  you: tableUserIdSchema,
  hostId: tableUserIdSchema.nullable(),
  seats: z.array(tableSeatSchema).max(TABLE_MAX_SEATS),
  /** How many the table seats, fixed when it opened: two without Plus, else the maximum. */
  capacity: z.number().int().min(2).max(TABLE_MAX_SEATS).optional(),
  /** Epoch milliseconds when the running session ends; `null` with no session. */
  endsAt: z.number().int().nullable(),
  minutes: sessionMinutesSchema.nullable(),
  /** The server's clock in epoch milliseconds, so the phone can correct its countdown. */
  serverNow: z.number().int(),
  /** The table's own id, so a phone can keep it and come back after a relaunch. */
  tableId: z.string().min(1).max(64).optional(),
  /**
   * People who left in the last few minutes, oldest first, so the table can say "finished and
   * left" after the seat itself has gone. Someone whose seat was taken away is never listed.
   */
  left: z
    .array(
      z.object({
        userId: tableUserIdSchema,
        name: z.string().min(1).max(TABLE_NAME_MAX_LENGTH).optional(),
        /** They had said they were finished. */
        done: z.boolean(),
        at: z.number().int(),
      }),
    )
    .max(TABLE_MAX_SEATS)
    .optional(),
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
  /** What the sender may still send this person. */
  nudgesLeft: z.number().int().min(0).max(TABLE_MAX_NUDGES),
  /**
   * False when the nudge could reach nobody (the person has no connection and no push could be
   * sent): it was then not counted.
   */
  delivered: z.boolean().optional(),
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
