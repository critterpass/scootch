import { monsterBodyTypeSchema } from '@scootch/domain';
import { z } from 'zod';

import type { DecideContext } from '../ai/decide';
import { screenText } from '../ai/screen-input';
import { languageSchema } from '../contracts';
import { hashDeviceToken, newDeviceToken } from '../device-auth';
import { refusal } from '../accounts/ids';
import { ApiError } from '../errors';
import { readBody, type RouteDefinition } from '../route';
import { newShareId, previewPrefix } from '../sharing/shared-monsters';
import { shareSigningSecret, wordsAreSigned } from '../sharing/signed-words';

const routeId = 'monster.share';

const monsterShareRequestSchema = z.strictObject({
  seed: z.string().min(1).max(64),
  bodyType: monsterBodyTypeSchema,
  name: z.string().trim().min(1).max(60),
  flavourText: z.string().trim().min(1).max(160),
  language: languageSchema,
  /** The signature the maker answered with, for this name, card line, seed and language. */
  signature: z.string().min(1).max(128).optional(),
  /** Sent only when the visitor left "show what I typed" on. Absent or null: never stored. */
  typed: z.string().trim().min(1).max(280).nullish(),
});

const monsterShareResponseSchema = z.union([
  /** A heavy text is never shared: the verdict alone, and nothing is stored. */
  z.strictObject({ verdict: z.enum(['serious', 'crisis']) }),
  z.strictObject({
    verdict: z.literal('pass'),
    id: z.string(),
    /** Kept by the visitor's browser; the only way to unshare. Never stored as it is. */
    unshareToken: z.string(),
  }),
]);
export type MonsterShareResponse = z.infer<typeof monsterShareResponseSchema>;

/**
 * Shares a hatched monster from the website's maker: its seed, body, name and card line, its
 * language, and the typed line only when the visitor chose to show it. Nothing else from the
 * maker is stored, and a shared monster is kept until it is unshared.
 *
 * The request comes from a browser, so the name and the card line are taken only with the
 * signature the maker gave when it wrote them, for exactly those words, the seed and the
 * language; anything else is refused. They are the server's own comedy and are not screened
 * again. What the visitor typed is: a typed line left showing goes through the care screen, and
 * one that is not clearly fine, or that no model could screen, is not stored.
 */
export const monsterShareRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/monster-share',
  access: 'public',
  handle: async (c) => {
    const request = await readBody(c, monsterShareRequestSchema);
    const typed = request.typed ?? null;
    const signed = await wordsAreSigned(
      shareSigningSecret(c.env),
      {
        name: request.name,
        title: '',
        flavourText: request.flavourText,
        seed: request.seed,
        language: request.language,
      },
      request.signature,
    );
    if (!signed) {
      throw refusal('words_not_signed', 'A page is made only from words Scootch wrote');
    }

    let verdict: 'pass' | 'serious' | 'crisis' = 'pass';
    if (typed !== null) {
      const context: DecideContext = { env: c.env, route: routeId, deviceHash: null };
      try {
        const screened = await screenText(context, typed);
        // A text that is not a note is not shared either.
        verdict = screened.verdict === 'reject' ? 'serious' : screened.verdict;
      } catch (error) {
        console.error('shared monster not screened', {
          requestId: c.var.requestId,
          reason: error instanceof ApiError ? error.code : 'internal',
        });
        verdict = 'serious';
      }
    }
    if (verdict !== 'pass') return c.json(monsterShareResponseSchema.parse({ verdict }));

    const id = newShareId(request.name);
    const unshareToken = newDeviceToken();
    await c.env.DB.prepare(
      `INSERT INTO shared_monsters
         (id, seed, body_type, name, flavour_text, language, typed_line, unshare_token_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        request.seed,
        request.bodyType,
        request.name,
        request.flavourText,
        request.language,
        typed,
        await hashDeviceToken(unshareToken),
        new Date().toISOString(),
      )
      .run();
    return c.json(monsterShareResponseSchema.parse({ verdict, id, unshareToken }));
  },
};

/**
 * Unshares a monster: its row and its link preview images are deleted. Needs the token the share
 * answered with, as a bearer token.
 */
export const monsterUnshareRoute: RouteDefinition = {
  method: 'DELETE',
  path: '/v1/monster-share/:id',
  access: 'public',
  handle: async (c) => {
    const id = c.req.param('id') ?? '';
    const token = c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    const row = await c.env.DB.prepare(
      'SELECT unshare_token_hash FROM shared_monsters WHERE id = ?',
    )
      .bind(id)
      .first<{ unshare_token_hash: string }>();
    if (!row) throw new ApiError('not_found', 'No such shared monster');
    if (token === undefined || (await hashDeviceToken(token)) !== row.unshare_token_hash) {
      throw new ApiError('unauthorized', 'This monster was shared from another browser');
    }
    await c.env.DB.prepare('DELETE FROM shared_monsters WHERE id = ?').bind(id).run();
    const previews = await c.env.FILES.list({ prefix: previewPrefix(id) });
    if (previews.objects.length > 0) {
      await c.env.FILES.delete(previews.objects.map((object) => object.key));
    }
    return c.json({ unshared: true });
  },
};
