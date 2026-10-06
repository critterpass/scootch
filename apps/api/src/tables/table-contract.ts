// The tables' door to the shared wire contracts, reached by path as `src/contracts.ts` does.
import { z } from 'zod';

import { workModeSchema } from '../../../../packages/domain/src/contracts/art';
import { sessionMinutesSchema } from '../../../../packages/domain/src/contracts/common';
import type { TableClientMessage } from '../../../../packages/domain/src/contracts/table-messages';
import { accountIdPattern } from '../accounts/ids';

export {
  monsterBodyTypeSchema,
  workModeSchema,
  WORK_MODE_IDS,
  type WorkMode,
} from '../../../../packages/domain/src/contracts/art';
export {
  TABLE_CLOSE_CODES,
  TABLE_MAX_NUDGES,
  TABLE_MAX_SEATS,
  TABLE_PING,
  TABLE_PONG,
  tableServerMessageSchema,
  type TableErrorCode,
  type TableSeat,
  type TableServerMessage,
} from '../../../../packages/domain/src/contracts/table-messages';
export type { SessionMinutes } from '../../../../packages/domain/src/contracts/common';

/**
 * The only messages a table takes from a phone. Each is a strict object, so an extra field is a
 * refusal, and no field is free text: a duration from three, an account id, a work mode id and
 * a switch. The contract's `label` message, which carries words, is deliberately absent.
 */
export const acceptedClientMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('start'), minutes: sessionMinutesSchema }),
  z.strictObject({ type: z.literal('nudge'), to: z.string().regex(accountIdPattern) }),
  z.strictObject({
    type: z.literal('mode'),
    workMode: workModeSchema.nullable(),
    hidden: z.boolean(),
  }),
  z.strictObject({ type: z.literal('leave') }),
]);
export type AcceptedClientMessage = z.infer<typeof acceptedClientMessageSchema>;

// Every accepted message is one the contract already describes.
export type AcceptedIsInContract = AcceptedClientMessage extends TableClientMessage ? true : never;
export const acceptedIsInContract: AcceptedIsInContract = true;

/** A raw message longer than this is not read. The longest real one is well under it. */
export const longestClientMessage = 128;

/**
 * One raw message from a phone, read strictly, or the error to answer it with. A `label`
 * message gets its own refusal so a phone that still sends words learns why.
 */
export function readClientMessage(
  raw: string | ArrayBuffer,
): AcceptedClientMessage | 'label_text_refused' | 'bad_message' {
  if (typeof raw !== 'string' || raw.length > longestClientMessage) return 'bad_message';
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return 'bad_message';
  }
  if ((json as { type?: unknown } | null)?.type === 'label') return 'label_text_refused';
  const parsed = acceptedClientMessageSchema.safeParse(json);
  return parsed.success ? parsed.data : 'bad_message';
}

/** Set by the Worker after it has verified the device and its account; never by a phone. */
export const accountHeader = 'x-scootch-account';
export const languageHeader = 'x-scootch-language';

/** What a hibernating socket remembers: whose it is, and the language their labels are in. */
export type Attachment = { accountId: string; language: 'en' | 'vi' };
