import { z } from 'zod';

import { generate } from '../../ai/deepseek';
import { askJev, JevUnavailable } from '../../ai/jev';
import { ApiError } from '../../errors';
import { recordAiUsage } from '../../ledger';
import type { BotCommand, CommandContext } from '../command';

/** The ledger route for the bot's own check calls, so they show up in `/costs` as what they are. */
const statusRoute = 'ops.status';
const generationCheckTimeoutMs = 4_000;
const modelSecrets = ['DEEPSEEK_API_KEY', 'TYPESAFE_API_KEY'] as const;

type Answered = { model: string; inputTokens: number; outputTokens: number };

function failureReason(error: unknown): string {
  if (error instanceof JevUnavailable) return error.reason;
  if (error instanceof ApiError) {
    const reason = error.detail?.['reason'];
    return typeof reason === 'string' ? reason : error.code;
  }
  return 'error';
}

/** One cheap call to a provider. The answer is `ok` and the model's name, or `down` and why. */
async function check(context: CommandContext, call: () => Promise<Answered>): Promise<string> {
  let answered: Answered;
  try {
    answered = await call();
  } catch (error) {
    return `down (${failureReason(error)})`;
  }
  try {
    await recordAiUsage(context.env.DB, { ...answered, route: statusRoute, deviceHash: null });
  } catch {
    console.error('ai usage not recorded', { route: statusRoute, model: answered.model });
  }
  return `ok (${answered.model})`;
}

async function databaseStatus(db: D1Database): Promise<string> {
  try {
    await db.prepare('SELECT 1').first();
    return 'ok';
  } catch {
    return 'down';
  }
}

export const statusCommand: BotCommand = {
  name: 'status',
  usage: '/status',
  summary: 'environment, commit, database, model secrets and one check call to each model',
  run: async (context) => {
    const { env } = context;
    const boundary = context.fetch ? { fetch: context.fetch } : {};
    const [database, decision, generation] = await Promise.all([
      databaseStatus(env.DB),
      check(context, () =>
        askJev({ apiKey: env.TYPESAFE_API_KEY, ...boundary }, 'ping', {
          instructions: 'Is the text the single word "ping"?',
          criteria: { yes: 'The text is the word ping.', no: 'The text is anything else.' },
        }),
      ),
      check(context, () =>
        generate(
          { apiKey: env.DEEPSEEK_API_KEY, ...boundary },
          {
            tier: 'fast',
            system: 'You are a health check. Call the tool with ok set to true.',
            prompt: 'ping',
            tool: { name: 'answer', description: 'Report that you are answering.' },
            schema: z.object({ ok: z.boolean() }),
            maxTokens: 20,
            timeoutMs: generationCheckTimeoutMs,
          },
        ),
      ),
    ]);
    return [
      `Environment: ${env.ENVIRONMENT}`,
      `Commit: ${env.COMMIT_SHA}`,
      `Database: ${database}`,
      ...modelSecrets.map((name) => `${name}: ${env[name] ? 'set' : 'missing'}`),
      `Decision model: ${decision}`,
      `Generation model: ${generation}`,
    ].join('\n');
  },
};
