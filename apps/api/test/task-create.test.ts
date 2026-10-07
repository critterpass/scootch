import { env } from 'cloudflare:workers';
import { taskCreateResponseSchema, type TaskCreateResponse } from '@scootch/domain';
import { offlineLine, offlinePacks } from '@scootch/voice';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashDeviceToken } from '../src/device-auth';

import { answersStatus, connectionDrops, timesOut } from './ai-providers';
import { call, registerDevice } from './support';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  rewriteAnswers,
  whenRewriting,
  withoutSignature,
  writerAnswers,
  writerCalls,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.1, serious: 0.88, crisis: 0.02 };
const danger = { pass: 0.3, serious: 0.3, crisis: 0.4 };

const picked = pickOutputOf(passFixture.response);
const written = linesOutputOf(passFixture.response);
const bannedHatch = 'He has been on the Missed Call List under your sink again.';
const leaking = { ...written, hatch: bannedHatch };
const plainAnswer = {
  oneThing: 'Call the plumber about the leak under the sink.',
  oneThingDue: null,
  parked: ['Reply to Sam about Saturday'],
  dated: [],
  tinyNextStep: "Find the plumber's number and write it down.",
};

/** DeepSeek with the fast pick answering `picks` and the writer answering `writes`, in turn. */
function models(writes: readonly unknown[], picks: readonly unknown[] = [picked]) {
  return pickAnswers(picks, writerAnswers(writes));
}

/** The writer leaking a banned hatch line, and answering `again` when asked for it once more. */
function leaks(again: string) {
  return pickAnswers(
    [picked],
    rewriteAnswers([{ 'lines.hatch': again }], writerAnswers([leaking])),
  );
}

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

describe('POST /v1/task-create', () => {
  it('answers an ordinary ramble with everything the day needs: one pick, the name, then the pack in two halves', async () => {
    const { response, doubles, token } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: models([written]),
    });

    expect(await bodyOf(response)).toEqual(passFixture.response);
    expect(
      writerCalls(doubles).map((sent) => (sent['tools'] as { name: string }[])[0]?.name),
    ).toEqual(['write_name', 'write_pack_1', 'write_pack_2']);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=1; replaced=0');
    // The writer is given the one thing, never the text it came from.
    expect(JSON.stringify(writerCalls(doubles))).not.toMatch(/passport|Japan/);
    // One ledger row per model call: the screen's three questions, the pick, the three writer
    // calls and the four labels.
    const usage = await env.DB.prepare(
      'SELECT model FROM ai_usage WHERE route = ? AND device_hash = ?',
    )
      .bind('task.create', await hashDeviceToken(token))
      .all<{ model: string }>();
    expect(usage.results.map(({ model }) => model).sort()).toEqual([
      'deepseek-flash',
      ...Array<string>(3).fill('deepseek-v4-pro'),
      ...Array<string>(7).fill('jev-1.13.0'),
    ]);
  });

  it.each([false, true])(
    'answers a crisis with the verdict alone, whatever the override says (staged: %s)',
    async (staged) => {
      const { response, raw, doubles } = await createTask(
        { jev: jevDecides(danger), deepseek: models([written]) },
        { ...passFixture.request, overrideSerious: true, staged },
      );

      expect(response.status).toBe(200);
      // The verdict and who gave it, and nothing written.
      expect(JSON.parse(raw)).toEqual({ verdict: 'crisis', answeredBy: 'jev' });
      expect(writerCalls(doubles)).toEqual([]);
    },
  );

  it.each([false, true])(
    'answers a heavy task in plain words with no monster, joke or notification (staged: %s)',
    async (staged) => {
      const { response, raw, doubles } = await createTask(
        { jev: jevDecides(heavy), deepseek: models([plainAnswer]) },
        { ...passFixture.request, attitude: 'unhinged', energy: 'guess', staged },
      );

      const body = await bodyOf(response);
      expect(Object.keys(JSON.parse(raw) as object).sort()).toEqual(
        ['answeredBy', 'deadlines', 'energy', 'lines', 'oneThing', 'parked', 'verdict'].sort(),
      );
      const plain = offlinePacks.en.plain;
      expect(body).toEqual({
        verdict: 'serious',
        answeredBy: 'jev',
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
      // No model was shown the voice guide or asked for a monster.
      expect(writerCalls(doubles)).toHaveLength(1);
      expect(JSON.stringify(doubles.sent.deepseek)).not.toMatch(/monster|Unhinged|notifications/);
    },
  );

  it('lets "be funny" lift a serious verdict but not a text nobody screened', async () => {
    const overridden = await createTask(
      { jev: jevDecides(heavy), deepseek: models([written]) },
      { ...passFixture.request, overrideSerious: true },
    );
    expect(await bodyOf(overridden.response)).toMatchObject({
      verdict: 'pass',
      seriousOverridden: true,
    });

    const unscreened = await createTask(
      {
        jev: jevDecides(timesOut),
        deepseek: writerAnswers([plainAnswer], answersStatus(503)),
      },
      { ...passFixture.request, overrideSerious: true },
    );
    expect(await bodyOf(unscreened.response)).toMatchObject({ verdict: 'serious' });
  });

  it('asks again for only the line that failed the voice check, with the reason and not the line', async () => {
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: leaks(written.hatch),
    });

    expect(await bodyOf(response)).toEqual(passFixture.response);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=2; replaced=0');
    const [, second] = writerCalls(doubles);
    expect((second?.['tools'] as { name: string }[])[0]?.name).toBe('write_lines_again');
    const prompt = promptOf(second);
    expect(prompt).toContain('lines.hatch');
    expect(prompt).toContain('banned_word');
    expect(prompt).not.toContain(bannedHatch);
    expect(prompt).not.toMatch(/lines\.start|notifications\.|passport/);
  });

  it('replaces a line that fails twice with an offline line and keeps every other line', async () => {
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: leaks(bannedHatch),
    });

    const body = await bodyOf(response);
    expect(writerCalls(doubles)).toHaveLength(4);
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=2; replaced=1');
    expect(body).toEqual({
      ...passFixture.response,
      lines: { ...passFixture.response.lines, hatch: offlineLine('en', 'cheeky', 'hatch') },
    });
  });

  it('keeps the first answer, with an offline line, when the line cannot be asked for again', async () => {
    const { response } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: pickAnswers([picked], whenRewriting(answersStatus(400), writerAnswers([leaking]))),
    });

    expect(await bodyOf(response)).toEqual({
      ...passFixture.response,
      lines: { ...passFixture.response.lines, hatch: offlineLine('en', 'cheeky', 'hatch') },
    });
  });

  it.each([
    ['hands back nothing twice', writerAnswers([{}])],
    ['is not answering', answersStatus(503)],
    ['takes too long', timesOut],
  ])('answers with offline lines and a name made in code when the writer %s', async (_, writer) => {
    const { response, doubles } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: pickAnswers([picked], writer),
    });

    const body = await bodyOf(response);
    // The name and the two halves of the pack, each tried at most twice; nothing is asked again.
    expect(writerCalls(doubles).length).toBeLessThanOrEqual(6);
    expect(body).toMatchObject({
      verdict: 'pass',
      oneThing: passFixture.response.oneThing,
      labels: passFixture.response.labels,
      monster: { title: offlinePacks.en.monsterTitles[0] },
      lines: {
        hatch: offlineLine('en', 'cheeky', 'hatch'),
        working: [...offlinePacks.en.lines.cheeky.working],
      },
    });
    // The body the labels chose, and a title from the offline pool.
    expect(body.verdict === 'pass' ? body.monster.name : '').toMatch(/^Phone, \p{Lu}/u);
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

    // Every path that logs: an unscreened text, a failed check, a failed rewrite, a refused pick.
    await createTask({ jev: jevDecides(ordinary), deepseek: leaks(bannedHatch) });
    await createTask({ jev: jevDecides(connectionDrops), deepseek: timesOut });
    await createTask({ jev: jevDecides(ordinary), deepseek: pickAnswers([picked], timesOut) });
    await createTask({
      jev: jevDecides(ordinary),
      deepseek: models([written], [{ ...picked, oneThing: 'Book a holiday in Peru.' }]),
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
