import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { deepseekAnswers, providers, timesOut, type Reply } from './ai-providers';
import { ask, botEnv } from './bot-support';

/** Jev answering the status check's yes-or-no question, in the shape recorded from the endpoint. */
const jevSaysYes: Reply = () =>
  Response.json({
    model: 'jev-1.13.0',
    answers: {
      answer: {
        type: 'choice',
        choice: 'yes',
        confidence: 0.99,
        probabilities: { yes: 0.99, no: 0.01 },
      },
    },
    usage: { input_tokens: 120, output_tokens: 8 },
  });

describe('/status', () => {
  it('reports the environment, commit, database, secret names and one call to each model', async () => {
    const models = providers({ jev: jevSaysYes, deepseek: deepseekAnswers({ ok: true }) });

    const reply = await ask('/status', { providers: models.fetch });

    expect(reply).toBe(
      [
        '[dev] Environment: dev',
        'Commit: abc1234',
        'Database: ok',
        'DEEPSEEK_API_KEY: set',
        'TYPESAFE_API_KEY: set',
        'Decision model: ok (jev-1.13.0)',
        'Generation model: ok (deepseek-flash)',
      ].join('\n'),
    );
    expect(reply).not.toMatch(/test-deepseek-key|test-typesafe-key|test-bot-token/);
    expect(models.sent.jev).toHaveLength(1);
    expect(models.sent.deepseek).toHaveLength(1);
    // The check calls cost money too, so they are in the ledger under their own route.
    const ledger = await env.DB.prepare(
      "SELECT model FROM ai_usage WHERE route = 'ops.status' ORDER BY model",
    ).all<{ model: string }>();
    expect(ledger.results.map((row) => row.model)).toEqual(['deepseek-flash', 'jev-1.13.0']);
  });

  it('says which secret is missing and which model is down, and why', async () => {
    const models = providers({ jev: jevSaysYes, deepseek: timesOut });

    const reply = await ask('/status', {
      env: botEnv({ ENVIRONMENT: 'prd', TYPESAFE_API_KEY: '' }),
      providers: models.fetch,
    });

    expect(reply).toBe(
      [
        'Environment: prd',
        'Commit: abc1234',
        'Database: ok',
        'DEEPSEEK_API_KEY: set',
        'TYPESAFE_API_KEY: missing',
        'Decision model: down (missing_key)',
        'Generation model: down (model_timeout)',
      ].join('\n'),
    );
    expect(models.sent.jev).toHaveLength(0);
  });
});
