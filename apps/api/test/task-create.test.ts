import { env } from 'cloudflare:workers';
import { taskCreateResponseSchema, type TaskCreateResponse } from '@scootch/domain';
import { offlineLine, offlinePacks } from '@scootch/voice';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashDeviceToken } from '../src/device-auth';

import { answersStatus, connectionDrops, timesOut } from './ai-providers';
import { call, registerDevice, wireErrorOf } from './support';
import {
  createTask,
  jevDecides,
  passFixture,
  writerAnswers,
  writerCalls,
  writerOutputOf,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.1, serious: 0.88, crisis: 0.02 };
const danger = { pass: 0.3, serious: 0.3, crisis: 0.4 };

const recorded = writerOutputOf(passFixture.response);
const bannedHatch = 'He has been on the Missed Call List under your sink again.';
const leaking = { ...recorded, lines: { ...recorded.lines, hatch: bannedHatch } };

async function bodyOf(response: Response): Promise<TaskCreateResponse> {
  expect(response.status).toBe(200);
  return taskCreateResponseSchema.parse(await response.json());
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /v1/task-create', () => {
  it('answers an ordinary ramble with everything the day needs, from one writer call', async () => {
    const { response, doubles, token } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([recorded]),
    });

    expect(await bodyOf(response)).toEqual(passFixture.response);
    expect(writerCalls(doubles)).toHaveLength(1);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=1; replaced=0');
    // One ledger row per model call: the screen, the writer and the four labels.
    const usage = await env.DB.prepare(
      'SELECT model FROM ai_usage WHERE route = ? AND device_hash = ?',
    )
      .bind('task.create', await hashDeviceToken(token))
      .all<{ model: string }>();
    expect(usage.results.map(({ model }) => model).sort()).toEqual([
      'deepseek-v4-pro',
      ...Array<string>(5).fill('jev-1.13.0'),
    ]);
  });

  it('answers a crisis with the verdict alone, whatever the override says', async () => {
    const { response, raw, doubles } = await createTask(
      { jev: jevDecides(danger), deepseek: writerAnswers([recorded]) },
      { ...passFixture.request, overrideSerious: true },
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(raw)).toEqual({ verdict: 'crisis' });
    expect(doubles.sent.deepseek).toEqual([]);
  });

  it('answers a heavy task in plain words with no monster, joke or notification', async () => {
    const { response, raw, doubles } = await createTask(
      {
        jev: jevDecides(heavy),
        deepseek: writerAnswers([
          {
            oneThing: 'Call the plumber about the leak under the sink.',
            oneThingDue: null,
            parked: ['Reply to Sam about Saturday'],
            dated: [],
            tinyNextStep: "Find the plumber's number and write it down.",
          },
        ]),
      },
      { ...passFixture.request, attitude: 'unhinged', energy: 'guess' },
    );

    const body = await bodyOf(response);
    expect(Object.keys(JSON.parse(raw) as object).sort()).toEqual(
      ['deadlines', 'energy', 'lines', 'oneThing', 'parked', 'verdict'].sort(),
    );
    const plain = offlinePacks.en.plain;
    expect(body).toEqual({
      verdict: 'serious',
      energy: 'low',
      oneThing: { text: 'Call the plumber about the leak under the sink.', dueDate: null },
      parked: [{ text: 'Reply to Sam about Saturday' }],
      deadlines: [],
      lines: {
        acknowledge: plain.acknowledge,
        working: [...plain.working],
        tinyNextStep: "Find the plumber's number and write it down.",
        done: plain.done,
        notFinished: plain.notFinished,
      },
    });
    // The writer was never shown the voice guide or asked for a monster.
    const [sent] = writerCalls(doubles);
    expect(JSON.stringify(sent)).not.toMatch(/monster|Unhinged|notifications/);
  });

  it('lets "be funny" lift a serious verdict but not a text nobody screened', async () => {
    const overridden = await createTask(
      { jev: jevDecides(heavy), deepseek: writerAnswers([recorded]) },
      { ...passFixture.request, overrideSerious: true },
    );
    expect(await bodyOf(overridden.response)).toMatchObject({
      verdict: 'pass',
      seriousOverridden: true,
    });

    const unscreened = await createTask(
      {
        jev: jevDecides(timesOut),
        deepseek: writerAnswers(
          [{ ...recorded, tinyNextStep: 'Find the number.' }],
          answersStatus(503),
        ),
      },
      { ...passFixture.request, overrideSerious: true },
    );
    expect(await bodyOf(unscreened.response)).toMatchObject({ verdict: 'serious' });
  });

  it('regenerates once when a line fails the voice check, and tells the writer where', async () => {
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([leaking, recorded]),
    });

    expect(await bodyOf(response)).toEqual(passFixture.response);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=2; replaced=0');
    const [, second] = writerCalls(doubles);
    const prompt = (second?.['messages'] as { content: string }[])[0]?.content ?? '';
    expect(prompt).toContain('lines.hatch: banned_word');
    expect(prompt).not.toContain(bannedHatch);
  });

  it('replaces a line that still fails after the retry with an offline line and keeps the rest', async () => {
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([leaking, leaking, recorded]),
    });

    const body = await bodyOf(response);
    expect(writerCalls(doubles)).toHaveLength(2);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=2; replaced=1');
    expect(body).toEqual({
      ...passFixture.response,
      lines: { ...passFixture.response.lines, hatch: offlineLine('en', 'cheeky', 'hatch') },
    });
  });

  it('keeps the first answer, with offline lines, when the regeneration cannot be had', async () => {
    let writes = 0;
    const { response } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: (request) => {
        writes += 1;
        return writes === 1 ? writerAnswers([leaking])(request) : answersStatus(400)(request);
      },
    });

    const body = await bodyOf(response);
    expect(body).toMatchObject({ lines: { hatch: offlineLine('en', 'cheeky', 'hatch') } });
  });

  it.each([
    ['a phrase the text never said', { heardAs: 'by the end of March', date: '2027-03-31' }],
    ['a phrase that is not a date', { heardAs: 'before the Japan trip', date: '2026-10-20' }],
    ['no phrase at all', { heardAs: '', date: '2026-10-09' }],
    ['a date that does not exist', { heardAs: 'oh and', date: '2026-02-30' }],
  ])('never makes a deadline from %s', async (_, heard) => {
    const { response } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([
        {
          ...recorded,
          oneThingDue: heard,
          dated: [
            ...recorded.dated,
            { text: 'Renew the passport', line: 'I heard a deadline: the passport.', ...heard },
          ],
          parked: ['Reply to Sam about Saturday', 'Bathroom'],
        },
      ]),
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
      deepseek: writerAnswers([
        { ...recorded, parked: [...recorded.parked, 'Book a holiday in Peru'] },
      ]),
    });
    expect(await bodyOf(invented.response)).toEqual(passFixture.response);

    const wrongThing = await createTask({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...recorded, oneThing: 'Book a holiday in Peru.' }]),
    });
    expect(wrongThing.response.status).toBe(502);
    expect(await wireErrorOf(wrongThing.response)).toMatchObject({ code: 'voice_check_failed' });
  });

  it("keeps a short typed task in the user's own words when the rewording strays", async () => {
    const { response } = await createTask(
      {
        jev: jevDecides(ordinary),
        deepseek: writerAnswers([
          { ...recorded, oneThing: 'Put one load of washing on.', dated: [] },
        ]),
      },
      { ...passFixture.request, text: 'do the laundry', source: 'typed' },
    );

    expect(await bodyOf(response)).toMatchObject({
      oneThing: { text: 'do the laundry', dueDate: null },
      parked: [],
      deadlines: [],
    });
  });

  it('never echoes the text in an error and never logs or stores it', async () => {
    const logged: unknown[][] = [];
    for (const level of ['log', 'info', 'warn', 'error'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logged.push(args));
    }
    const text = passFixture.request.text;

    const token = await registerDevice();
    const refused = await call('/v1/task-create', {
      method: 'POST',
      token,
      body: { ...passFixture.request, attitude: 'rude' },
    });
    expect(refused.status).toBe(400);
    expect(await refused.clone().text()).not.toContain('plumber');

    // Every path that logs: an unscreened text, a failed check, a failed retry, a refused answer.
    await createTask({ jev: jevDecides(ordinary), deepseek: writerAnswers([leaking, leaking]) });
    await createTask({ jev: jevDecides(connectionDrops), deepseek: timesOut });
    await createTask({
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...recorded, oneThing: 'Book a holiday in Peru.' }]),
    });

    const logs = JSON.stringify(logged);
    expect(logged.length).toBeGreaterThan(0);
    for (const secret of [text, 'plumber', 'passport', 'Missed Call', 'Peru']) {
      expect(logs).not.toContain(secret);
    }
    const usage = await env.DB.prepare('SELECT * FROM ai_usage').all();
    expect(JSON.stringify(usage.results)).not.toContain('plumber');
  });
});
