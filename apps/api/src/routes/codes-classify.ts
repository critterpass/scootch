import { z } from 'zod';

import { classifyCode } from '../accounts/codes';
import { classifyCodeResponseSchema } from '../contracts';
import { readBody, type RouteDefinition } from '../route';

const classifyRequestSchema = z.strictObject({ text: z.string().min(1).max(300) });

/**
 * Says what a pasted code or link is for (a table, a friend link, a haunt, or nothing that
 * works), so the app's one paste field can take any of them. The answer names nobody.
 */
export const codesClassifyRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/codes/classify',
  access: 'device',
  handle: async (c) => {
    const { text } = await readBody(c, classifyRequestSchema);
    return c.json(classifyCodeResponseSchema.parse(await classifyCode(c.env.DB, text, new Date())));
  },
};
