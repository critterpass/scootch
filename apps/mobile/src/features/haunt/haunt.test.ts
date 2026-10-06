import { describe, expect, it } from '@jest/globals';

import type { TaskCreatePass, TaskCreateResponse } from '@scootch/domain';
import { t } from '@scootch/i18n';

import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { HAUNT_DARES, createTogetherApi } from '../../api/together-api';
import { accountStep, chooseName, signIn } from '../account/account-flow';
import { phone } from '../session/test/phone';
import { fakeHttp, refused } from '../table/test/fake-table';

import {
  catchHaunt,
  hauntToSend,
  offersHaunt,
  sendProblemOf,
  shooHaunt,
  showsHauntCard,
} from './haunt-rules';

const pass = passFixture.response as TaskCreatePass;
const serious = seriousFixture.response as TaskCreateResponse;
const HAUNT = { id: 'abcdefghijklmnop' };

async function withTask(answer: TaskCreateResponse, text: string) {
  const app = await phone(answer);
  await app.store.dispatch({ type: 'text_submitted', text, source: 'typed', energy: 'medium' });
  const state = app.store.getState();
  return { app, state, task: 'task' in state.today ? state.today.task : null };
}

describe('offering a haunt', () => {
  it('is offered for an ordinary task whose monster is not caught yet', async () => {
    const { state, task } = await withTask(pass, passFixture.request.text);
    expect(state.monster).not.toBeNull();
    expect(offersHaunt(state, task, state.monster)).toBe(true);
    expect(offersHaunt(state, task, { caughtOn: '2026-10-06' })).toBe(false);
    expect(offersHaunt(state, task, null)).toBe(false);
  });

  it('is never offered for a serious task, even one told to be funny', async () => {
    const { state, task } = await withTask(serious, 'Call the hospital about the results');
    expect(task?.screen).toBe('serious');
    expect(offersHaunt(state, task, { caughtOn: null })).toBe(false);
    const day = { today: { kind: 'task_set' as const }, heavyToday: false };
    const funny = { screen: 'serious' as const, seriousOverridden: true };
    expect(offersHaunt(day, funny, { caughtOn: null })).toBe(false);
  });

  it('is never offered or shown on a crisis day, or a day that held something heavy', () => {
    const ordinary = { screen: 'pass' as const, seriousOverridden: false };
    const crisis = { today: { kind: 'crisis' as const }, heavyToday: false };
    const heavy = { today: { kind: 'nothing_yet' as const }, heavyToday: true };
    expect(offersHaunt(crisis, ordinary, { caughtOn: null })).toBe(false);
    expect(offersHaunt(heavy, ordinary, { caughtOn: null })).toBe(false);
    expect(showsHauntCard(crisis)).toBe(false);
    expect(showsHauntCard(heavy)).toBe(false);
    expect(showsHauntCard({ today: { kind: 'nothing_yet' }, heavyToday: false })).toBe(true);
  });

  it('sends the monster’s body and seed, a dare id and a switch, and never the task', async () => {
    const { state, task } = await withTask(pass, passFixture.request.text);
    if (!state.monster) throw new Error('no monster');
    const web = fakeHttp();
    await createTogetherApi(web.http).sendHaunt(
      hauntToSend(state.monster, 'mnopqrstuvwx', 'just_open_it', true),
    );
    expect(web.sent).toEqual([
      {
        method: 'POST',
        path: '/v1/haunts',
        body: {
          to: 'mnopqrstuvwx',
          bodyType: state.monster.spec.bodyType,
          seed: state.monster.spec.seed,
          dare: 'just_open_it',
          anonymous: true,
          screen: 'pass',
        },
      },
    ]);
    expect(JSON.stringify(web.sent)).not.toContain(task?.text ?? '?');
  });

  it('reads the server’s refusals plainly', () => {
    expect(sendProblemOf('haunted_recently')).toBe('recent');
    expect(sendProblemOf('cannot_be_haunted')).toBe('off');
    expect(sendProblemOf('not_for_this_task')).toBe('notForThis');
    expect(sendProblemOf('network')).toBe('failed');
  });

  it('has words for every dare the server knows, in both languages', () => {
    for (const dare of HAUNT_DARES) {
      expect(t('en', `haunt.dare.${dare}`)).toMatch(/\?$/);
      expect(t('vi', `haunt.dare.${dare}`)).not.toBe(t('en', `haunt.dare.${dare}`));
    }
  });
});

describe('a waiting haunt', () => {
  it('becomes today’s one thing through the normal task flow when caught', async () => {
    const app = await phone(pass);
    expect(app.store.getState().today.kind).toBe('nothing_yet');
    const web = fakeHttp();
    const words = t('en', 'haunt.dare.two_minutes');
    await catchHaunt(createTogetherApi(web.http), app.store.dispatch, HAUNT, words);

    expect(web.sent).toEqual([{ method: 'POST', path: `/v1/haunts/${HAUNT.id}/catch`, body: {} }]);
    const { today } = app.store.getState();
    expect(today.kind).toBe('task_set');
    const [task] = await app.repositories.tasks.all();
    expect(task).toMatchObject({ source: 'typed', status: 'set' });
  });

  it('leaves no trace on the phone when shooed', async () => {
    const app = await phone(pass);
    const before = app.data.dump();
    const web = fakeHttp();
    await shooHaunt(createTogetherApi(web.http), HAUNT);
    expect(web.sent).toEqual([{ method: 'POST', path: `/v1/haunts/${HAUNT.id}/shoo`, body: {} }]);
    expect(app.data.dump()).toBe(before);
    expect(app.store.getState().today.kind).toBe('nothing_yet');
  });
});

describe('the account a table asks for', () => {
  const ACCOUNT = { accountId: 'abcdefghijkl', displayName: null, canBeHaunted: true };

  it('asks the server for a nonce, hands it to Apple, and sends the token back with it', async () => {
    const web = fakeHttp({
      'POST /v1/accounts/apple/nonce': { nonce: 'n'.repeat(32) },
      'POST /v1/accounts/apple': { ...ACCOUNT, created: true },
    });
    const asked: string[] = [];
    const apple = {
      signIn: (nonce: string) => (asked.push(nonce), Promise.resolve('apple-token')),
    };
    const account = await signIn(createTogetherApi(web.http), apple);
    expect(asked).toEqual(['n'.repeat(32)]);
    expect(web.sent.at(-1)?.body).toEqual({ identityToken: 'apple-token', nonce: 'n'.repeat(32) });
    expect(accountStep(account)).toBe('name');
    expect(accountStep(null)).toBe('sign_in');
    expect(accountStep({ ...ACCOUNT, displayName: 'Mai' })).toBe('ready');
  });

  it('sends nothing when Apple’s sheet is closed', async () => {
    const web = fakeHttp({ 'POST /v1/accounts/apple/nonce': { nonce: 'n'.repeat(32) } });
    const apple = { signIn: () => Promise.resolve(null) };
    expect(await signIn(createTogetherApi(web.http), apple)).toBeNull();
    expect(web.sent).toHaveLength(1);
  });

  it('keeps a name the server accepts and passes its refusal on plainly', async () => {
    const kept = fakeHttp({ 'PUT /v1/accounts/me': { ...ACCOUNT, displayName: 'Mai Anh' } });
    expect(await chooseName(createTogetherApi(kept.http), '  Mai   Anh ')).toMatchObject({
      ok: true,
    });
    expect(kept.sent).toEqual([
      { method: 'PUT', path: '/v1/accounts/me', body: { displayName: 'Mai Anh' } },
    ]);

    const refusedName = fakeHttp({ 'PUT /v1/accounts/me': refused('name_not_acceptable') });
    expect(await chooseName(createTogetherApi(refusedName.http), 'Mai')).toEqual({
      ok: false,
      problem: 'refused',
    });
    const down = fakeHttp({ 'PUT /v1/accounts/me': new Error('model down') });
    expect(await chooseName(createTogetherApi(down.http), 'Mai')).toEqual({
      ok: false,
      problem: 'unchecked',
    });

    const tooShort = fakeHttp();
    expect(await chooseName(createTogetherApi(tooShort.http), ' M ')).toEqual({
      ok: false,
      problem: 'length',
    });
    expect(tooShort.sent).toEqual([]);
  });
});
