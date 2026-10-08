import {
  cuePlaceholder,
  taskCreatePackResponseSchema,
  taskCreateResponseSchema,
  taskCreateStartResponseSchema,
  type InTheWay,
  type TaskCreatePass,
  type TaskCreateRequest,
  type TaskCreateStartPass,
} from '@scootch/domain';
import { checkCueLine, checkTaskCopy, helperLine, offlinePacks } from '@scootch/voice';
import { afterEach, describe, expect, it, vi } from 'vitest';

import passVi from '../../../packages/voice/fixtures/task.create.vi.json';

import type { Providers } from './ai-providers';
import { registerDevice } from './support';
import {
  createTask,
  jevDecides,
  linesOutputOf,
  passFixture,
  pickAnswers,
  pickOutputOf,
  rewriteAnswers,
  toolCalls,
  writerAnswers,
  writerCalls,
} from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.1, serious: 0.88, crisis: 0.02 };

type Recorded = { request: TaskCreateRequest; response: TaskCreatePass };
const recorded: Readonly<Record<'en' | 'vi', Recorded>> = {
  en: passFixture,
  vi: passVi as Recorded,
};

/** The models answering as they were recorded for one language's ramble. */
function models({ response }: Recorded, written: unknown = linesOutputOf(response)) {
  return pickAnswers([pickOutputOf(response)], writerAnswers([written]));
}

/** The opening words of what the writer is told about each answer, in each language. */
const told: Readonly<Record<'en' | 'vi', Readonly<Record<InTheWay, RegExp>>>> = {
  en: {
    scary: /this thing scares them/,
    confusing: /this thing is confusing/,
    boring: /this thing is boring/,
    too_big: /What is in the way/,
  },
  vi: {
    scary: /việc này làm họ sợ/,
    confusing: /việc này rối quá/,
    boring: /việc này chán/,
    too_big: /Điều đang cản đường/,
  },
};
const firstStep: Readonly<Record<'en' | 'vi', Readonly<Record<string, RegExp>>>> = {
  en: { scary: /only opening it/, confusing: /writing down the one question/ },
  vi: { scary: /chỉ là mở nó ra/, confusing: /ghi ra đúng một câu hỏi/ },
};

function systemOf(sent: Record<string, unknown>): string {
  const system = sent['system'];
  return typeof system === 'string' ? system : '';
}

function toolOf(sent: Record<string, unknown>): string {
  return (sent['tools'] as { name: string }[])[0]?.name ?? '';
}

function everythingSent(doubles: Providers): string {
  return JSON.stringify([doubles.sent.deepseek, doubles.sent.jev]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('what is in the way, in the task call', () => {
  it.each(
    (['en', 'vi'] as const).flatMap((language) =>
      (['scary', 'confusing', 'boring'] as const).map((answer) => [language, answer] as const),
    ),
  )('tells the %s writer the thing is %s, and never the pick', async (language, inTheWay) => {
    const fixture = recorded[language];
    const { response, doubles } = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(fixture) },
      { ...fixture.request, inTheWay },
    );

    expect(response.status).toBe(200);
    const writers = writerCalls(doubles);
    expect(writers.map(toolOf)).toEqual(['write_name', 'write_pack_1', 'write_pack_2']);
    for (const sent of writers) expect(systemOf(sent)).toMatch(told[language][inTheWay]);
    // Only the call that writes the steps is told how the first one goes.
    const step = firstStep[language][inTheWay];
    if (step !== undefined) {
      expect(writers.filter((sent) => step.test(systemOf(sent))).map(toolOf)).toEqual([
        'write_pack_1',
      ]);
    }
    // The pick starts before the screen has answered, so it is told nothing.
    for (const sent of toolCalls(doubles, 'pick_')) {
      expect(JSON.stringify(sent)).not.toMatch(told[language][inTheWay]);
    }
  });

  it.each(['en', 'vi'] as const)(
    'answers "too big" with the shrink the app already offers, and tells the %s writer nothing',
    async (language) => {
      const fixture = recorded[language];
      const { response, doubles } = await createTask(
        { jev: jevDecides(ordinary), deepseek: models(fixture) },
        { ...fixture.request, inTheWay: 'too_big' },
      );

      const body = taskCreateResponseSchema.parse(await response.json());
      // The size label said it fits; the person said it does not.
      expect(fixture.response.labels.fitsTenMinutes).toBe(true);
      expect(body).toMatchObject({ verdict: 'pass', labels: { fitsTenMinutes: false } });
      for (const sent of writerCalls(doubles)) {
        expect(systemOf(sent)).not.toMatch(told[language].too_big);
      }
    },
  );

  it('carries it from stage one to the later stages in the continuation, and nowhere else', async () => {
    const device = await registerDevice();
    const first = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { ...passFixture.request, staged: true, inTheWay: 'confusing' },
      { device },
    );
    const start = taskCreateStartResponseSchema.parse(JSON.parse(first.raw)) as TaskCreateStartPass;
    expect(writerCalls(first.doubles)).toEqual([]);

    const named = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { continuation: start.continuation.token },
      { path: '/v1/task-create/name', device },
    );
    const name = JSON.parse(named.raw) as { continuation: { token: string } };
    const packed = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { continuation: name.continuation.token },
      { path: '/v1/task-create/pack', device },
    );

    expect(packed.response.status).toBe(200);
    for (const sent of [...writerCalls(named.doubles), ...writerCalls(packed.doubles)]) {
      expect(systemOf(sent)).toMatch(told.en.confusing);
    }
  });

  it.each([false, true])(
    'never uses it on a heavy task, which keeps its plain lines (staged: %s)',
    async (staged) => {
      const plainAnswer = {
        oneThing: 'Call the plumber about the leak under the sink.',
        oneThingDue: null,
        parked: [],
        dated: [],
        tinyNextStep: "Find the plumber's number and write it down.",
      };
      const { response, doubles } = await createTask(
        {
          jev: jevDecides(heavy),
          deepseek: pickAnswers([plainAnswer], writerAnswers([plainAnswer])),
        },
        { ...passFixture.request, staged, inTheWay: 'scary' },
      );

      const body = taskCreateResponseSchema.parse(await response.json());
      const plain = offlinePacks.en.plain;
      expect(body).toMatchObject({
        verdict: 'serious',
        lines: { acknowledge: plain.acknowledge, working: [...plain.working], done: plain.done },
      });
      // No model, of either provider, was told what is in the way.
      expect(everythingSent(doubles)).not.toMatch(/scar|in the way/i);
    },
  );

  it('never uses it on a heavy task the person asked to be funny about', async () => {
    const device = await registerDevice();
    const first = await createTask(
      { jev: jevDecides(heavy), deepseek: models(passFixture) },
      { ...passFixture.request, staged: true, overrideSerious: true, inTheWay: 'scary' },
      { device },
    );
    const start = taskCreateStartResponseSchema.parse(JSON.parse(first.raw)) as TaskCreateStartPass;
    expect(start).toMatchObject({ verdict: 'pass', seriousOverridden: true });

    const second = await createTask(
      { jev: jevDecides(heavy), deepseek: models(passFixture) },
      { continuation: start.continuation.token },
      { path: '/v1/task-create/lines', device },
    );

    expect(second.response.status).toBe(200);
    expect(writerCalls(second.doubles).length).toBeGreaterThan(0);
    expect(everythingSent(first.doubles) + everythingSent(second.doubles)).not.toMatch(
      /scares them|What is in the way/,
    );
  });

  it.each(['en', 'vi'] as const)(
    'keeps the recorded %s answer inside the voice check',
    (language) => {
      const { request, response } = recorded[language];

      expect(checkTaskCopy(response, language, request.attitude)).toEqual([]);
    },
  );
});

describe("the cue's notification", () => {
  const written = linesOutputOf(passFixture.response);
  const offlineCue = helperLine('en', 'cheeky', 'cue');

  /** The whole call with the writer giving `cue` first and `again` when asked once more. */
  async function withCue(cue: string, again: string) {
    const { response } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: pickAnswers(
        [pickOutputOf(passFixture.response)],
        rewriteAnswers([{ cueNotification: again }], writerAnswers([{ ...written, cue }])),
      ),
    });
    const body = taskCreateResponseSchema.parse(await response.json()) as TaskCreatePass;
    return { cue: body.cueNotification?.text, voice: response.headers.get('X-Voice-Check') };
  }

  it('comes with the pack, opening on the placeholder the phone fills with the cue', async () => {
    const device = await registerDevice();
    const first = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { ...passFixture.request, staged: true },
      { device },
    );
    const start = taskCreateStartResponseSchema.parse(JSON.parse(first.raw)) as TaskCreateStartPass;
    const named = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { continuation: start.continuation.token },
      { path: '/v1/task-create/name', device },
    );
    const name = JSON.parse(named.raw) as { continuation: { token: string } };
    const packed = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { continuation: name.continuation.token },
      { path: '/v1/task-create/pack', device },
    );

    const pack = taskCreatePackResponseSchema.parse(JSON.parse(packed.raw));
    expect(pack.cueNotification).toEqual(passFixture.response.cueNotification);
    expect(pack.cueNotification?.text.startsWith(cuePlaceholder)).toBe(true);
    // It takes one of the day's places on the phone: the day's own lines are as many as before.
    expect(pack.notifications).toHaveLength(3);
  });

  it('is one line beside the single notification Soft sends', async () => {
    const soft = { ...written, notifications: [written.notifications[0]] };
    const { response, doubles } = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture, soft) },
      { ...passFixture.request, attitude: 'soft' },
    );

    const body = taskCreateResponseSchema.parse(await response.json()) as TaskCreatePass;
    expect(body.notifications).toHaveLength(1);
    expect(body.cueNotification?.text.startsWith(cuePlaceholder)).toBe(true);
    const asked = writerCalls(doubles).find((sent) => toolOf(sent) === 'write_pack_2');
    expect(JSON.stringify(asked)).toContain(cuePlaceholder);
  });

  it.each([
    ['says the cue nowhere', 'You said so. Drip is waiting by the sink.'],
    ['says it in the middle of a sentence', 'You said {cue}. Drip is waiting by the sink.'],
    ['says it twice', '{cue}, you said. {cue}. Drip is waiting.'],
    ['counts days', '{cue}, you said. Day 4 of the sink.'],
    ['mentions a gap', "{cue}, you said. Welcome back, it's been a while."],
    [
      'is too long once the cue is in',
      `{cue}, you said. ${'Drip is waiting by the sink. '.repeat(3)}`,
    ],
  ])('asks for a line that %s once more, and uses the new one', async (_, bad) => {
    const good = '{cue}, you said. Drip has put the kettle on.';

    expect(await withCue(bad, good)).toEqual({ cue: good, voice: 'attempts=2; replaced=0' });
  });

  it('falls back to the offline line when the writer cannot say the cue back', async () => {
    const bad = 'You said so. Drip is waiting by the sink.';

    expect(await withCue(bad, bad)).toEqual({ cue: offlineCue, voice: 'attempts=2; replaced=1' });
    expect(offlineCue.startsWith(cuePlaceholder)).toBe(true);
  });

  it.each(['en', 'vi'] as const)('reads the %s line with the longest cue in place', (language) => {
    const { response, request } = recorded[language];
    const line = { language, attitude: request.attitude };

    expect(checkCueLine({ ...line, text: response.cueNotification?.text ?? '' })).toEqual({
      ok: true,
      reasons: [],
    });
    expect(checkCueLine({ ...line, text: '' }).reasons).toEqual(['empty']);
  });
});

describe('the line under a note left for next time', () => {
  const written = linesOutputOf(passFixture.response);
  const keptLine = 'reading his last email. Just reading';

  it('is written with the pack, and the note itself never reaches a model', async () => {
    const device = await registerDevice();
    const first = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { ...passFixture.request, staged: true },
      { device },
    );
    const start = taskCreateStartResponseSchema.parse(JSON.parse(first.raw)) as TaskCreateStartPass;
    const named = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { continuation: start.continuation.token },
      { path: '/v1/task-create/name', device },
    );
    const name = JSON.parse(named.raw) as { continuation: { token: string } };
    // A phone that sent its kept line along would find it ignored: the pack has no place for it.
    const packed = await createTask(
      { jev: jevDecides(ordinary), deepseek: models(passFixture) },
      { continuation: name.continuation.token, nextStart: { text: keptLine } },
      { path: '/v1/task-create/pack', device },
    );

    const pack = taskCreatePackResponseSchema.parse(JSON.parse(packed.raw));
    expect(pack.lines.nextStartOpening).toBe(passFixture.response.lines.nextStartOpening);
    expect(JSON.stringify(pack)).not.toContain(keptLine);
    expect(everythingSent(packed.doubles)).not.toContain(keptLine);
  });

  it('is the offline line when the writer leaves it out twice, never another slot’s', async () => {
    const { nextStartOpening: _, ...without } = written;
    const { response } = await createTask({
      jev: jevDecides(ordinary),
      deepseek: pickAnswers(
        [pickOutputOf(passFixture.response)],
        rewriteAnswers([{}], writerAnswers([without])),
      ),
    });

    const body = taskCreateResponseSchema.parse(await response.json()) as TaskCreatePass;
    expect(body.lines.nextStartOpening).toBe(helperLine('en', 'cheeky', 'nextStartOpening'));
    expect(response.headers.get('X-Voice-Check')).toBe('attempts=2; replaced=1');
  });
});
