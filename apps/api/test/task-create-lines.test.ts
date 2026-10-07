import { taskCreateResponseSchema, type TaskCreateResponse } from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  rewriteAnswers,
  withoutSignature,
  writerAnswers,
  writerCalls,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const picked = pickOutputOf(passFixture.response);
const written = linesOutputOf(passFixture.response);

async function bodyOf(response: Response): Promise<TaskCreateResponse> {
  expect(response.status).toBe(200);
  return withoutSignature(taskCreateResponseSchema.parse(await response.json()));
}

function promptOf(sent: Record<string, unknown> | undefined): string {
  return (sent?.['messages'] as { content: string }[] | undefined)?.[0]?.content ?? '';
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the lines of a task call', () => {
  it('takes three working lines as a whole answer, without asking for a fourth', async () => {
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: pickAnswers(
        [picked],
        writerAnswers([{ ...written, working: written.working.slice(0, 3) }]),
      ),
    });

    const body = await bodyOf(response);
    expect(body.verdict === 'pass' ? body.lines.working : []).toEqual(written.working.slice(0, 3));
    expect(writerCalls(doubles)).toHaveLength(3);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=1; replaced=0');
  });

  it('asks for the card and the hatch line again with a new name, so they name the same monster', async () => {
    const { name, title, flavourText, hatch } = written;
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: pickAnswers(
        [picked],
        rewriteAnswers(
          [
            {
              'monster.name': name,
              'monster.title': title,
              'monster.flavourText': flavourText,
              'lines.hatch': hatch,
            },
          ],
          writerAnswers([
            {
              ...written,
              name: 'Gerald, Head of the Dripping Sink',
              hatch: 'Gerald has been drumming under your sink and selling no tickets.',
            },
          ]),
        ),
      ),
    });

    expect(await bodyOf(response)).toEqual(passFixture.response);
    const prompt = promptOf(writerCalls(doubles)[1]);
    for (const slot of ['monster.name', 'monster.title', 'monster.flavourText', 'lines.hatch']) {
      expect(prompt).toContain(slot);
    }
    expect(prompt).not.toContain('Gerald');
  });

  it('brings the three bites with their minutes, and none when one of them is not kept', async () => {
    const bites = ["Find the plumber's number.", 'Say which tap drips.', 'Ask for Thursday.'];
    const ask = async (minutes: number[]) => {
      const { response } = await createTask({
        jev: jevDecides(ordinary),
        deepseek: pickAnswers(
          [picked],
          writerAnswers([{ ...written, bites, biteMinutes: minutes }]),
        ),
      });
      const body = await bodyOf(response);
      return body.verdict === 'pass' ? body.lines.bites : null;
    };

    expect(await ask([2, 1, 3])).toEqual([
      { text: bites[0], minutes: 2 },
      { text: bites[1], minutes: 1 },
      { text: bites[2], minutes: 3 },
    ]);
    expect(await ask([2, 1, 9])).toBeUndefined();
  });
});
