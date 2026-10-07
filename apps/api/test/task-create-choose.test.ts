import { taskCreateStartResponseSchema } from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerDevice } from './support';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  writerAnswers,
  writerCalls,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const replies = (screen = ordinary) => ({
  jev: jevDecides(screen),
  deepseek: pickAnswers(
    [pickOutputOf(passFixture.response)],
    writerAnswers([linesOutputOf(passFixture.response)]),
  ),
});

/** Stage one for `text`, as a registered device that may or may not be able to show a pick. */
async function start(text: string, canChoose: boolean, screen = ordinary) {
  const device = await registerDevice();
  const call = await createTask(
    replies(screen),
    { ...passFixture.request, text, staged: true, ...(canChoose ? { canChoose } : {}) },
    { device },
  );
  expect(call.response.status).toBe(200);
  return { call, body: taskCreateStartResponseSchema.parse(JSON.parse(call.raw)) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a text that only asks Scootch to choose', () => {
  it('is answered with `choose` and nothing else, for a phone that can show a pick', async () => {
    const { call, body } = await start('Pick for me, please', true);
    expect(body.verdict).toBe('choose');
    // The verdict and who judged, and no task, monster or parked thing.
    expect(
      Object.keys(body).filter((key) => !['verdict', 'answeredBy', 'reason'].includes(key)),
    ).toEqual([]);
    expect(writerCalls(call.doubles)).toEqual([]);
  });

  it('is a task like any other for a phone that did not say it can', async () => {
    const { body } = await start('Pick for me, please', false);
    expect(body.verdict).toBe('pass');
  });

  it('never takes a note that names things to do as a request', async () => {
    const { body } = await start(passFixture.request.text, true);
    expect(body.verdict).toBe('pass');
  });

  it('gives way to the care screen: a crisis is a crisis whatever else the words ask', async () => {
    const { body } = await start('pick for me', true, { pass: 0, serious: 0.02, crisis: 0.98 });
    expect(body.verdict).toBe('crisis');
  });
});
