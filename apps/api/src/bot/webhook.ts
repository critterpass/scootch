import { z } from 'zod';

import { callbackUpdateSchema, handleCallback } from './callbacks';
import { helpText, type BotCommand } from './command';
import * as commandModules from './commands/index.generated';
import { sendMessage, type BotContext } from './telegram';

export const botCommands: readonly BotCommand[] = Object.values(commandModules);

/**
 * The only parts of an update the bot reads: a text message and the chat it came from, or a tap
 * on one of its own buttons (`callbackUpdateSchema`) and the chat that button sits in.
 */
const updateSchema = z.object({
  message: z.object({ chat: z.object({ id: z.number() }), text: z.string() }),
});

async function sameSecret(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all(
    [given, expected].map(
      async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    ),
  );
  if (a === undefined || b === undefined) return false;
  // Digests are the same length and every byte is read, so the time taken says nothing about
  // how much of the secret was right.
  let difference = 0;
  for (const [index, byte] of a.entries()) difference |= byte ^ (b[index] ?? 0);
  return difference === 0;
}

/** `/flag@ScootchBot dark on` is the command `flag` with the arguments `dark` and `on`. */
function parseCommand(text: string): { name: string; args: string[] } | undefined {
  const [first, ...args] = text.trim().split(/\s+/);
  const name = first?.match(/^\/([a-z_]+)(?:@\w+)?$/i)?.[1];
  return name === undefined ? undefined : { name: name.toLowerCase(), args };
}

/**
 * Handles one Telegram update, a message or a button tap. It is acted on only when Telegram sent
 * it (the secret token set with the webhook) and it comes from the founder's chat. Anything else is dropped without a
 * reply, so a stranger learns nothing, not even that a bot is here.
 *
 * Answers whether the update was accepted.
 */
export async function handleUpdate(
  context: BotContext,
  secretToken: string | undefined,
  update: unknown,
): Promise<boolean> {
  const { TELEGRAM_WEBHOOK_SECRET: secret, TELEGRAM_CHAT_ID: chatId } = context.env;
  if (!secret || !chatId || secretToken === undefined) return false;
  if (!(await sameSecret(secretToken, secret))) return false;
  const tapped = callbackUpdateSchema.safeParse(update);
  if (tapped.success) {
    const query = tapped.data.callback_query;
    if (String(query.message.chat.id) !== chatId) return false;
    await handleCallback(context, query);
    return true;
  }
  const parsed = updateSchema.safeParse(update);
  if (!parsed.success || String(parsed.data.message.chat.id) !== chatId) return false;

  const asked = parseCommand(parsed.data.message.text);
  const command = botCommands.find((candidate) => candidate.name === asked?.name);
  if (asked === undefined || command === undefined) {
    await sendMessage(context, helpText(botCommands));
    return true;
  }
  let reply: string;
  try {
    reply = await command.run({ ...context, commands: botCommands }, asked.args);
  } catch (error) {
    // The kind of error only: its message could quote a query or a value.
    console.error('bot command failed', {
      command: command.name,
      error: error instanceof Error ? error.name : 'unknown',
    });
    reply = `/${command.name} failed. The Worker log has the reason.`;
  }
  await sendMessage(context, reply);
  return true;
}
