import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { decide, type DecideContext } from '../src/ai/decide';
import { jevModel } from '../src/ai/jev';
import { screenInputQuestion } from '../src/ai/screen-input';

import {
  answersStatus,
  claudeAnswers,
  claudeRecorded,
  claudeStops,
  connectionDrops,
  jevAnswers,
  providers,
  recordedClaude,
  timesOut,
  type Providers,
  type Reply,
} from './ai-providers';

const text = 'Renew my passport before the trip';

let nextRoute = 0;

/** A context with both keys set and a ledger route of its own, so each test reads only its rows. */
function contextFor(doubles: Providers): DecideContext {
  nextRoute += 1;
  return {
    env: { DB: env.DB, TYPESAFE_API_KEY: 'jev-test-key', ANTHROPIC_API_KEY: 'claude-test-key' },
    route: `test.decide.${nextRoute}`,
    deviceHash: null,
    fetch: doubles.fetch,
  };
}

async function ledgerRows(route: string): Promise<Record<string, unknown>[]> {
  const rows = await env.DB.prepare(
    'SELECT model, input_tokens, output_tokens FROM ai_usage WHERE route = ?',
  )
    .bind(route)
    .all();
  return rows.results;
}

const ask = (context: DecideContext) => decide(context, { ...screenInputQuestion, text });

describe('decide', () => {
  it('asks Jev with only the text and the question, on the pinned version', async () => {
    const doubles = providers({
      jev: jevAnswers({ pass: 0.97, serious: 0.02, crisis: 0.01 }),
      claude: connectionDrops,
    });
    const context = contextFor(doubles);

    const decision = await ask(context);

    expect(decision).toEqual({
      answer: {
        choice: 'pass',
        probabilities: { pass: 0.97, serious: 0.02, crisis: 0.01 },
        confidence: 0.98,
      },
      answeredBy: 'jev',
      model: jevModel,
    });
    expect(doubles.sent.jev).toEqual([
      {
        model: 'jev-1.13.0',
        state: text,
        questions: { answer: { type: 'choice', ...screenInputQuestion } },
      },
    ]);
    expect(doubles.sent.claude).toEqual([]);
    expect(await ledgerRows(context.route)).toEqual([
      { model: 'jev-1.13.0', input_tokens: 498, output_tokens: 40 },
    ]);
  });

  // The last column is how often Jev is asked: a failure that came back quickly and says nothing
  // about the next attempt is tried once more inside the same time budget.
  const jevFailures: [string, Reply, number][] = [
    ['times out', timesOut, 1],
    ['is rate limited (429)', answersStatus(429), 1],
    ['is overloaded (529)', answersStatus(529), 1],
    ['cannot be reached', connectionDrops, 2],
    ['answers something unreadable', () => Response.json({ answers: {} }), 2],
  ];

  it.each(jevFailures)(
    'when Jev %s, the fast tier answers in the same shape and the ledger names it',
    async (_, jev, asked) => {
      const doubles = providers({
        jev,
        claude: claudeAnswers({ probabilities: { pass: 0.02, serious: 0.08, crisis: 0.9 } }),
      });
      const context = contextFor(doubles);

      const decision = await ask(context);

      expect(decision).toEqual({
        answer: {
          choice: 'crisis',
          probabilities: { pass: 0.02, serious: 0.08, crisis: 0.9 },
          confidence: 0.9,
        },
        answeredBy: 'fallback',
        model: 'claude-haiku-5-5',
      });
      expect(doubles.sent.jev).toHaveLength(asked);
      expect(doubles.sent.claude[0]).toMatchObject({
        model: 'claude-haiku-5-5',
        output_config: { effort: 'low', format: { type: 'json_schema' } },
      });
      expect(await ledgerRows(context.route)).toEqual([
        { model: 'claude-haiku-5-5', input_tokens: 891, output_tokens: 36 },
      ]);
    },
  );

  it('asks the fast tier for structured output, with no sampling, thinking budget, tool or prefill, and reads its recorded answer', async () => {
    const doubles = providers({ jev: timesOut, claude: claudeRecorded(recordedClaude.decide) });

    expect((await ask(contextFor(doubles))).answer).toEqual({
      choice: 'pass',
      probabilities: { pass: 0.97, serious: 0.02, crisis: 0.01 },
      confidence: 0.97,
    });

    const [sent] = doubles.sent.claude;
    expect(Object.keys(sent ?? {}).sort()).toEqual([
      'max_tokens',
      'messages',
      'model',
      'output_config',
      'system',
    ]);
    const messages = sent?.['messages'] as { role: string; content: unknown }[];
    expect(messages.map((m) => m.role)).toEqual(['user']);
    expect(typeof messages[0]?.content).toBe('string');
    const { schema } = (sent?.['output_config'] as { format: { schema: Record<string, unknown> } })
      .format;
    expect(schema).toMatchObject({
      type: 'object',
      required: ['probabilities'],
      additionalProperties: false,
      properties: {
        probabilities: {
          type: 'object',
          required: ['pass', 'serious', 'crisis'],
          additionalProperties: false,
        },
      },
    });
  });

  it.each([
    ['refuses', claudeStops('refusal'), 'stop_refusal'],
    ['runs out of tokens', claudeStops('max_tokens'), 'stop_max_tokens'],
  ] as const)(
    'when Jev times out and the fast tier %s, it fails once, unread, and the ledger stays empty',
    async (_, claude, reason) => {
      const doubles = providers({ jev: timesOut, claude });
      const context = contextFor(doubles);

      await expect(ask(context)).rejects.toMatchObject({
        name: 'ApiError',
        code: 'model_unavailable',
        detail: { reason },
      });

      expect(doubles.sent.claude).toHaveLength(1);
      expect(await ledgerRows(context.route)).toEqual([]);
    },
  );

  it('falls back without calling Jev when its key is not set', async () => {
    const doubles = providers({
      jev: jevAnswers({ pass: 1, serious: 0, crisis: 0 }),
      claude: claudeAnswers({ probabilities: { pass: 0.1, serious: 0.9, crisis: 0 } }),
    });
    const context = contextFor(doubles);

    const decision = await decide(
      { ...context, env: { DB: env.DB, ANTHROPIC_API_KEY: 'claude-test-key' } },
      { ...screenInputQuestion, text },
    );

    expect(decision.answeredBy).toBe('fallback');
    expect(decision.answer.choice).toBe('serious');
    expect(doubles.sent.jev).toEqual([]);
  });

  it('scales fallback probabilities that do not add up to one', async () => {
    const doubles = providers({
      jev: timesOut,
      claude: claudeAnswers({ probabilities: { pass: 0.9, serious: 0.3, crisis: 0.3 } }),
    });

    const { answer } = await ask(contextFor(doubles));

    expect(answer.choice).toBe('pass');
    expect(answer.probabilities.pass).toBeCloseTo(0.6);
    expect(answer.probabilities.crisis).toBeCloseTo(0.2);
    expect(answer.confidence).toBeCloseTo(0.6);
  });

  it('retries the fast tier once when it is busy', async () => {
    let calls = 0;
    const doubles = providers({
      jev: timesOut,
      claude: (request) => {
        calls += 1;
        return calls === 1
          ? answersStatus(503)(request)
          : claudeAnswers({ probabilities: { pass: 1, serious: 0, crisis: 0 } })(request);
      },
    });

    const decision = await ask(contextFor(doubles));

    expect(decision.answeredBy).toBe('fallback');
    expect(doubles.sent.claude).toHaveLength(2);
  });

  it.each([
    ['is busy twice', answersStatus(503), 'model_unavailable', 2],
    ['times out', timesOut, 'model_timeout', 1],
    [
      'answers outside the schema twice',
      claudeAnswers({ probabilities: { pass: 'yes' } }),
      'model_unavailable',
      2,
    ],
  ] as const)(
    'when Jev times out and the fast tier %s, it fails as %s and the ledger stays empty',
    async (_, claude, code, attempts) => {
      const doubles = providers({ jev: timesOut, claude });
      const context = contextFor(doubles);

      await expect(ask(context)).rejects.toMatchObject({ name: 'ApiError', code });

      expect(doubles.sent.claude).toHaveLength(attempts);
      expect(await ledgerRows(context.route)).toEqual([]);
    },
  );
});
