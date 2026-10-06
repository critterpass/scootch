import { env } from 'cloudflare:workers';

import type { BotContext } from '../src/bot/telegram';
import { handleUpdate } from '../src/bot/webhook';
import type { Bindings } from '../src/env';

export const founderChatId = 4242;
export const webhookSecret = 'test-webhook-secret';

/** The simulated bindings plus made-up values for the secrets the bot reads. */
export function botEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    DB: env.DB,
    FILES: env.FILES,
    IP_RATE_LIMIT: env.IP_RATE_LIMIT,
    DEVICE_RATE_LIMIT: env.DEVICE_RATE_LIMIT,
    ENVIRONMENT: 'dev',
    COMMIT_SHA: 'abc1234',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: String(founderChatId),
    TELEGRAM_WEBHOOK_SECRET: webhookSecret,
    DEEPSEEK_API_KEY: 'test-deepseek-key',
    TYPESAFE_API_KEY: 'test-typesafe-key',
    ...overrides,
  };
}

export type SentMessage = {
  readonly url: string;
  readonly body: { chat_id: string; text: string; reply_markup?: unknown };
};

/**
 * Stands in for Telegram at the network boundary and keeps what was sent. The answer follows the
 * Bot API's documented `sendMessage` result; no live answer has been recorded yet. Requests to
 * any other address go to `otherwise`, or fail the test.
 */
export function telegram(options: { status?: number; otherwise?: typeof fetch } = {}): {
  fetch: typeof fetch;
  sent: SentMessage[];
  texts: () => string[];
} {
  const sent: SentMessage[] = [];
  const send: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith('https://api.telegram.org/')) {
      if (options.otherwise) return options.otherwise(input, init);
      throw new Error(`unexpected request to ${url}`);
    }
    if (typeof init?.body !== 'string') throw new Error('expected a JSON string body');
    const body = JSON.parse(init.body) as SentMessage['body'];
    sent.push({ url, body });
    const status = options.status ?? 200;
    return Response.json(
      status === 200
        ? {
            ok: true,
            result: {
              message_id: sent.length,
              date: 1_791_342_000,
              chat: { id: founderChatId, type: 'private' },
              text: body.text,
            },
          }
        : { ok: false, error_code: status, description: 'recorded failure' },
      { status },
    );
  };
  return { fetch: send, sent, texts: () => sent.map((message) => message.body.text) };
}

export function messageUpdate(text: string, chatId = founderChatId): unknown {
  return {
    update_id: 10_001,
    message: {
      message_id: 7,
      from: { id: chatId, is_bot: false, first_name: 'Founder' },
      chat: { id: chatId, type: 'private' },
      date: 1_791_342_000,
      text,
    },
  };
}

/** The founder sends `text`; the answer is the one message the bot sent back. */
export async function ask(
  text: string,
  context: Partial<Pick<BotContext, 'env' | 'now'>> & { providers?: typeof fetch } = {},
): Promise<string> {
  const chat = telegram(context.providers ? { otherwise: context.providers } : {});
  const accepted = await handleUpdate(
    { env: context.env ?? botEnv(), now: context.now ?? new Date(), fetch: chat.fetch },
    webhookSecret,
    messageUpdate(text),
  );
  if (!accepted || chat.sent.length !== 1) {
    throw new Error(`expected one reply, got ${chat.sent.length} (accepted: ${accepted})`);
  }
  return chat.texts()[0] ?? '';
}

export async function addDevice(
  hash: string,
  language: 'en' | 'vi',
  createdAt: string,
  lastSeenAt = createdAt,
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO devices (token_hash, language, created_at, last_seen_at) VALUES (?, ?, ?, ?)',
  )
    .bind(hash, language, createdAt, lastSeenAt)
    .run();
}

export async function addUsage(usage: {
  route: string;
  model: string;
  input: number;
  output: number;
  at: string;
  device?: string;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO ai_usage (route, model, input_tokens, output_tokens, device_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(usage.route, usage.model, usage.input, usage.output, usage.device ?? null, usage.at)
    .run();
}
