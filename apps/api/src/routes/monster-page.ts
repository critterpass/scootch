import { cardDataSchema } from '@scootch/domain';
import { z } from 'zod';

import { languageSchema } from '../contracts';
import { ApiError } from '../errors';
import type { RouteContext, RouteDefinition } from '../route';
import { previewPng } from '../sharing/preview-image';
import { previewPrefix, readSharedMonster, type SharedMonster } from '../sharing/shared-monsters';
import { shareSigningSecret, signWords } from '../sharing/signed-words';

async function sharedMonster(c: RouteContext): Promise<SharedMonster> {
  const monster = await readSharedMonster(c.env.DB, c.req.param('id') ?? '');
  if (!monster) throw new ApiError('not_found', 'No such shared monster');
  return monster;
}

/**
 * What a monster's own page shows, and what the app hatches a website monster from: its body,
 * seed, name and card line, with the server's signature over those words. An unknown or unshared
 * id is `not_found`.
 */
export const monsterPageRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/monster-page/:id',
  access: 'public',
  handle: async (c) => {
    const monster = await sharedMonster(c);
    const secret = shareSigningSecret(c.env);
    if (secret === undefined) return c.json(monster);
    const { name, flavourText, seed, language } = monster;
    const signature = await signWords(secret, { name, title: '', flavourText, seed, language });
    return c.json({ ...monster, signature });
  },
};

/**
 * A monster's link preview image, 1200 by 630. Rendered once per status and kept in the bucket:
 * the catch changes the status, so a caught monster gets a new image and the wild one is left
 * behind. Unsharing deletes both.
 */
export const monsterPreviewRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/monster-page/:id/preview.png',
  access: 'public',
  handle: async (c) => {
    const monster = await sharedMonster(c);
    const key = `${previewPrefix(monster.id)}${
      monster.status === 'wild' ? 'wild' : `caught-${monster.catchMinutes ?? 0}`
    }.png`;
    const headers = {
      'Content-Type': 'image/png',
      // Short, so a reader that asks again after a catch gets the new image.
      'Cache-Control': 'public, max-age=600',
    };
    const kept = await c.env.FILES.get(key);
    if (kept) return new Response(kept.body, { headers });
    const png = await previewPng(monster);
    await c.env.FILES.put(key, png, { httpMetadata: { contentType: 'image/png' } });
    return new Response(png, { headers });
  },
};

/** What the app stores when a card or a story is shared: only what the sharer chose to show. */
const sharedCardPayloadSchema = z.strictObject({
  card: cardDataSchema,
  /** The sharer's first name, when they chose to show it. */
  sharerName: z.string().min(1).max(40).nullable(),
  /** What was done, in a sentence, for a story; null when the task is hidden. */
  headline: z.string().min(1).max(80).nullable(),
});

const sharedCardSchema = sharedCardPayloadSchema.extend({
  id: z.string(),
  kind: z.enum(['card', 'story']),
  language: languageSchema,
  sharedAt: z.string(),
});
export type SharedCard = z.infer<typeof sharedCardSchema>;

async function sharedCard(c: RouteContext, kind: SharedCard['kind']): Promise<Response> {
  const row = await c.env.DB.prepare(
    'SELECT id, language, payload, created_at FROM shared_cards WHERE id = ? AND kind = ?',
  )
    .bind(c.req.param('id') ?? '', kind)
    .first<{ id: string; language: string; payload: string; created_at: string }>();
  if (!row) throw new ApiError('not_found', 'Nothing is shared here');
  const payload = sharedCardPayloadSchema.parse(JSON.parse(row.payload));
  return c.json(
    sharedCardSchema.parse({
      ...payload,
      id: row.id,
      kind,
      language: row.language,
      sharedAt: row.created_at,
    }),
  );
}

/** A caught card shared from the app. */
export const sharedCardRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/shared-card/:id',
  access: 'public',
  handle: (c) => sharedCard(c, 'card'),
};

/** A share story shared from the app. */
export const sharedStoryRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/shared-story/:id',
  access: 'public',
  handle: (c) => sharedCard(c, 'story'),
};
