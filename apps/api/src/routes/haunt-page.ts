import { readHauntPage } from '../accounts/haunt-reads';
import { shooHauntByLink } from '../accounts/haunts';
import { hauntPageIdPattern, hauntPageSchema } from '../contracts';
import { ApiError } from '../errors';
import type { RouteContext, RouteDefinition } from '../route';

/**
 * A haunt's id is the whole key to its page: whoever holds the link may see the monster and shoo
 * it, and nothing else. The id opens no device route for anyone but the haunt's recipient.
 */
function pageId(c: RouteContext): string {
  const id = c.req.param('id') ?? '';
  if (!hauntPageIdPattern.test(id)) throw new ApiError('not_found', 'No such haunt');
  return id;
}

/** What a haunt's page shows. The answer is for its one reader and is never kept. */
export const hauntPageRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/haunt-page/:id',
  access: 'public',
  handle: async (c) => {
    const haunt = await readHauntPage(c.env.DB, pageId(c), new Date());
    if (haunt === null) throw new ApiError('not_found', 'No such haunt');
    c.header('Cache-Control', 'private, no-store');
    return c.json(hauntPageSchema.parse(haunt));
  },
};

/**
 * Shoos a haunt through its link, as the app's own shoo does. The answer is the same whether it
 * was waiting, already shooed or already caught, so asking twice tells nothing and changes nothing.
 */
export const hauntPageShooRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/haunt-page/:id/shoo',
  access: 'public',
  handle: async (c) => {
    if (!(await shooHauntByLink(c.env.DB, pageId(c)))) {
      throw new ApiError('not_found', 'No such haunt');
    }
    c.header('Cache-Control', 'private, no-store');
    return c.json({ state: 'gone' });
  },
};
