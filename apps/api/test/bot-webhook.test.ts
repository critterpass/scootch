import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { sendMessage } from '../src/bot/telegram';
import { telegramWebhookRoute } from '../src/routes/telegram-webhook';

import { ask, botEnv, messageUpdate, telegram, webhookSecret } from './bot-support';
import { freshIp } from './support';

const helpReply = [
  '[dev] Commands:',
  '/costs: model spend today and this month, by route and by model',
  '/flag, or /flag <name> on|off: list the feature flags, or flip one',
  '/funnel: devices registered today, in the last 7 days and in total, by language',
  '/help: this list',
  '/status: environment, commit, database, model secrets and one check call to each model',
  '/user <hash prefix or token>: when one device was created and last seen, its language and its model-call count',
].join('\n');

afterEach(() => {
  vi.restoreAllMocks();
});

/** Posts to the shipped webhook route, with Telegram replaced at the Worker's own `fetch`. */
async function deliver(update: unknown, secret?: string) {
  const chat = telegram();
  vi.spyOn(globalThis, 'fetch').mockImplementation(chat.fetch);
  const headers = new Headers({
    'CF-Connecting-IP': freshIp(),
    'Content-Type': 'application/json',
  });
  if (secret !== undefined) headers.set('X-Telegram-Bot-Api-Secret-Token', secret);
  const ctx = createExecutionContext();
  const response = await createApp([telegramWebhookRoute]).fetch(
    new Request('https://api.test/v1/telegram/webhook', {
      method: 'POST',
      headers,
      body: typeof update === 'string' ? update : JSON.stringify(update),
    }),
    botEnv(),
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return { response, chat };
}

describe('the Telegram webhook', () => {
  it('answers the founder’s chat when Telegram’s secret token is right, with no device token', async () => {
    const { response, chat } = await deliver(messageUpdate('/help'), webhookSecret);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(chat.sent).toHaveLength(1);
    expect(chat.sent[0]?.url).toBe('https://api.telegram.org/bottest-bot-token/sendMessage');
    expect(chat.sent[0]?.body).toEqual({ chat_id: '4242', text: helpReply });
  });

  it.each([
    ['a wrong secret token', 'not-the-secret'],
    ['no secret token', undefined],
  ])('does nothing and sends nothing for %s', async (_case, secret) => {
    const { response, chat } = await deliver(messageUpdate('/flag tables.open on'), secret);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(chat.sent).toHaveLength(0);
    expect(await ask('/flag')).toBe('[dev] No flags yet.');
  });

  it('does nothing and sends nothing for another chat, even with the right secret token', async () => {
    const { response, chat } = await deliver(
      messageUpdate('/flag tables.open on', 9999),
      webhookSecret,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(chat.sent).toHaveLength(0);
    expect(await ask('/flag')).toBe('[dev] No flags yet.');
  });

  it('answers 200 and sends nothing for a body that is not an update', async () => {
    const { response, chat } = await deliver('not json', webhookSecret);

    expect(response.status).toBe(200);
    expect(chat.sent).toHaveLength(0);
  });

  it.each(['/nope', 'hello there', '/help extra words'])(
    'answers %j with the help text',
    async (text) => {
      expect(await ask(text)).toBe(helpReply);
    },
  );
});

describe('the sender', () => {
  it('prefixes every message with [dev] in dev and with nothing in prd', async () => {
    const chat = telegram();

    await sendMessage({ env: botEnv({ ENVIRONMENT: 'dev' }), fetch: chat.fetch }, 'All quiet.');
    await sendMessage({ env: botEnv({ ENVIRONMENT: 'prd' }), fetch: chat.fetch }, 'All quiet.');

    expect(chat.texts()).toEqual(['[dev] All quiet.', 'All quiet.']);
  });

  it('sends rows of inline buttons in Telegram’s shape', async () => {
    const chat = telegram();

    const sent = await sendMessage({ env: botEnv(), fetch: chat.fetch }, 'One report.', {
      buttons: [
        [
          { text: 'Dismiss', data: 'report:1:dismiss' },
          { text: 'Warn', data: 'report:1:warn' },
        ],
      ],
    });

    expect(sent).toBe(true);
    expect(chat.sent[0]?.body.reply_markup).toEqual({
      inline_keyboard: [
        [
          { text: 'Dismiss', callback_data: 'report:1:dismiss' },
          { text: 'Warn', callback_data: 'report:1:warn' },
        ],
      ],
    });
  });

  it('sends nothing, and says so, when the bot’s secrets are not set', async () => {
    const chat = telegram();

    const sent = await sendMessage(
      { env: botEnv({ TELEGRAM_BOT_TOKEN: '' }), fetch: chat.fetch },
      'All quiet.',
    );

    expect(sent).toBe(false);
    expect(chat.sent).toHaveLength(0);
  });
});
