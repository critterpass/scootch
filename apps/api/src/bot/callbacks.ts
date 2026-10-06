import { z } from 'zod';

import { actOnReport, reportActions } from '../tables/moderation';

import { sendMessage, type BotContext } from './telegram';

/** A tap on an inline button: the button's data and the chat its message sits in. */
export const callbackUpdateSchema = z.object({
  callback_query: z.object({
    id: z.string().min(1),
    data: z.string().max(64),
    message: z.object({ chat: z.object({ id: z.number() }) }),
  }),
});
export type CallbackQuery = z.infer<typeof callbackUpdateSchema>['callback_query'];

const reportButton = new RegExp(`^report:(\\d{1,12}):(${reportActions.join('|')})$`);

/** Tells Telegram the tap was handled, so the button stops spinning. Never throws. */
async function acknowledge(context: BotContext, queryId: string): Promise<void> {
  const token = context.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const response = await (context.fetch ?? fetch)(
      `https://api.telegram.org/bot${token}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    await response.body?.cancel();
  } catch {
    console.error('bot callback not acknowledged', { reason: 'transport_error' });
  }
}

/**
 * Acts on a button tapped in the founder's chat. The caller has already checked Telegram's
 * secret and the chat. A report's first tap decides it; the answer goes back as a message.
 */
export async function handleCallback(context: BotContext, query: CallbackQuery): Promise<void> {
  const [, id, action] = reportButton.exec(query.data) ?? [];
  const known = reportActions.find((candidate) => candidate === action);
  if (id !== undefined && known !== undefined) {
    await sendMessage(context, await actOnReport(context.env, Number(id), known, context.now));
  }
  await acknowledge(context, query.id);
}
