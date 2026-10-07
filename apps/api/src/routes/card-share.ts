import { cardDataSchema, screenVerdictSchema } from '@scootch/domain';
import { z } from 'zod';

import { refusal } from '../accounts/ids';
import type { DecideContext } from '../ai/decide';
import { screenText } from '../ai/screen-input';
import { languageSchema } from '../contracts';
import { hashDeviceToken, newDeviceToken } from '../device-auth';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';
import { newShareId, unshareTokenHeader } from '../sharing/shared-monsters';
import { shareSigningSecret, wordsAreSigned } from '../sharing/signed-words';

const routeId = 'card.share';

/**
 * A caught card as its page draws it, and nothing beside it: a strict body, so there is no field
 * for a sharer's name, an account, a device or a task id.
 */
const cardShareRequestSchema = z.strictObject({
  kind: z.enum(['card', 'story']),
  language: languageSchema,
  card: cardDataSchema.strict(),
  /** The care verdict the phone stored for the task, or `crisis` on a crisis day. */
  screen: screenVerdictSchema,
  /** The signature the task call gave with the monster's name, title and card line. */
  signature: z.string().min(1).max(128).optional(),
});

const cardShareResponseSchema = z.strictObject({
  id: z.string(),
  /** Kept by the phone; the only way to take the page down. Never stored as it is. */
  unshareToken: z.string(),
});
export type CardShareResponse = z.infer<typeof cardShareResponseSchema>;

const notShared = () => refusal('not_for_this_task', 'This one stays with you');
const notSigned = () => refusal('words_not_signed', 'A page is made only from words Scootch wrote');

/**
 * Shares a caught card or a share story from the app, and answers with the id of its page on the
 * website. What is stored is what the page shows: the card, with the task line only on a card
 * whose sharer left it showing. A story's page never shows the task line, so a story never keeps
 * it. No name, account or device is stored with it.
 *
 * A task that is not a plain `pass` is never shared, whatever the phone drew. The monster's name,
 * title and card line are taken only with the signature the server gave when it wrote them, for
 * exactly those words, the monster's seed and the language; they are the server's own comedy and
 * are not screened again. What the person typed is: a task line left showing goes through the
 * care screen, and one that is not clearly fine, or that no model could screen, is not stored.
 */
export const cardShareRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/card-share',
  access: 'device',
  handle: async (c) => {
    const request = await readBody(c, cardShareRequestSchema);
    if (request.screen !== 'pass') throw notShared();
    const card = {
      ...request.card,
      taskLine: request.kind === 'card' ? request.card.taskLine : null,
    };

    const signed = await wordsAreSigned(
      shareSigningSecret(c.env),
      {
        name: card.name,
        title: card.title,
        flavourText: card.flavourText,
        seed: card.monster.seed,
        language: request.language,
      },
      request.signature,
    );
    if (!signed) throw notSigned();

    if (card.taskLine !== null) {
      const context: DecideContext = { env: c.env, route: routeId, deviceHash: null };
      let verdict: string;
      try {
        verdict = (await screenText(context, card.taskLine)).verdict;
      } catch (error) {
        console.error('shared card not screened', {
          requestId: c.var.requestId,
          reason: error instanceof ApiError ? error.code : 'internal',
        });
        verdict = 'serious';
      }
      if (verdict !== 'pass') throw notShared();
    }

    const id = newShareId(card.name);
    const unshareToken = newDeviceToken();
    await c.env.DB.prepare(
      `INSERT INTO shared_cards (id, kind, language, payload, created_at, unshare_token_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        request.kind,
        request.language,
        JSON.stringify({ card, sharerName: null, headline: null }),
        new Date().toISOString(),
        await hashDeviceToken(unshareToken),
      )
      .run();
    return c.json(cardShareResponseSchema.parse({ id, unshareToken }));
  },
};

/**
 * Takes a shared card or story down: its row is deleted, and its page is then not found. Needs
 * the token the share answered with, in the unshare header.
 */
export const cardUnshareRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/v1/card-share/:id',
  access: 'device',
  handle: async (c) => {
    const id = c.req.param('id') ?? '';
    const token = c.req.header(unshareTokenHeader);
    const row = await c.env.DB.prepare('SELECT unshare_token_hash FROM shared_cards WHERE id = ?')
      .bind(id)
      .first<{ unshare_token_hash: string | null }>();
    if (!row) throw new ApiError('not_found', 'Nothing is shared here');
    if (token === undefined || (await hashDeviceToken(token)) !== row.unshare_token_hash) {
      throw refusal('not_yours', 'This was shared from another phone');
    }
    await c.env.DB.prepare('DELETE FROM shared_cards WHERE id = ?').bind(id).run();
    return c.json({ unshared: true });
  },
};
