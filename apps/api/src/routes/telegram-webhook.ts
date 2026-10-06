import { handleUpdate } from '../bot/webhook';
import type { RouteDefinition } from '../route';

/**
 * Where Telegram delivers the operations bot's updates. It has no device behind it, so it is
 * public; the bot itself accepts only Telegram's secret token and the founder's chat.
 *
 * The answer is always an empty 200: a stranger cannot tell a refusal from a success, and
 * Telegram does not send the same update again.
 */
export const telegramWebhookRoute: RouteDefinition = {
  method: 'POST',
  path: '/v1/telegram/webhook',
  access: 'public',
  handle: async (c) => {
    try {
      const update: unknown = await c.req.json().catch(() => null);
      await handleUpdate(
        { env: c.env, now: new Date() },
        c.req.header('X-Telegram-Bot-Api-Secret-Token'),
        update,
      );
    } catch (error) {
      console.error('telegram update not handled', {
        requestId: c.var.requestId,
        error: error instanceof Error ? error.name : 'unknown',
      });
    }
    return c.body(null, 200);
  },
};
