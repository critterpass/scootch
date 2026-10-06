import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { decide, type DecideContext } from '../src/ai/decide';
import { screenInputQuestion, screenText, unscreenedResponse } from '../src/ai/screen-input';

import {
  answersStatus,
  connectionDrops,
  deepseekAnswers,
  jevAnswers,
  perQuestion,
  providers,
  timesOut,
  type Providers,
  type Reply,
} from './ai-providers';

const typed = 'mai nop bai tap toan';
const marked = 'mai nộp bài tập toán';
const calm = { pass: 0.97, serious: 0.02, crisis: 0.01 };
const danger = { pass: 0.3, serious: 0.1, crisis: 0.6 };
const heavy = { pass: 0.1, serious: 0.88, crisis: 0.02 };

let nextRoute = 0;

function contextFor(doubles: Providers): DecideContext {
  nextRoute += 1;
  return {
    env: { DB: env.DB, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
    route: `test.restored.${nextRoute}`,
    deviceHash: null,
    fetch: doubles.fetch,
  };
}

const toolOf = (body: Record<string, unknown>) =>
  (body['tools'] as { name: string }[] | undefined)?.[0]?.name ?? '';

/** The fast tier restoring marks as `restored`, and answering any screen question with `judge`. */
function fastTier(restored: string, judge: Reply = connectionDrops): Reply {
  return (request) =>
    toolOf(request.body) === 'restore_marks'
      ? Response.json({
          id: 'msg_recorded',
          type: 'message',
          role: 'assistant',
          model: request.body['model'],
          content: [
            {
              type: 'tool_use',
              id: 'call_recorded',
              name: 'restore_marks',
              input: { text: restored },
            },
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 180, output_tokens: 24 },
        })
      : judge(request);
}

/** Jev finding the text as typed calm, and the reading with marks whatever `restoredSays`. */
function jevReads(restoredSays: typeof calm, preparing = 0.02): Reply {
  return (request) =>
    (request.body['state'] === marked ? jevAnswers(restoredSays, preparing) : jevAnswers(calm))(
      request,
    );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Vietnamese typed without its marks', () => {
  it('is judged as typed and with marks restored, and the stricter verdict wins', async () => {
    const doubles = providers({ jev: jevReads(danger), deepseek: fastTier(marked) });

    const response = await screenText(contextFor(doubles), typed);

    expect(response).toMatchObject({ verdict: 'crisis', answeredBy: 'jev' });
    const states = doubles.sent.jev.map((sent) => sent['state']);
    expect(states.filter((state) => state === typed)).toHaveLength(3);
    expect(states.filter((state) => state === marked)).toHaveLength(2);
  });

  it('passes when both readings pass on Jev', async () => {
    const doubles = providers({ jev: jevReads(calm), deepseek: fastTier(marked) });

    expect(await screenText(contextFor(doubles), typed)).toMatchObject({
      verdict: 'pass',
      answeredBy: 'jev',
    });
  });

  it('is a crisis when only the preparation question sees one in the restored reading', async () => {
    const doubles = providers({ jev: jevReads(calm, 0.8), deepseek: fastTier(marked) });

    expect((await screenText(contextFor(doubles), typed)).verdict).toBe('crisis');
  });

  it.each([
    ['adds a word', fastTier('mai tôi nộp bài tập toán')],
    ['times out', timesOut],
    ['hands the note back without a mark', fastTier(typed)],
  ])('holds a note that passes as typed when the restoring %s', async (_, deepseek) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doubles = providers({ jev: jevAnswers(calm), deepseek });

    expect(await screenText(contextFor(doubles), typed)).toEqual(unscreenedResponse);
    expect(doubles.sent.jev.every((sent) => sent['state'] === typed)).toBe(true);
  });

  it.each([
    ['crisis', danger],
    ['serious', heavy],
  ])(
    'keeps a %s found in the note as typed when the restoring fails',
    async (verdict, typedSays) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const doubles = providers({ jev: jevAnswers(typedSays), deepseek: timesOut });

      expect(await screenText(contextFor(doubles), typed)).toMatchObject({
        verdict,
        answeredBy: 'jev',
      });
    },
  );

  it('asks for the marks once more when the first answer changed a letter, and reads the second', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let asked = 0;
    const deepseek: Reply = (request) => {
      asked += 1;
      return fastTier(asked === 1 ? 'mai nộp bài tập toan học' : marked)(request);
    };
    const doubles = providers({ jev: jevReads(danger), deepseek });

    expect(await screenText(contextFor(doubles), typed)).toMatchObject({
      verdict: 'crisis',
      answeredBy: 'jev',
    });
    expect(doubles.sent.deepseek).toHaveLength(2);
  });

  it('asks for the marks no more than twice', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doubles = providers({ jev: jevAnswers(calm), deepseek: fastTier('mai nop bai tap') });

    expect((await screenText(contextFor(doubles), typed)).reason).toBe('unscreened');
    expect(doubles.sent.deepseek).toHaveLength(2);
  });

  it('lets a short note with one such word pass as typed when nothing in it needed a mark', async () => {
    const note = 'Email Minh about lunch';
    const doubles = providers({ jev: jevAnswers(calm), deepseek: fastTier(note) });

    expect(await screenText(contextFor(doubles), note)).toMatchObject({
      verdict: 'pass',
      answeredBy: 'jev',
    });
    expect(doubles.sent.deepseek).toHaveLength(1);
  });

  it.each([
    ['marked Vietnamese', marked],
    ['English', 'Renew my passport before the trip to Japan'],
  ])('asks for no restoring of %s', async (_, text) => {
    const doubles = providers({ jev: jevAnswers(calm), deepseek: connectionDrops });

    expect((await screenText(contextFor(doubles), text)).verdict).toBe('pass');
    expect(doubles.sent.deepseek).toEqual([]);
    expect(doubles.sent.jev).toHaveLength(3);
  });

  it('is not cleared by the fallback alone, restored or not', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fallback = perQuestion({
      care: deepseekAnswers({ probabilities: calm }),
      preparation: deepseekAnswers({ probabilities: { no: 0.98, yes: 0.02 } }),
      misuse: deepseekAnswers({ probabilities: { genuine: 0.98, misuse: 0.02 } }),
    });
    const doubles = providers({ jev: answersStatus(529), deepseek: fastTier(marked, fallback) });

    expect(await screenText(contextFor(doubles), typed)).toEqual({
      verdict: 'serious',
      confidence: 0.97,
      lowConfidence: true,
      answeredBy: 'fallback',
      reason: 'unscreened',
    });
  });
});

describe('a second attempt at Jev inside its time budget', () => {
  const ask = (doubles: Providers) =>
    decide(contextFor(doubles), { ...screenInputQuestion, text: 'Renew my passport' });
  const fallback = deepseekAnswers({ probabilities: calm });

  /** Jev failing with `first`, then answering. */
  function failsOnce(first: Reply): Reply {
    let asked = 0;
    return (request) => {
      asked += 1;
      return asked === 1 ? first(request) : jevAnswers(calm)(request);
    };
  }

  it.each([
    ['the connection drops', connectionDrops],
    ['the server errors (500)', answersStatus(500)],
    ['the answer is unreadable', () => Response.json({ answers: {} })],
  ] as [string, Reply][])('asks Jev once more when %s, and Jev answers', async (_, first) => {
    const doubles = providers({ jev: failsOnce(first), deepseek: fallback });

    expect((await ask(doubles)).answeredBy).toBe('jev');
    expect(doubles.sent.jev).toHaveLength(2);
    expect(doubles.sent.deepseek).toEqual([]);
  });

  it.each([
    ['times out, the budget being spent', timesOut],
    ['is rate limited', answersStatus(429)],
    ['is overloaded', answersStatus(529)],
  ] as [string, Reply][])('goes straight to the fallback when Jev %s', async (_, first) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doubles = providers({ jev: failsOnce(first), deepseek: fallback });

    expect((await ask(doubles)).answeredBy).toBe('fallback');
    expect(doubles.sent.jev).toHaveLength(1);
  });

  it('falls back after the second attempt fails too', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doubles = providers({ jev: connectionDrops, deepseek: fallback });

    expect((await ask(doubles)).answeredBy).toBe('fallback');
    expect(doubles.sent.jev).toHaveLength(2);
  });
});
