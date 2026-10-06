import { taskCreateResponseSchema, type TaskCreateResponse } from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { wireErrorOf } from './support';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  toolCalls,
  writerAnswers,
  writerCalls,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const picked = pickOutputOf(passFixture.response);
const written = linesOutputOf(passFixture.response);

/** DeepSeek with the fast pick answering `picks` and the writer answering `writes`, in turn. */
function models(writes: readonly unknown[], picks: readonly unknown[] = [picked]) {
  return pickAnswers(picks, writerAnswers(writes));
}

async function bodyOf(response: Response): Promise<TaskCreateResponse> {
  expect(response.status).toBe(200);
  return taskCreateResponseSchema.parse(await response.json());
}

function promptOf(sent: Record<string, unknown> | undefined): string {
  return (sent?.['messages'] as { content: string }[] | undefined)?.[0]?.content ?? '';
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the fast pick of the task call', () => {
  it.each([
    ['a phrase the text never said', { heardAs: 'by the end of March', date: '2027-03-31' }],
    ['a phrase that is not a date', { heardAs: 'before the Japan trip', date: '2026-10-20' }],
    ['no phrase at all', { heardAs: '', date: '2026-10-09' }],
    ['a date that does not exist', { heardAs: 'oh and', date: '2026-02-30' }],
  ])('never makes a deadline from %s', async (_, heard) => {
    const { response } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: models(
        [written],
        [
          {
            ...picked,
            oneThingDue: heard,
            dated: [...picked.dated, { text: 'Renew the passport', ...heard }],
            parked: ['Reply to Sam about Saturday', 'Bathroom'],
          },
        ],
      ),
    });

    const body = await bodyOf(response);
    expect(body).toMatchObject({
      oneThing: { dueDate: null },
      // The real one, worked out in code from "due on Friday" and the request's own today.
      deadlines: [{ text: 'Council tax', dueDate: '2026-10-09' }],
    });
    // The thing itself is kept, without a date.
    expect(body.verdict === 'pass' ? body.parked : []).toContainEqual({
      text: 'Renew the passport',
    });
  });

  it('drops a task the text never named and refuses a one thing it never named', async () => {
    const invented = await createTask({
      jev: jevDecides(ordinary),
      deepseek: models(
        [written],
        [{ ...picked, parked: [...picked.parked, 'Book a holiday in Peru'] }],
      ),
    });
    expect(await bodyOf(invented.response)).toEqual(passFixture.response);

    const wrongThing = await createTask({
      jev: jevDecides(ordinary),
      deepseek: models([written], [{ ...picked, oneThing: 'Book a holiday in Peru.' }]),
    });
    expect(wrongThing.response.status).toBe(502);
    expect(await wireErrorOf(wrongThing.response)).toMatchObject({ code: 'voice_check_failed' });
    // Asked once more with the reason, and nothing was written about a task nobody named.
    const [, again] = toolCalls(wrongThing.doubles, 'pick_');
    expect(promptOf(again)).toContain('oneThing: not_in_text');
    expect(writerCalls(wrongThing.doubles)).toEqual([]);
  });

  it("keeps a short typed task in the user's own words when the rewording strays", async () => {
    const { response } = await createTask(
      {
        jev: jevDecides(ordinary),
        deepseek: models(
          [written],
          [{ ...picked, oneThing: 'Put one load of washing on.', dated: [] }],
        ),
      },
      { ...passFixture.request, text: 'do the laundry', source: 'typed' },
    );

    expect(await bodyOf(response)).toMatchObject({
      oneThing: { text: 'do the laundry', dueDate: null },
      parked: [],
      deadlines: [],
    });
  });
});
