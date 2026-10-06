import type { Bindings } from '../env';

/** What every part of the bot works from. `fetch` is the network boundary, replaced in tests. */
export type BotContext = {
  readonly env: Bindings;
  readonly now: Date;
  readonly fetch?: typeof fetch;
};

/** A button under a message. `data` comes back to the webhook when the founder taps it. */
export type InlineButton = { readonly text: string; readonly data: string };

export type SendOptions = {
  /** Rows of buttons, top to bottom. */
  readonly buttons?: readonly (readonly InlineButton[])[];
};

const telegramApi = 'https://api.telegram.org';
const sendTimeoutMs = 5_000;
/** Telegram refuses a message longer than 4096 characters. */
const longestMessage = 4000;

/**
 * Sends one message to the founder's chat, and only there. Messages are plain text, short, and
 * built from counts, names and times: never from anything a user typed or said. In dev every
 * message starts with `[dev]`; in prd it is sent as it is.
 *
 * Answers whether Telegram took the message. It never throws, and it never logs the address,
 * which holds the bot's token.
 */
export async function sendMessage(
  context: Pick<BotContext, 'fetch'> & {
    readonly env: Pick<Bindings, 'ENVIRONMENT' | 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID'>;
  },
  text: string,
  options: SendOptions = {},
): Promise<boolean> {
  const { ENVIRONMENT, TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = context.env;
  if (!token || !chatId) {
    console.error('bot message not sent', { reason: 'missing_secret' });
    return false;
  }
  const prefixed = ENVIRONMENT === 'dev' ? `[dev] ${text}` : text;
  const send = context.fetch ?? fetch;
  try {
    const response = await send(`${telegramApi}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: prefixed.slice(0, longestMessage),
        ...(options.buttons === undefined
          ? {}
          : {
              reply_markup: {
                inline_keyboard: options.buttons.map((row) =>
                  row.map((button) => ({ text: button.text, callback_data: button.data })),
                ),
              },
            }),
      }),
      signal: AbortSignal.timeout(sendTimeoutMs),
    });
    await response.body?.cancel();
    if (!response.ok) console.error('bot message not sent', { reason: `http_${response.status}` });
    return response.ok;
  } catch {
    console.error('bot message not sent', { reason: 'transport_error' });
    return false;
  }
}
