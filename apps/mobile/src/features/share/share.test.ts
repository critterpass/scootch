import { describe, expect, it } from '@jest/globals';

import { fixtureMonster, fixtureTask } from '../reveal/registry/keep-fixtures';
import { cardDataFor } from '../zoo/zoo-cards';

import { ApiClientError } from '../../api/api-error';
import type { HttpClient } from '../../api/http-client';
import { createShareApi } from '../../api/share-api';

import { memoryKeptShares, monsterPageKey, type KeptShare } from './kept-shares';
import {
  cardShareRequest,
  pageOffered,
  saveCatch,
  shareCatch,
  sharedPageOf,
  shareWeekClip,
  tellPageOfCatch,
  unshareCatch,
  type ShareDevice,
  type SharePages,
} from './share-flow';
import { composeShareImage, type ShareImage } from './share-image';
import { shareOffered, shareOfferedOn } from './share-rules';

const task = fixtureTask(0);
const card = cardDataFor(fixtureMonster(0), task);
/** What the task call gave with the monster's words, as the phone stored it. */
const signed = {
  seed: card.monster.seed,
  language: 'en',
  signature: 'signed-by-the-server',
} as const;

/** A recorder standing in for the phone: what was drawn, written, shared and saved. */
function recorder(photos: 'saved' | 'refused' = 'saved') {
  const calls = {
    drawn: [] as ShareImage[],
    written: [] as string[],
    sheets: [] as string[],
    saved: [] as string[],
  };
  const device: ShareDevice = {
    renderPng: (image, name) => {
      calls.drawn.push(image);
      return Promise.resolve(`file:///${name}.png`);
    },
    writeFile: (name, bytes) => {
      calls.written.push(`${name}:${bytes.length}`);
      return Promise.resolve(`file:///${name}`);
    },
    openShareSheet: (uri, mimeType, link) => {
      calls.sheets.push(`${mimeType} ${uri}${link === undefined ? '' : ` ${link}`}`);
      return Promise.resolve();
    },
    saveToPhotos: (uri) => {
      if (photos === 'saved') calls.saved.push(uri);
      return Promise.resolve(photos);
    },
  };
  return { calls, device };
}

const SITE = 'https://scootch-web-dev.bkdev98.workers.dev';
const OFFLINE = new ApiClientError('network', false, null, 'offline');

/**
 * The server at the network boundary: what was sent, headers included, and an answer per call.
 * An `Error` answer is the call failing.
 */
function website(answers: Readonly<Record<string, unknown>> = {}, kept: readonly KeptShare[] = []) {
  const sent: { method: string; path: string; body: unknown; headers: unknown }[] = [];
  let pageNumber = 0;
  const request: HttpClient['request'] = (method, path, body, parse, options) => {
    sent.push({ method, path, body, headers: options?.headers ?? {} });
    const answer = answers[`${method} ${path}`];
    if (answer instanceof Error) return Promise.reject(answer);
    pageNumber += 1;
    const made = { id: `molar-page${pageNumber}`, unshareToken: `token-${pageNumber}` };
    return Promise.resolve(parse(answer ?? (path === '/v1/card-share' ? made : {})));
  };
  const http: HttpClient = {
    request,
    post: (path, body, parse) => request('POST', path, body, parse),
  };
  const pages: SharePages = { api: createShareApi(http), kept: memoryKeptShares(kept), site: SITE };
  return { sent, pages };
}

const texts = (image: ShareImage) =>
  image.commands.flatMap((command) => (command.op === 'text' ? [command.text] : [])).join('\n');

describe('a shared picture', () => {
  it('carries the task line until it is hidden, and then none of it', () => {
    for (const kind of ['story', 'card'] as const) {
      const shown = composeShareImage(kind, card, { hideTask: false, language: 'en' });
      expect(texts(shown)).toContain('Email the dentist');
      const hidden = composeShareImage(kind, card, { hideTask: true, language: 'en' });
      expect(texts(hidden)).not.toContain('dentist');
      for (const word of task.text.split(' ').filter((one) => one.length > 3)) {
        expect(texts(hidden)).not.toContain(word);
      }
      // Everything else about the card is still there.
      expect(texts(hidden)).toContain(card.name);
    }
  });
});

describe('sharing a catch', () => {
  const share = { task, card, signed, kind: 'story', hideTask: true, language: 'en' } as const;

  it('draws the picture and opens the share sheet', async () => {
    const { calls, device } = recorder();
    const { pages } = website();
    expect(await shareCatch(device, pages, share)).toBe('shared');
    expect(calls.sheets).toEqual([`image/png file:///scootch-story-1.png ${SITE}/s/molar-page1`]);
    expect(texts(calls.drawn[0]!)).not.toContain('dentist');
  });

  it('posts the card as its page draws it, and the task line only on a card that shows it', () => {
    const shown = cardShareRequest({ ...share, kind: 'card', hideTask: false }, signed);
    expect(shown).toEqual({
      kind: 'card',
      language: 'en',
      card,
      screen: 'pass',
      signature: signed.signature,
    });
    expect(shown.card.taskLine).toBe(card.taskLine);

    const posts = [
      cardShareRequest({ ...share, kind: 'card', hideTask: true }, signed),
      // A story's page never shows the task line, hidden or not.
      cardShareRequest({ ...share, kind: 'story', hideTask: false }, signed),
      cardShareRequest({ ...share, kind: 'story', hideTask: true }, signed),
    ];
    for (const post of posts) {
      expect(post.card).toEqual({ ...card, taskLine: null });
      expect(Object.keys(post).sort()).toEqual(['card', 'kind', 'language', 'screen', 'signature']);
      for (const word of task.text.split(' ').filter((one) => one.length > 3)) {
        expect(JSON.stringify(post)).not.toContain(word);
      }
    }
    // Nothing of the task but its line and its verdict: no id, and no text of its own.
    expect(JSON.stringify(shown)).not.toContain(task.id);
  });

  it('keeps the unshare token, shares the same page again, and takes it down with the token', async () => {
    const { calls, device } = recorder();
    const { pages, sent } = website();
    // The page is in the language the words were written and signed in.
    const cardShare = { ...share, kind: 'card', signed: { ...signed, language: 'vi' } } as const;

    await shareCatch(device, pages, cardShare);
    await shareCatch(device, pages, cardShare);
    expect(sent.map((one) => `${one.method} ${one.path}`)).toEqual(['POST /v1/card-share']);
    expect(await pages.kept.read()).toMatchObject([
      { id: 'molar-page1', unshareToken: 'token-1', language: 'vi', taskShown: false },
    ]);
    expect(calls.sheets[1]).toBe(`image/png file:///scootch-card-1.png ${SITE}/vi/c/molar-page1`);
    expect(await sharedPageOf(pages, cardShare)).toBe(`${SITE}/vi/c/molar-page1`);

    expect(await unshareCatch(pages, cardShare)).toBe('unshared');
    expect(sent.at(-1)).toEqual({
      method: 'DELETE',
      path: '/v1/card-share/molar-page1',
      body: null,
      headers: { 'X-Unshare-Token': 'token-1' },
    });
    expect(await pages.kept.read()).toEqual([]);
    expect(await unshareCatch(pages, cardShare)).toBe('nothing_up');
  });

  it('sends the stored signature and its language when a page goes up', async () => {
    const { device } = recorder();
    const { pages, sent } = website();
    const written = { ...signed, language: 'vi' } as const;

    expect(pageOffered({ card, signed: written })).toBe(true);
    expect(await shareCatch(device, pages, { ...share, signed: written })).toBe('shared');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.body).toMatchObject({
      kind: 'story',
      language: 'vi',
      signature: signed.signature,
      card: { name: card.name, title: card.title, flavourText: card.flavourText, taskLine: null },
    });
  });

  it('shares only the picture, and says so, for a monster with no signature', async () => {
    // Hatched before words were signed, or signed for another seed than the one it is drawn from.
    for (const none of [null, { ...signed, seed: 'another-seed' }]) {
      const { calls, device } = recorder();
      const { pages, sent } = website();
      const unsigned = { ...share, signed: none };

      expect(pageOffered(unsigned)).toBe(false);
      expect(await shareCatch(device, pages, unsigned)).toBe('shared_picture');
      // The picture goes to the sheet with no link, and nothing is posted or kept.
      expect(calls.sheets).toEqual(['image/png file:///scootch-story-1.png']);
      expect(sent).toEqual([]);
      expect(await pages.kept.read()).toEqual([]);
      expect(await sharedPageOf(pages, unsigned)).toBeNull();
      expect(await saveCatch(device, unsigned)).toBe('saved');
    }
  });

  it('takes the old page down before a page that shows something else goes up', async () => {
    const { device } = recorder();
    const { pages, sent } = website();
    await shareCatch(device, pages, { ...share, kind: 'card', hideTask: false });
    await shareCatch(device, pages, { ...share, kind: 'card', hideTask: true });

    expect(sent.map((one) => `${one.method} ${one.path}`)).toEqual([
      'POST /v1/card-share',
      'DELETE /v1/card-share/molar-page1',
      'POST /v1/card-share',
    ]);
    expect(await pages.kept.read()).toMatchObject([{ id: 'molar-page3', taskShown: false }]);
  });

  it('shares nothing and keeps nothing when the server cannot be reached', async () => {
    const { calls, device } = recorder();
    const { pages } = website({ 'POST /v1/card-share': OFFLINE });

    await expect(shareCatch(device, pages, share)).rejects.toBe(OFFLINE);
    expect(calls).toEqual({ drawn: [], written: [], sheets: [], saved: [] });
    expect(await pages.kept.read()).toEqual([]);
    expect(await sharedPageOf(pages, share)).toBeNull();
  });

  it('leaves the page and its token as they were when taking it down fails', async () => {
    const { device } = recorder();
    const up = website();
    await shareCatch(device, up.pages, share);
    const kept = await up.pages.kept.read();
    const down = website({ 'DELETE /v1/card-share/molar-page1': OFFLINE }, kept);

    await expect(unshareCatch(down.pages, share)).rejects.toBe(OFFLINE);
    expect(await down.pages.kept.read()).toEqual(kept);
  });

  it('tells a shared monster’s page of its catch once, with the token kept for it', async () => {
    const page: KeptShare = {
      key: monsterPageKey('dentist'),
      id: 'molar-7f3k9x',
      unshareToken: 'owner-token',
      language: 'en',
      taskShown: false,
    };
    const { pages, sent } = website({}, [page]);

    expect(await tellPageOfCatch(pages, { seed: 'someone-else', catchMinutes: 9 })).toBe(
      'nothing_to_tell',
    );
    expect(await tellPageOfCatch(pages, { seed: 'dentist', catchMinutes: 9 })).toBe('told');
    expect(await tellPageOfCatch(pages, { seed: 'dentist', catchMinutes: 9 })).toBe(
      'nothing_to_tell',
    );
    expect(sent).toEqual([
      {
        method: 'POST',
        path: '/v1/monster-page/molar-7f3k9x/caught',
        body: { catchMinutes: 9 },
        headers: { 'X-Unshare-Token': 'owner-token' },
      },
    ]);

    const offline = website({ 'POST /v1/monster-page/molar-7f3k9x/caught': OFFLINE }, [page]);
    await expect(tellPageOfCatch(offline.pages, { seed: 'dentist', catchMinutes: 9 })).rejects.toBe(
      OFFLINE,
    );
    expect(await offline.pages.kept.read()).toEqual([page]);
  });

  it('saves to Photos, or says the permission was refused', async () => {
    const allowed = recorder('saved');
    expect(await saveCatch(allowed.device, { ...share, kind: 'card' })).toBe('saved');
    expect(allowed.calls.saved).toEqual(['file:///scootch-card-1.png']);
    expect(await saveCatch(recorder('refused').device, share)).toBe('refused');
  });

  it('has no path for a private, serious, unscreened or forgotten task', async () => {
    const closed = [
      { ...task, sharePrivate: true },
      { ...task, screen: 'serious' as const },
      { ...task, screen: 'serious' as const, seriousOverridden: true },
      { ...task, screen: 'unscreened' as const },
      null,
    ];
    for (const one of closed) {
      expect(shareOffered(one)).toBe(false);
      const { calls, device } = recorder();
      const { pages, sent } = website();
      expect(await shareCatch(device, pages, { ...share, task: one })).toBe('not_offered');
      expect(await saveCatch(device, { ...share, task: one })).toBe('not_offered');
      expect(calls).toEqual({ drawn: [], written: [], sheets: [], saved: [] });
      // Nothing is posted for it either.
      expect(sent).toEqual([]);
    }
    // A crisis day shares nothing, whatever the card.
    expect(shareOfferedOn({ kind: 'crisis' }, task)).toBe(false);
    expect(shareOfferedOn({ kind: 'nothing_yet' }, task)).toBe(true);
    expect(shareOfferedOn({ kind: 'nothing_yet' }, { ...task, screen: 'serious' })).toBe(false);
    expect(shareOffered(task)).toBe(true);
    expect(shareOffered({ ...task, sharePrivate: null })).toBe(true);
  });

  it("sends the week's clip as an audio file of its own", async () => {
    const { calls, device } = recorder();
    const silence = {
      sampleRate: 44100,
      left: new Float32Array(100),
      right: new Float32Array(100),
    };
    expect(await shareWeekClip(device, silence, '2026-W41')).toBe('shared');
    expect(calls.written).toEqual(['scootch-2026-W41.wav:444']);
    expect(calls.sheets).toEqual(['audio/wav file:///scootch-2026-W41.wav']);
  });
});
