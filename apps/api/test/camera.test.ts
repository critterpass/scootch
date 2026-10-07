import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import {
  cameraDeskResponseSchema,
  cameraPaperResponseSchema,
  cameraRoomResponseSchema,
  cameraScreenResponseSchema,
} from '@scootch/domain';
import { noTaskLine, offlineLine } from '@scootch/voice';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import * as routes from '../src/routes/index.generated';

import { connectionDrops, providers, type Reply } from './ai-providers';
import { call, freshIp, registerDevice, wireErrorOf } from './support';
import { jevDecides, writerAnswers, writerCalls } from './task-create-support';

const ordinary = { pass: 0.99, serious: 0.01, crisis: 0 };
const heavy = { pass: 0.2, serious: 0.78, crisis: 0.02 };
const danger = { pass: 0.05, serious: 0.15, crisis: 0.8 };

/** Sends one camera request from a registered device with the providers replaced. */
async function send(path: string, body: unknown, replies: { jev: Reply; deepseek: Reply }) {
  const doubles = providers(replies);
  vi.stubGlobal('fetch', doubles.fetch);
  const token = await registerDevice();
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test${path}`, {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': freshIp(),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
    { ...env, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return { doubles, response };
}

function logSpies() {
  return (['log', 'info', 'warn', 'error'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => {}),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const deskBody = {
  language: 'en',
  attitude: 'cheeky',
  picked: ['mug', 'coffee cup'],
  others: ['paper', 'cable'],
};
const deskWords = {
  line: 'Start with the mug. Just the mug. The papers can watch.',
  action: 'Mug first',
  task: 'Take the mug to the kitchen',
};

describe('POST /v1/camera/desk', () => {
  it('needs a registered device', async () => {
    const response = await call('/v1/camera/desk', { method: 'POST', body: deskBody });
    expect(response.status).toBe(401);
  });

  it('writes the words for the ringed thing from its names alone', async () => {
    const { doubles, response } = await send('/v1/camera/desk', deskBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([deskWords]),
    });
    expect(cameraDeskResponseSchema.parse(await response.json())).toEqual(deskWords);
    const [sent] = writerCalls(doubles);
    expect(JSON.stringify(sent)).toContain('<ringed>\\nmug\\ncoffee cup\\n</ringed>');
    expect(doubles.sent.jev).toEqual([]);
  });

  it('asks once more for a line with a number in it, then says its own', async () => {
    const counted = { ...deskWords, line: 'Start with the mug. The 14 papers can watch.' };
    const { doubles, response } = await send('/v1/camera/desk', deskBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([counted]),
    });
    expect(writerCalls(doubles)).toHaveLength(2);
    expect(await response.json()).toEqual({
      ...deskWords,
      line: noTaskLine('en', 'cheeky', 'cameraDesk'),
    });
  });

  it('keeps the better second answer', async () => {
    const counted = { ...deskWords, line: 'Start with the mug. The 14 papers can watch.' };
    const { response } = await send('/v1/camera/desk', deskBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([counted, deskWords]),
    });
    expect(await response.json()).toEqual(deskWords);
  });

  it('leaves out a button or a task that is too long, and keeps the rest', async () => {
    const { response } = await send('/v1/camera/desk', deskBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([
        { ...deskWords, action: 'Carry the mug all the way to the kitchen sink first' },
      ]),
    });
    expect(await response.json()).toEqual({ ...deskWords, action: null });
  });

  it('still answers, in its own words, when no model does', async () => {
    logSpies();
    const { response } = await send('/v1/camera/desk', deskBody, {
      jev: jevDecides(ordinary),
      deepseek: connectionDrops,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      line: noTaskLine('en', 'cheeky', 'cameraDesk'),
      action: null,
      task: null,
    });
  });
});

describe('POST /v1/camera/room', () => {
  const body = { language: 'en', attitude: 'soft', position: 'bottom_left', things: ['clothing'] };
  const words = {
    line: 'Only the bit of floor by the bed. The rest of the room can wait.',
    action: 'This corner',
    task: 'Clear the floor by the bed',
  };

  it('writes the words for the lit corner from where it is and what is in it', async () => {
    const { doubles, response } = await send('/v1/camera/room', body, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([words]),
    });
    expect(cameraRoomResponseSchema.parse(await response.json())).toEqual(words);
    expect(JSON.stringify(writerCalls(doubles)[0])).toContain('<corner>\\nbottom left\\n</corner>');
  });

  it('still answers, in its own words, when no model does', async () => {
    logSpies();
    const { response } = await send('/v1/camera/room', body, {
      jev: jevDecides(ordinary),
      deepseek: connectionDrops,
    });
    expect(await response.json()).toEqual({
      line: noTaskLine('en', 'soft', 'cameraRoom'),
      action: null,
      task: null,
    });
  });
});

const page = [
  { id: 'l0', text: 'Council tax: change of circumstances' },
  { id: 'l1', text: 'Property reference' },
  { id: 'l2', text: 'Date you moved in' },
  { id: 'l3', text: 'Full name of the liable person' },
  { id: 'l4', text: 'Signature' },
];
const paperBody = { language: 'en', attitude: 'cheeky', lines: page };
const paperWords = {
  found: true,
  boxes: ['l4', 'l1', 'l3', 'l2', 'l9', 'l3'],
  pick: 'l3',
  document: 'Council tax form',
  jargonTerm: 'liable person',
  jargonMeaning: 'It just means whoever pays. Probably you.',
  jargonMore: 'The council uses it for the person the bill is addressed to.',
  line: 'This box wants your full name. You know this one.',
  action: 'Fill this box',
  task: 'Write your full name on the form',
};

describe('POST /v1/camera/paper', () => {
  it('needs a registered device', async () => {
    const response = await call('/v1/camera/paper', { method: 'POST', body: paperBody });
    expect(response.status).toBe(401);
  });

  it('answers with the easiest box, the boxes in reading order and one hard word made plain', async () => {
    const { response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([paperWords]),
    });
    expect(cameraPaperResponseSchema.parse(await response.json())).toEqual({
      verdict: 'pass',
      result: 'step',
      // A line the phone never sent is dropped, and a repeat is counted once.
      boxes: ['l1', 'l2', 'l3', 'l4'],
      pick: 'l3',
      document: 'Council tax form',
      jargon: {
        term: 'liable person',
        meaning: paperWords.jargonMeaning,
        more: paperWords.jargonMore,
      },
      line: paperWords.line,
      action: paperWords.action,
      task: paperWords.task,
    });
  });

  it('always numbers the picked box, even when the model left it out of the boxes', async () => {
    const { response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...paperWords, boxes: ['l1'], pick: 'l4' }]),
    });
    expect(await response.json()).toMatchObject({ boxes: ['l1', 'l4'], pick: 'l4' });
  });

  it('drops a hard word that is not printed on the page', async () => {
    const { response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...paperWords, jargonTerm: 'hereditament' }]),
    });
    expect(await response.json()).toMatchObject({ result: 'step', jargon: null });
  });

  it.each([
    ['serious', heavy],
    ['crisis', danger],
  ] as const)('answers %s words with the verdict alone and writes nothing', async (verdict, p) => {
    const { doubles, response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(p),
      deepseek: writerAnswers([paperWords]),
    });
    expect(await response.json()).toEqual({ verdict });
    expect(writerCalls(doubles)).toEqual([]);
  });

  it('counts words nobody could screen as serious', async () => {
    logSpies();
    const { doubles, response } = await send('/v1/camera/paper', paperBody, {
      jev: connectionDrops,
      deepseek: connectionDrops,
    });
    expect(await response.json()).toEqual({ verdict: 'serious' });
    expect(writerCalls(doubles)).toEqual([]);
  });

  it('asks once more for a pick that is not a line of the page, then reads nothing into it', async () => {
    const { doubles, response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...paperWords, pick: 'l40' }]),
    });
    expect(writerCalls(doubles)).toHaveLength(2);
    expect(await response.json()).toEqual({ verdict: 'pass', result: 'unreadable' });
  });

  it('says so when the page asks nothing of the person', async () => {
    const { doubles, response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...paperWords, found: false, pick: '' }]),
    });
    expect(writerCalls(doubles)).toHaveLength(1);
    expect(await response.json()).toEqual({ verdict: 'pass', result: 'unreadable' });
  });

  it('fails plainly when the writer does not answer, and logs none of the words', async () => {
    const spies = logSpies();
    const { response } = await send('/v1/camera/paper', paperBody, {
      jev: jevDecides(ordinary),
      deepseek: connectionDrops,
    });
    expect(response.status).toBe(503);
    expect((await wireErrorOf(response)).code).toBe('model_unavailable');
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    for (const { text } of page) expect(logged).not.toContain(text);
  });

  it('refuses two lines with one id', async () => {
    const { response } = await send(
      '/v1/camera/paper',
      { ...paperBody, lines: [page[0], { id: 'l0', text: 'again' }] },
      { jev: jevDecides(ordinary), deepseek: writerAnswers([paperWords]) },
    );
    expect(response.status).toBe(400);
  });
});

describe('POST /v1/camera/screen', () => {
  const inbox = [
    { id: 'l0', text: 'Newsletter  Your weekly digest' },
    { id: 'l1', text: "Dr. Patel's office  Re: Thursday appointment" },
    { id: 'l2', text: 'Shop  Sale on everything' },
  ];
  const body = { language: 'en', attitude: 'cheeky', lines: inbox };
  const words = {
    found: true,
    pick: 'l1',
    draft: 'Hi Dr. Patel, is Thursday still okay for my check-up?',
    line: 'This one. The others can wait their turn.',
    action: 'Reply to this one',
    task: 'Reply to the doctor about Thursday',
  };

  it('answers with the one line that matters and a first line to send', async () => {
    const { response } = await send('/v1/camera/screen', body, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([words]),
    });
    expect(cameraScreenResponseSchema.parse(await response.json())).toEqual({
      verdict: 'pass',
      result: 'step',
      pick: 'l1',
      draft: words.draft,
      line: words.line,
      action: words.action,
      task: words.task,
    });
  });

  it('drops a first line with a number nobody checked, and says its own line for a bad one', async () => {
    const { response } = await send('/v1/camera/screen', body, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([
        { ...words, draft: 'Is 3pm on the 14th okay?', line: 'Ignore the other 213.' },
      ]),
    });
    expect(await response.json()).toMatchObject({
      pick: 'l1',
      draft: null,
      line: offlineLine('en', 'cheeky', 'tinyNextStep'),
    });
  });

  it('answers crisis words with the verdict alone and writes nothing', async () => {
    const { doubles, response } = await send('/v1/camera/screen', body, {
      jev: jevDecides(danger),
      deepseek: writerAnswers([words]),
    });
    expect(await response.json()).toEqual({ verdict: 'crisis' });
    expect(writerCalls(doubles)).toEqual([]);
  });

  it('reads nothing into a pick that is not on the screen', async () => {
    const { response } = await send('/v1/camera/screen', body, {
      jev: jevDecides(ordinary),
      deepseek: writerAnswers([{ ...words, pick: 'l7' }]),
    });
    expect(await response.json()).toEqual({ verdict: 'pass', result: 'unreadable' });
  });
});
