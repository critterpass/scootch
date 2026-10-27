import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { claudeModel } from '../src/ai/claude';
import { hearingTasksResponseSchema } from '../src/contracts';
import { hashDeviceToken } from '../src/device-auth';

import {
  answersStatus,
  claudeAnswers,
  claudeRecorded,
  claudeStops,
  connectionDrops,
  outputKeysIn,
  providers,
  type Reply,
} from './ai-providers';
import {
  oneTaskEnglish,
  oneTaskVietnamese,
  threeTasksEnglish,
} from './fixtures/claude/hearing-tasks';
import { as, call, registerDevice, wireErrorOf } from './support';

/** Asks for one utterance as a new device, with Claude answering `claude`. */
async function hearAs(claude: Reply, text: string) {
  const doubles = providers({ jev: connectionDrops, claude });
  vi.stubGlobal('fetch', doubles.fetch);
  const token = await registerDevice();
  const response = await as(
    { token },
    'POST',
    '/v1/hearing/tasks',
    { text },
    {
      ...env,
      ANTHROPIC_API_KEY: 'claude-test-key',
    },
  );
  return { token, response, sent: doubles.sent.claude };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /v1/hearing/tasks', () => {
  it('needs a registered device', async () => {
    const doubles = providers({
      jev: connectionDrops,
      claude: claudeRecorded(oneTaskEnglish.response),
    });
    vi.stubGlobal('fetch', doubles.fetch);

    const response = await call('/v1/hearing/tasks', {
      method: 'POST',
      body: { text: oneTaskEnglish.said },
    });

    expect(response.status).toBe(401);
    expect(doubles.sent.claude).toHaveLength(0);
  });

  it.each([
    [
      'one long task said with filler and pauses stays one task',
      oneTaskEnglish,
      [{ text: 'Evaluation for Gemini replacement', short: 'Gemini replacement eval' }],
    ],
    [
      'separate things said one after another are separate tasks',
      threeTasksEnglish,
      [
        { text: 'call the dentist', short: 'Call dentist' },
        { text: 'pay the electricity bill', short: 'Pay electricity bill' },
        { text: 'pick up the kids at three', short: 'Pick up kids' },
      ],
    ],
    [
      'Vietnamese is heard the same way',
      oneTaskVietnamese,
      [{ text: 'làm cái đánh giá cho việc thay Gemini', short: 'Đánh giá thay Gemini' }],
    ],
  ])('%s', async (_, recording, tasks) => {
    const { token, response, sent } = await hearAs(
      claudeRecorded(recording.response),
      recording.said,
    );

    expect(response.status).toBe(200);
    expect(hearingTasksResponseSchema.parse(await response.json())).toEqual({ tasks });

    // The utterance goes as data, on the fast tier, for the two fields the phone reads.
    expect(sent).toHaveLength(1);
    const body = sent[0]!;
    expect(body['model']).toBe(claudeModel);
    expect(body['output_config']).toMatchObject({ effort: 'low' });
    expect(outputKeysIn(body)).toEqual(['tasks']);
    expect(JSON.stringify(body['messages'])).toContain(
      JSON.stringify(`<said>\n${recording.said}\n</said>`).slice(1, -1),
    );

    const row = await env.DB.prepare(
      'SELECT model, input_tokens, output_tokens FROM ai_usage WHERE route = ? AND device_hash = ?',
    )
      .bind('hearing.tasks', await hashDeviceToken(token))
      .first();
    expect(row).toEqual({
      model: recording.response.model,
      input_tokens: recording.response.usage.input_tokens,
      output_tokens: recording.response.usage.output_tokens,
    });
  });

  it('leaves out blank tasks and a chalk name too long to be one', async () => {
    const { response } = await hearAs(
      claudeAnswers(
        {
          tasks: [
            { text: '  ', short: 'Nothing' },
            { text: 'Evaluation for Gemini replacement', short: 'x'.repeat(81) },
          ],
        },
        oneTaskEnglish.response,
      ),
      oneTaskEnglish.said,
    );

    expect(await response.json()).toEqual({
      tasks: [{ text: 'Evaluation for Gemini replacement', short: null }],
    });
  });

  it.each([
    ['refuses', claudeStops('refusal')],
    ['is busy', answersStatus(529)],
    ['answers out of shape', claudeAnswers({ heard: 'one task' }, oneTaskEnglish.response)],
  ])('fails as model_unavailable when Claude %s, and never logs the words', async (_, claude) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { response } = await hearAs(claude, oneTaskEnglish.said);

    expect(response.status).toBe(503);
    expect((await wireErrorOf(response)).code).toBe('model_unavailable');
    expect(JSON.stringify(errors.mock.calls)).not.toContain('Gemini');
  });

  it('turns away a body with no words', async () => {
    const { response, sent } = await hearAs(claudeRecorded(oneTaskEnglish.response), '');

    expect(response.status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});
