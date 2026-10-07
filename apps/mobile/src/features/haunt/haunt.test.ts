import { randomUUID } from 'node:crypto';

import { describe, expect, it } from '@jest/globals';

import { hauntSeedSchema, type TaskCreatePass, type TaskCreateResponse } from '@scootch/domain';
import { t } from '@scootch/i18n';

import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { HAUNT_DARES, createTogetherApi } from '../../api/together-api';
import type { DayContext } from '../../state/day-types';
import { monsterFor, newTask } from '../../state/task-rows';
import {
  accountStep,
  chooseName,
  returnPath,
  signIn,
  startCarriedBy,
  suggestedName,
} from '../account/account-flow';
import { phone } from '../session/test/phone';
import { sharedPageLink } from '../share/share-links';
import { fakeHttp, refused } from '../table/test/fake-table';

import {
  catchHaunt,
  hauntToSend,
  hauntableFriends,
  offersHaunt,
  offersHauntOnHatch,
  sendProblemOf,
  shooHaunt,
  showsHauntCard,
} from './haunt-rules';

const pass = passFixture.response as TaskCreatePass;
const serious = seriousFixture.response as TaskCreateResponse;
const HAUNT = { id: 'abcdefghijklmnop' };
const NO_LABELS = { bodyType: null } as Parameters<typeof monsterFor>[2];
const COPY = { name: 'Molar', title: 'Keeper of Thursday', flavourText: 'Lives in the inbox.' };

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

  it('is offered on the hatch screen only to someone signed in with a friend who takes haunts', async () => {
    const { state, task } = await withTask(pass, passFixture.request.text);
    const friend = { canBeHaunted: true };
    expect(offersHauntOnHatch(state, task, state.monster, [friend])).toBe(true);
    // Nobody to haunt: no friends yet, or none who takes haunts.
    expect(offersHauntOnHatch(state, task, state.monster, [])).toBe(false);
    expect(offersHauntOnHatch(state, task, state.monster, [{ canBeHaunted: false }])).toBe(false);
    // A friend changes nothing for a serious task, a crisis day or a heavy one.
    const ordinary = { screen: 'pass' as const, seriousOverridden: false };
    const funny = { screen: 'serious' as const, seriousOverridden: true };
    const fine = { today: { kind: 'task_set' as const }, heavyToday: false };
    const crisis = { today: { kind: 'crisis' as const }, heavyToday: false };
    const wild = { caughtOn: null };
    expect(offersHauntOnHatch(fine, ordinary, wild, [friend])).toBe(true);
    expect(offersHauntOnHatch(fine, funny, wild, [friend])).toBe(false);
    expect(offersHauntOnHatch(crisis, ordinary, wild, [friend])).toBe(false);
    expect(offersHauntOnHatch({ ...fine, heavyToday: true }, ordinary, wild, [friend])).toBe(false);

    // A phone that is not signed in is refused by the server: it has no friends, and no error.
    const signedOut = { friends: () => Promise.reject(new Error('unauthorized')) };
    expect(await hauntableFriends(signedOut)).toEqual([]);
    const signedIn = {
      friends: () =>
        Promise.resolve([
          { accountId: 'mnopqrstuvwx', displayName: 'Bao', canBeHaunted: true },
          { accountId: 'abcdefghijkl', displayName: null, canBeHaunted: false },
        ]),
    };
    expect(await hauntableFriends(signedIn)).toMatchObject([{ displayName: 'Bao' }]);
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
    const web = fakeHttp({ 'POST /v1/haunts': { sent: true, pageId: 'abcdefgh234567ab' } });
    const answer = await createTogetherApi(web.http).sendHaunt(
      hauntToSend(state.monster, 'mnopqrstuvwx', 'just_open_it', true),
    );
    // The page's id is kept, and the link made from it holds that id and nothing else: no name,
    // no account and no query, so a haunt sent without a name tells nothing about its sender.
    expect(answer).toEqual({ pageId: 'abcdefgh234567ab' });
    const link = sharedPageLink('https://scootch.app', 'en', 'h', answer.pageId);
    expect(link).toBe('https://scootch.app/h/abcdefgh234567ab');
    expect(link).not.toContain('mnopqrstuvwx');
    expect(new URL(link).search).toBe('');
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

  it('sends a seed the contract takes: the one the phone’s own id function gives a monster', () => {
    // The app's own path: a task's id comes from the phone's id function, and the monster's seed
    // is that id. On the phone the function is expo-crypto's `randomUUID`, which is native and
    // does not run here; Node's gives the same lower-case form.
    const ctx = {
      deps: { nextId: randomUUID },
      memory: { state: { localDate: '2026-10-07' } },
      now: () => Date.parse('2026-10-07T09:00:00.000Z'),
    } as unknown as DayContext;
    for (let made = 0; made < 20; made += 1) {
      const task = newTask(ctx, 'anything', 'typed', 'pass');
      const monster = monsterFor(ctx, task, NO_LABELS, COPY);
      const { seed } = hauntToSend(monster, 'mnopqrstuvwx', 'tiny_bit', false);
      expect(seed).toBe(task.id);
      expect(hauntSeedSchema.safeParse(seed).success).toBe(true);
    }
    // The ids of this file's test phone, a word, and the website maker's short seed are not it.
    for (const seed of ['id-1791277200000-1', 'taxes', '815sxr', '']) {
      expect(hauntSeedSchema.safeParse(seed).success).toBe(false);
    }
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
      signIn: (nonce: string) => (
        asked.push(nonce),
        Promise.resolve({ identityToken: 'apple-token', givenName: 'Mai Anh' })
      ),
    };
    const signedIn = await signIn(createTogetherApi(web.http), apple);
    expect(asked).toEqual(['n'.repeat(32)]);
    // Apple's name is offered to the person and is not sent: only the token and the nonce are.
    expect(web.sent.at(-1)?.body).toEqual({ identityToken: 'apple-token', nonce: 'n'.repeat(32) });
    expect(signedIn?.suggestedName).toBe('Mai');
    expect(accountStep(signedIn?.account ?? null)).toBe('name');
    expect(accountStep(null)).toBe('sign_in');
    expect(accountStep({ ...ACCOUNT, displayName: 'Mai' })).toBe('ready');
  });

  it('sends nothing when Apple’s sheet is closed', async () => {
    const web = fakeHttp({ 'POST /v1/accounts/apple/nonce': { nonce: 'n'.repeat(32) } });
    const apple = { signIn: () => Promise.resolve(null) };
    expect(await signIn(createTogetherApi(web.http), apple)).toBeNull();
    expect(web.sent).toHaveLength(1);
  });

  it('offers a first name a seat can show, or nothing', () => {
    expect(suggestedName('  Hana   Ito ')).toBe('Hana');
    expect(suggestedName(null)).toBe('');
    expect(suggestedName('X')).toBe('');
    expect(suggestedName('A'.repeat(21))).toBe('');
  });

  it('goes on only to a place that asks for an account, carrying a start to the lobby', () => {
    for (const path of [
      '/table',
      '/table?minutes=25',
      '/table-settings',
      '/friends',
      '/t/abcdefghij?sit=1',
      '/f/abcdefghij',
    ]) {
      expect(returnPath(path)).toBe(path);
    }
    for (const path of ['/plus', '/table?minutes=25&x=1', 'https://scootch.app/table', undefined]) {
      expect(returnPath(path)).toBeNull();
    }
    expect(startCarriedBy('/table?minutes=25')).toBe(25);
    expect(startCarriedBy('/table?minutes=0')).toBeNull();
    expect(startCarriedBy('/table')).toBeNull();
    expect(startCarriedBy('/friends')).toBeNull();
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
