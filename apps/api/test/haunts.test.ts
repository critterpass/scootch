import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { wireErrorSchema } from '../src/contracts';

import {
  as,
  befriend,
  count,
  ok,
  person,
  postHaunt,
  reasonOf,
  signedWords,
  signingEnv,
  type Person,
} from './table-support';

const day = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

const haunt = (to: Person, extra: Record<string, unknown> = {}) => ({
  to: to.accountId,
  bodyType: 'sock',
  seed: '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50',
  dare: 'two_minutes',
  screen: 'pass',
  ...extra,
});
const send = (from: Person, to: Person, extra?: Record<string, unknown>) =>
  postHaunt(from, haunt(to, extra));
type Waiting = {
  haunts: { id: string; from: unknown; dare: string; bodyType: string; seed: string }[];
};
const waiting = (who: Person) => ok<Waiting>(as(who, 'GET', '/v1/haunts'));

async function friends(): Promise<[Person, Person]> {
  const pair: [Person, Person] = [await person('Mai'), await person('Bo')];
  await befriend(...pair);
  return pair;
}

describe('haunting', () => {
  it('is for friends only', async () => {
    const sender = await person('Mai');
    const stranger = await person('Bo');

    expect(await reasonOf(send(sender, stranger))).toBe('not_friends');
    expect(await reasonOf(send(sender, sender))).toBe('not_friends');
    expect(await count('haunts WHERE sender = ?', sender.accountId)).toBe(0);
  });

  it('delivers the monster and the dare, naming the sender unless they chose not to be named', async () => {
    const [sender, recipient] = await friends();
    const [other] = [await person('Cy')];
    await befriend(other, recipient);

    expect(await ok(send(sender, recipient))).toMatchObject({ sent: true });
    await ok(send(other, recipient, { anonymous: true, dare: 'race_you' }));

    const { haunts } = await waiting(recipient);
    expect(haunts).toMatchObject([
      {
        bodyType: 'sock',
        seed: '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50',
        dare: 'two_minutes',
        from: { accountId: sender.accountId, displayName: 'Mai' },
      },
      { dare: 'race_you', from: null },
    ]);
    expect(JSON.stringify(haunts[1])).not.toContain(other.accountId);
  });

  it('allows one per friend per seven days, whatever became of the first', async () => {
    const [sender, recipient] = await friends();
    await ok(send(sender, recipient));

    expect(await reasonOf(send(sender, recipient))).toBe('haunted_recently');
    // The friend haunting back is their own week.
    await ok(send(recipient, sender));

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 6 * day });
    expect(await reasonOf(send(sender, recipient))).toBe('haunted_recently');
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 2 * day });
    await ok(send(sender, recipient));
  });

  it.each(['serious', 'crisis', 'reject'])('is refused for a task screened %s', async (screen) => {
    const [sender, recipient] = await friends();

    expect(await reasonOf(send(sender, recipient, { screen }))).toBe('not_for_this_task');
    expect((await send(sender, recipient, { screen: undefined })).status).toBe(400);
    expect((await waiting(recipient)).haunts).toEqual([]);
  });

  it('takes a dare only from the preset list, and no words anywhere', async () => {
    const [sender, recipient] = await friends();

    for (const extra of [
      { dare: 'do your taxes already' },
      { note: 'do your taxes already' },
      { seed: 'do your taxes already' },
      { bodyType: 'taxes' },
    ]) {
      expect((await send(sender, recipient, extra)).status).toBe(400);
    }
    expect((await waiting(recipient)).haunts).toEqual([]);
  });

  it('takes a seed only in the shape the phone makes, and refuses another with the wire error', async () => {
    const [sender, recipient] = await friends();

    for (const seed of ['815sxr', '5F0C9A2E-77AA-4C1D-9D6E-0B1C2D3E4F50', 'deadbeef-cafe', '']) {
      const refused = await send(sender, recipient, { seed });
      expect(refused.status).toBe(400);
      const body = wireErrorSchema.parse(await refused.json());
      expect(body.error.code).toBe('bad_request');
      expect(body.error.retryable).toBe(false);
    }
    expect((await waiting(recipient)).haunts).toEqual([]);

    const seed = crypto.randomUUID();
    await ok(send(sender, recipient, { seed }));
    expect((await waiting(recipient)).haunts.map((each) => each.seed)).toEqual([seed]);
  });

  it('respects “can be haunted”', async () => {
    const [sender, recipient] = await friends();
    await ok(as(recipient, 'PUT', '/v1/accounts/me', { canBeHaunted: false }));

    expect(await reasonOf(send(sender, recipient))).toBe('cannot_be_haunted');
    expect(await ok(as(sender, 'GET', '/v1/friends'))).toMatchObject({
      friends: [{ canBeHaunted: false }],
    });
  });

  it('can be caught once, by its recipient only', async () => {
    const [sender, recipient] = await friends();
    await ok(send(sender, recipient));
    const [{ id } = { id: '' }] = (await waiting(recipient)).haunts;

    expect((await as(sender, 'POST', `/v1/haunts/${id}/catch`)).status).toBe(404);
    expect(await ok(as(recipient, 'POST', `/v1/haunts/${id}/catch`))).toMatchObject({
      haunt: { id, dare: 'two_minutes', bodyType: 'sock' },
    });
    expect((await as(recipient, 'POST', `/v1/haunts/${id}/shoo`)).status).toBe(404);
    expect((await waiting(recipient)).haunts).toEqual([]);
  });

  it('leaves the sender nothing to read when it is shooed', async () => {
    const [sender, recipient] = await friends();
    const [control, controlFriend] = await friends();
    await ok(send(sender, recipient));
    await ok(send(control, controlFriend));
    const [{ id } = { id: '' }] = (await waiting(recipient)).haunts;

    /** Everything a sender can ask the API, and what a second send answers. */
    const everything = async (who: Person, friend: Person) =>
      JSON.stringify([
        await ok(as(who, 'GET', '/v1/haunts')),
        await ok(as(who, 'GET', '/v1/accounts/me')),
        await ok(as(who, 'GET', '/v1/friends')),
        await reasonOf(send(who, friend)),
      ])
        .replaceAll(who.accountId, 'me')
        .replaceAll(friend.accountId, 'friend');
    const before = await everything(sender, recipient);

    await ok(as(recipient, 'POST', `/v1/haunts/${id}/shoo`));

    // The same as before, and the same as a sender whose haunt is still waiting.
    expect(await everything(sender, recipient)).toBe(before);
    expect(await everything(sender, recipient)).toBe(await everything(control, controlFriend));
    expect((await waiting(recipient)).haunts).toEqual([]);
    const row = await env.DB.prepare('SELECT state FROM haunts WHERE id = ?').bind(id).first();
    expect(row).toEqual({ state: 'shooed' });
  });

  it('runs out after seven days: gone from the list, the count, the page and the catch', async () => {
    const [sender, recipient] = await friends();
    const { pageId } = await ok<{ pageId: string }>(send(sender, recipient));
    const page = async () =>
      await ok<{ state: string; from: unknown }>(as(undefined, 'GET', `/v1/haunt-page/${pageId}`));
    const waitingCount = () => ok<{ waiting: number }>(as(recipient, 'GET', '/v1/haunts/waiting'));

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 7 * day - 60_000 });
    expect(await waitingCount()).toEqual({ waiting: 1 });
    expect((await waiting(recipient)).haunts[0]).toMatchObject({ id: pageId });
    // The sender may look through the link, and sees only that it is still waiting.
    expect(await page()).toMatchObject({ state: 'waiting' });

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 2 * 60_000 });
    expect(await waitingCount()).toEqual({ waiting: 0 });
    expect((await waiting(recipient)).haunts).toEqual([]);
    expect(await page()).toEqual(expect.objectContaining({ state: 'gone', from: null }));
    const late = await as(recipient, 'POST', `/v1/haunts/${pageId}/catch`);
    expect(late.status).toBe(404);
    expect(wireErrorSchema.parse(await late.json()).error.code).toBe('not_found');
  });

  it('answers "is anything waiting" with a count, and zero for a phone with no account', async () => {
    const [sender, recipient] = await friends();
    const { token } = await ok<{ token: string }>(
      as(undefined, 'POST', '/v1/devices', { language: 'en' }),
    );
    await ok(send(sender, recipient));

    expect(await ok(as(recipient, 'GET', '/v1/haunts/waiting'))).toEqual({ waiting: 1 });
    expect(await ok(as(sender, 'GET', '/v1/haunts/waiting'))).toEqual({ waiting: 0 });
    expect(await ok(as({ token }, 'GET', '/v1/haunts/waiting'))).toEqual({ waiting: 0 });
  });

  it('is sent only with the words the server signed for the monster, whatever verdict the phone reports', async () => {
    const [sender, recipient] = await friends();
    const seed = '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50';
    const real = await signedWords(seed);

    const attempts = [
      // No words at all: a monster the server never wrote.
      { words: null },
      // The phone's own words under a real signature, and a signature for another monster.
      { words: { ...real, flavourText: 'Results from the clinic.' } },
      { words: await signedWords('00000000-0000-4000-8000-000000000000') },
      { words: { ...real, language: 'vi' } },
    ];
    for (const extra of attempts) {
      const refused = await send(sender, recipient, extra);
      expect(refused.status).toBe(400);
      expect(wireErrorSchema.parse(await refused.json()).error.detail).toEqual({
        reason: 'not_for_this_task',
      });
    }
    expect(await count('haunts WHERE sender = ?', sender.accountId)).toBe(0);
    expect(
      await count(
        'haunt_monsters WHERE haunt_id IN (SELECT id FROM haunts WHERE sender = ?)',
        sender.accountId,
      ),
    ).toBe(0);
    expect(JSON.stringify(await waiting(recipient))).not.toContain('clinic');
  });

  it('gives a catch the monster that was sent, its drawing and its signed words, then forgets the words', async () => {
    const [sender, recipient] = await friends();
    const seed = '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50';
    const spec = {
      bodyType: 'sock',
      seed,
      ink: 'lilac',
      size: 0.5,
      eyes: { count: 3, style: 'matched' },
      mouth: 'fangs',
      horns: 'none',
      antennae: 1,
      legs: 'none',
    };
    const words = await signedWords(seed);
    // A drawing of some other monster is not taken.
    expect(
      (await send(sender, recipient, { spec: { ...spec, seed: crypto.randomUUID() } })).status,
    ).toBe(400);
    const { pageId } = await ok<{ pageId: string }>(send(sender, recipient, { spec }));
    // The link's page shows the monster and none of its words.
    const page = JSON.stringify(await ok(as(undefined, 'GET', `/v1/haunt-page/${pageId}`)));
    expect(page).not.toContain(words.name);

    const caught = await ok<{ haunt: Record<string, unknown> }>(
      as(recipient, 'POST', `/v1/haunts/${pageId}/catch`, undefined, signingEnv),
    );
    expect(caught.haunt).toMatchObject({ id: pageId, bodyType: 'sock', seed, spec, words });
    expect(
      await count(
        'haunt_monsters WHERE haunt_id IN (SELECT id FROM haunts WHERE sender = ?)',
        sender.accountId,
      ),
    ).toBe(0);
    expect(await count("haunts WHERE id = ? AND state = 'caught'", pageId)).toBe(1);
  });
});
