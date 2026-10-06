import { inviteCodePattern } from '../accounts/ids';
import { tableInvitePageSchema, type Language } from '../contracts';
import { ApiError } from '../errors';
import type { RouteDefinition } from '../route';
import { readInvitePage } from '../tables/invite-page';

/**
 * Labels are written in the page's language when the website says which page is asking (`?lang=`),
 * and otherwise in the reader's first language when it is Vietnamese, else in English.
 */
function languageOf(page: string | undefined, acceptLanguage: string | undefined): Language {
  if (page === 'vi' || page === 'en') return page;
  return /^\s*vi\b/i.test(acceptLanguage ?? '') ? 'vi' : 'en';
}

/**
 * What a table's invite page shows before anyone sits down. The code is the only key: no device
 * and no account. An unknown code is `not_found`; a link that has run out, or whose table has
 * closed, answers `closed` with no seats. The answer is for its one reader and is never kept.
 */
export const tableInvitePageRoute: RouteDefinition = {
  method: 'GET',
  path: '/v1/table-invite/:code',
  access: 'public',
  handle: async (c) => {
    const code = c.req.param('code') ?? '';
    const invite = inviteCodePattern.test(code)
      ? await readInvitePage(
          c.env,
          code,
          languageOf(c.req.query('lang'), c.req.header('Accept-Language')),
          new Date(),
        )
      : null;
    if (invite === null) throw new ApiError('not_found', 'No such invite');
    c.header('Cache-Control', 'private, no-store');
    return c.json(tableInvitePageSchema.parse(invite));
  },
};
