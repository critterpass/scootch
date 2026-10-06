import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { decide, type DecideContext } from '../src/ai/decide';
import { jevModel } from '../src/ai/jev';
import { screenInputQuestion } from '../src/ai/screen-input';

import {
  answersStatus,
  connectionDrops,
  deepseekAnswers,
  jevAnswers,
  providers,
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
    env: { DB: env.DB, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
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
      deepseek: connectionDrops,
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
    expect(doubles.sent.deepseek).toEqual([]);
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
        deepseek: deepseekAnswers({ probabilities: { pass: 0.02, serious: 0.08, crisis: 0.9 } }),
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
        model: 'deepseek-flash',
      });
      expect(doubles.sent.jev).toHaveLength(asked);
      expect(doubles.sent.deepseek[0]).toMatchObject({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        tool_choice: { type: 'tool', name: 'answer' },
      });
      expect(await ledgerRows(context.route)).toEqual([
        { model: 'deepseek-flash', input_tokens: 612, output_tokens: 31 },
      ]);
    },
  );

  it('falls back without calling Jev when its key is not set', async () => {
    const doubles = providers({
      jev: jevAnswers({ pass: 1, serious: 0, crisis: 0 }),
      deepseek: deepseekAnswers({ probabilities: { pass: 0.1, serious: 0.9, crisis: 0 } }),
    });
    const context = contextFor(doubles);

    const decision = await decide(
      { ...context, env: { DB: env.DB, DEEPSEEK_API_KEY: 'deepseek-test-key' } },
      { ...screenInputQuestion, text },
    );

    expect(decision.answeredBy).toBe('fallback');
    expect(decision.answer.choice).toBe('serious');
    expect(doubles.sent.jev).toEqual([]);
  });

  it('scales fallback probabilities that do not add up to one', async () => {
    const doubles = providers({
      jev: timesOut,
      deepseek: deepseekAnswers({ probabilities: { pass: 0.9, serious: 0.3, crisis: 0.3 } }),
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
      deepseek: (request) => {
        calls += 1;
        return calls === 1
          ? answersStatus(503)(request)
          : deepseekAnswers({ probabilities: { pass: 1, serious: 0, crisis: 0 } })(request);
      },
    });

    const decision = await ask(contextFor(doubles));

    expect(decision.answeredBy).toBe('fallback');
    expect(doubles.sent.deepseek).toHaveLength(2);
  });

  it.each([
    ['is busy twice', answersStatus(503), 'model_unavailable', 2],
    ['times out', timesOut, 'model_timeout', 1],
    [
      'answers outside the schema twice',
      deepseekAnswers({ probabilities: { pass: 'yes' } }),
      'model_unavailable',
      2,
    ],
  ] as const)(
    'when Jev times out and the fast tier %s, it fails as %s and the ledger stays empty',
    async (_, deepseek, code, attempts) => {
      const doubles = providers({ jev: timesOut, deepseek });
      const context = contextFor(doubles);

      await expect(ask(context)).rejects.toMatchObject({ name: 'ApiError', code });

      expect(doubles.sent.deepseek).toHaveLength(attempts);
      expect(await ledgerRows(context.route)).toEqual([]);
    },
  );
});
