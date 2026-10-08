import {
  taskCreateLinesResponseSchema,
  taskCreateNameResponseSchema,
  taskCreatePackResponseSchema,
  taskCreateStartResponseSchema,
  type TaskCreateStartPass,
} from '@scootch/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  continuationLifetimeMs,
  continuationSecret,
  openContinuation,
  sealContinuation,
} from '../src/ai/task-create/continuation';

import { registerDevice, wireErrorOf } from './support';
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
const picked = pickOutputOf(passFixture.response);
const written = linesOutputOf(passFixture.response);
const replies = () => ({
  jev: jevDecides(ordinary),
  deepseek: pickAnswers([picked], writerAnswers([written])),
});
const linesPath = { path: '/v1/task-create/lines' };

/** Stage one for the recorded ramble, as a registered device. */
async function start() {
  const device = await registerDevice();
  const stageOne = await createTask(
    replies(),
    { ...passFixture.request, staged: true },
    { device },
  );
  expect(stageOne.response.status).toBe(200);
  const body = taskCreateStartResponseSchema.parse(JSON.parse(stageOne.raw)) as TaskCreateStartPass;
  return { device, stageOne, body };
}

/** What a continuation token holds, read the way its holder could. */
function held(token: string): string {
  const [body = ''] = token.split('.');
  return new TextDecoder().decode(
    Uint8Array.from(atob(body.replaceAll('-', '+').replaceAll('_', '/')), (character) =>
      character.charCodeAt(0),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the task call in two stages', () => {
  it('answers stage one with the task, the rest and the labels, before anything is written', async () => {
    const { stageOne, body } = await start();
    const { monster, lines, notifications, cueNotification, ...first } = passFixture.response;

    expect(body).toEqual({ ...first, continuation: body.continuation });
    expect(Object.keys(JSON.parse(stageOne.raw) as object)).not.toContain('monster');
    expect(writerCalls(stageOne.doubles)).toEqual([]);
    expect([monster, lines, notifications, cueNotification]).not.toContain(undefined);
    expect(Date.parse(body.continuation.expiresAt) - Date.now()).toBeLessThanOrEqual(
      continuationLifetimeMs,
    );
  });

  it('carries the one thing to stage two and never the text it came from', async () => {
    const { body } = await start();

    const carried = held(body.continuation.token);
    expect(carried).toContain('Call the plumber about the leak under the sink.');
    expect(carried).not.toMatch(/passport|Japan|council|Sam|bathroom/i);
  });

  it('answers stage two with the monster, the lines and the notifications for that one thing', async () => {
    const { device, body } = await start();

    const stageTwo = await createTask(
      replies(),
      { continuation: body.continuation.token },
      { ...linesPath, device },
    );

    expect(stageTwo.response.status).toBe(200);
    const { monster, lines, notifications, cueNotification } = passFixture.response;
    const answer = taskCreateLinesResponseSchema.parse(JSON.parse(stageTwo.raw));
    expect(answer).toEqual({
      // The words come with the server's signature for them.
      monster: { ...monster, signed: answer.monster.signed },
      lines,
      notifications,
      cueNotification,
    });
    expect(answer.monster.signed).toMatchObject({ language: 'en' });
    expect(stageTwo.response.headers.get('X-Voice-Check')).toBe(
      'attempts=1; replaced=0; source=writer',
    );
    // The writer is asked about the one thing alone.
    expect(JSON.stringify(stageTwo.doubles.sent)).not.toMatch(/passport|Japan/);
    expect(stageTwo.doubles.sent.jev).toEqual([]);
  });

  it('refuses a continuation from another device, a changed one and one past its time', async () => {
    const { device, body } = await start();
    const { token } = body.continuation;
    const ask = (continuation: string, as: string) =>
      createTask(replies(), { continuation }, { ...linesPath, device: as });

    const stranger = await ask(token, await registerDevice());
    expect(stranger.response.status).toBe(400);
    expect(await wireErrorOf(stranger.response)).toMatchObject({
      code: 'bad_request',
      detail: { reason: 'continuation_invalid' },
    });

    const [sealed = '', signature = ''] = token.split('.');
    const forged = btoa(held(token).replace('plumber', 'bank')).replaceAll('=', '');
    for (const changed of [`${forged}.${signature}`, `${sealed}.${signature.slice(0, -2)}AA`]) {
      const refused = await ask(changed, device);
      expect(refused.response.status).toBe(400);
      expect(writerCalls(refused.doubles)).toEqual([]);
    }

    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + continuationLifetimeMs + 1000);
    const late = await ask(token, device);
    expect(late.response.status).toBe(400);
    expect(await wireErrorOf(late.response)).toMatchObject({
      detail: { reason: 'continuation_expired' },
    });
  });

  it('names the monster first, then writes the pack about it and names the treat', async () => {
    const { device, body } = await start();
    const { monster, lines, notifications } = passFixture.response;

    const named = await createTask(
      replies(),
      { continuation: body.continuation.token },
      { path: '/v1/task-create/name', device },
    );
    const name = taskCreateNameResponseSchema.parse(JSON.parse(named.raw));
    expect(name).toMatchObject({ monster, hatch: lines.hatch });
    // One small writer call, and nothing but the name and the hatch line is asked of it.
    expect(writerCalls(named.doubles)).toHaveLength(1);
    expect(held(name.continuation.token)).toContain(monster.name);

    const packed = await createTask(
      replies(),
      { continuation: name.continuation.token, treat: 'a flat white' },
      { path: '/v1/task-create/pack', device },
    );
    const pack = taskCreatePackResponseSchema.parse(JSON.parse(packed.raw));
    const { hatch, ...rest } = lines;
    expect(hatch).toBe(name.hatch);
    expect(pack).toEqual({
      lines: { ...rest, treatHandOver: rest.treatHandOver?.replace('{treat}', 'a flat white') },
      notifications,
      cueNotification: passFixture.response.cueNotification,
    });
    expect(pack.lines.treatHandOver).toContain('a flat white');
    // The pack is written about the monster already named.
    expect(JSON.stringify(writerCalls(packed.doubles))).toContain(monster.name);

    // Stage one's continuation names no monster, so the pack cannot be asked with it.
    const early = await createTask(
      replies(),
      { continuation: body.continuation.token },
      { path: '/v1/task-create/pack', device },
    );
    expect(early.response.status).toBe(400);
    expect(writerCalls(early.doubles)).toEqual([]);
  });

  it('signs with its own secret when one is set, and with the derived key only without it', async () => {
    const payload = {
      oneThing: 'Call mum.',
      language: 'en',
      attitude: 'soft',
      bodyType: null,
      seed: 1,
    } as const;
    const own = continuationSecret({ TASK_CONTINUATION_SECRET: 'own', DEEPSEEK_API_KEY: 'model' });
    const derived = continuationSecret({ DEEPSEEK_API_KEY: 'model' });
    expect([own, derived]).toEqual(['own', 'model']);
    expect(continuationSecret({ TASK_CONTINUATION_SECRET: '', DEEPSEEK_API_KEY: 'model' })).toBe(
      'model',
    );

    const { token } = await sealContinuation('own', 'device', payload);
    expect(await openContinuation('own', 'device', token)).toEqual(payload);
    expect(await openContinuation('model', 'device', token)).toBe('invalid');
  });
});
