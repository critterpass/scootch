import { taskCreateResponseSchema, taskCreateStartResponseSchema } from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { answersStatus, deepseekAnswers, perQuestion, timesOut, type Reply } from './ai-providers';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  writerAnswers,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const plainAnswer = {
  oneThing: 'Call the plumber about the leak under the sink.',
  oneThingDue: null,
  parked: ['Reply to Sam about Saturday'],
  dated: [],
  tinyNextStep: "Find the plumber's number and write it down.",
};

const toolOf = (body: Record<string, unknown>) =>
  (body['tools'] as { name: string }[] | undefined)?.[0]?.name ?? '';

/** The fast tier finding the text ordinary on any screen question, and writing the plain task. */
const fallbackClears: Reply = (request) => {
  if (toolOf(request.body) !== 'answer') {
    return writerAnswers([plainAnswer], answersStatus(503))(request);
  }
  return perQuestion({
    care: deepseekAnswers({ probabilities: ordinary }),
    preparation: deepseekAnswers({ probabilities: { no: 0.98, yes: 0.02 } }),
    misuse: deepseekAnswers({ probabilities: { genuine: 0.98, misuse: 0.02 } }),
  })(request);
};

const judges = {
  trusted: {
    jev: jevDecides(ordinary),
    deepseek: pickAnswers(
      [pickOutputOf(passFixture.response)],
      writerAnswers([linesOutputOf(passFixture.response)]),
    ),
  },
  fallbackOnly: { jev: jevDecides(answersStatus(529)), deepseek: fallbackClears },
  nobody: {
    jev: jevDecides(timesOut),
    deepseek: writerAnswers([plainAnswer], answersStatus(503)),
  },
};

/** One task call, single-shot or stage one, read through its own contract. */
async function ask(replies: { jev: Reply; deepseek: Reply }, staged: boolean, override = false) {
  const { response } = await createTask(replies, {
    ...passFixture.request,
    overrideSerious: override,
    ...(staged ? { staged: true } : {}),
  });
  expect(response.status).toBe(200);
  const schema = staged ? taskCreateStartResponseSchema : taskCreateResponseSchema;
  return schema.parse(await response.json());
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each([
  ['the single call', false],
  ['stage one', true],
])('who judged the text, on %s', (_, staged) => {
  it('names the trusted judge on a pass, with no reason', async () => {
    const answer = await ask(judges.trusted, staged);

    expect(answer).toMatchObject({ verdict: 'pass', answeredBy: 'jev' });
    expect(answer).not.toHaveProperty('reason');
  });

  it('answers serious and unscreened, by the fallback, when only the fallback cleared the text', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await ask(judges.fallbackOnly, staged)).toMatchObject({
      verdict: 'serious',
      answeredBy: 'fallback',
      reason: 'unscreened',
    });
  });

  it('answers serious and unscreened, by nobody, when no model judged the text', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await ask(judges.nobody, staged)).toMatchObject({
      verdict: 'serious',
      answeredBy: 'default',
      reason: 'unscreened',
    });
  });

  it('does not let "be funny" lift a text only the fallback cleared', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await ask(judges.fallbackOnly, staged, true)).toMatchObject({
      verdict: 'serious',
      answeredBy: 'fallback',
      reason: 'unscreened',
    });
  });
});
