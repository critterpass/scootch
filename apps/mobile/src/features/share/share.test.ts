import { describe, expect, it } from '@jest/globals';

import { fixtureMonster, fixtureTask } from '../reveal/registry/keep-fixtures';
import { cardDataFor } from '../zoo/zoo-cards';

import { ApiClientError } from '../../api/api-error';
import type { HttpClient } from '../../api/http-client';
import { createShareApi } from '../../api/share-api';

import { memoryKeptShares, monsterPageKey, type KeptShare } from './kept-shares';
import {
  cardShareRequest,
  linkOfCatch,
  pageOffered,
  saveCatch,
  savePicture,
  shareCatch,
  sharedPageOf,
  sharePicture,
  shareWeekClip,
  tellPageOfCatch,
  unshareCatch,
  type CatchShare,
  type ShareDevice,
  type SharePages,
} from './share-flow';
import {
  composeCardImage,
  composePage,
  composeShareImage,
  composeWanted,
  finishOfFrame,
  formatsOffered,
  frameOfFinish,
  guessOffered,
  takesFrame,
  type ShareDress,
  type ShareImage,
  type ShareImageOptions,
} from './share-image';
import { dayLog, monthBefore, monthWrap } from './share-logs';
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

/** A phone with nothing bought, nothing done today and no month to look back on. */
const plain: ShareDress = { finish: 'paper', member: null, plus: false, day: null, month: null };
const fixtureRows = (count: number) => {
  const monsters = Array.from({ length: count }, (_, index) => fixtureMonster(index));
  const tasks = new Map(monsters.map((monster, index) => [monster.taskId, fixtureTask(index)]));
  return { monsters, tasks };
};

describe('a shared picture', () => {
  it('never carries the task on a story, a card, a sticker sheet or a poster', () => {
    const { monsters, tasks } = fixtureRows(3);
    const first = monsters[0]!;
    const [year, month] = first.caughtOn.split('-').map(Number) as [number, number];
    const dress = { ...plain, month: monthWrap(monsters, tasks, year, month) };
    expect(dress.month).not.toBeNull();
    for (const format of ['story', 'card', 'stickers', 'poster'] as const) {
      for (const hideTask of [false, true]) {
        const words = texts(composeShareImage(format, card, { hideTask, language: 'en' }, dress));
        for (const word of task.text.split(' ').filter((one) => one.length > 3)) {
          expect([format, word, words.includes(word)]).toEqual([format, word, false]);
        }
      }
    }
    // The binder's leaf writes monsters' names under its pockets, and never a task.
    const leaf = texts(composePage(dress.month!, 0, 'en'));
    expect(leaf).toContain(first.name);
    for (const word of task.text.split(' ').filter((one) => one.length > 3)) {
      expect(['page', word, leaf.includes(word)]).toEqual(['page', word, false]);
    }
    // The catch itself is still on its story and its card.
    for (const format of ['story', 'card'] as const) {
      const image = composeShareImage(format, card, { hideTask: true, language: 'en' }, plain);
      expect(texts(image)).toContain(card.name);
    }
  });

  it('prints every picture on the finish that is worn, whatever the card was caught in', () => {
    const worn = composeShareImage('card', card, { hideTask: false, language: 'en' }, plain);
    const velvet = { ...plain, finish: 'flock' } as const;
    const other = composeShareImage('card', card, { hideTask: false, language: 'en' }, velvet);
    expect(texts(worn)).toContain('PAPER');
    expect(texts(other)).toContain('VELVET');
    expect(texts(other)).not.toContain('PAPER');
  });

  it("lists the day's tasks on the receipt until they are hidden, and then their monsters", () => {
    const { monsters, tasks } = fixtureRows(2);
    const first = monsters[0]!;
    const shown = dayLog(monsters, tasks, first.caughtOn, 'UTC', false);
    const hidden = dayLog(monsters, tasks, first.caughtOn, 'UTC', true);
    expect(shown?.rows.map((row) => row.label)).toContain(fixtureTask(0).text);
    expect(hidden?.rows.map((row) => row.label)).toContain(first.name);
    const image = composeShareImage(
      'receipt',
      card,
      { hideTask: true, language: 'en' },
      { ...plain, day: hidden },
    );
    for (const word of task.text.split(' ').filter((one) => one.length > 3)) {
      expect(texts(image)).not.toContain(word);
    }
    // The foil stamp is Plus's; the receipt itself is everyone's.
    expect(texts(image)).not.toContain('STAMPED');
    const stamped = composeShareImage(
      'receipt',
      card,
      { hideTask: true, language: 'en' },
      { ...plain, plus: true, day: hidden },
    );
    expect(texts(stamped)).toContain('STAMPED');
  });

  it('counts a day and a month only from tasks that may be shared', () => {
    const { monsters, tasks } = fixtureRows(3);
    const first = monsters[0]!;
    const [year, month] = first.caughtOn.split('-').map(Number) as [number, number];
    const all = monthWrap(monsters, tasks, year, month);
    const closed = [
      { ...fixtureTask(0), sharePrivate: true },
      { ...fixtureTask(0), screen: 'serious' as const },
      { ...fixtureTask(0), screen: 'unscreened' as const },
    ];
    for (const one of closed) {
      const guarded = new Map(tasks).set(first.taskId, one);
      expect(monthWrap(monsters, guarded, year, month)?.caught).toBe((all?.caught ?? 0) - 1);
      const log = dayLog(monsters, guarded, first.caughtOn, 'UTC', false);
      expect(log?.rows.map((row) => row.label) ?? []).not.toContain(one.text);
      expect(log?.rows.map((row) => row.label) ?? []).not.toContain(first.name);
    }
    // A task that is no longer stored is left out too, and a day with nothing left prints nothing.
    const forgotten = new Map(tasks);
    for (const monster of monsters) forgotten.delete(monster.taskId);
    expect(dayLog(monsters, forgotten, first.caughtOn, 'UTC', false)).toBeNull();
    expect(monthWrap(monsters, forgotten, year, month)).toBeNull();
  });

  it('offers the receipt only on a day with something on it, and the poster only for a month that had catches', () => {
    expect(formatsOffered(plain)).toEqual(['story', 'card', 'stickers']);
    const { monsters, tasks } = fixtureRows(1);
    const first = monsters[0]!;
    const day = dayLog(monsters, tasks, first.caughtOn, 'UTC', false);
    expect(formatsOffered({ day, month: null })).toEqual(['story', 'card', 'stickers', 'receipt']);
    expect(monthBefore('2026-01-03')).toEqual({ year: 2025, month: 12 });
    expect(monthBefore('2026-10-01')).toEqual({ year: 2026, month: 9 });
  });
});

describe('sharing a catch', () => {
  const share = {
    task,
    card,
    signed,
    format: 'story',
    dress: plain,
    hideTask: true,
    language: 'en',
  } as const;

  it('draws the picture and opens the share sheet', async () => {
    const { calls, device } = recorder();
    const { pages } = website();
    expect(await shareCatch(device, pages, share)).toBe('shared');
    expect(calls.sheets).toEqual([`image/png file:///scootch-story-1.png ${SITE}/s/molar-page1`]);
    expect(texts(calls.drawn[0]!)).not.toContain('dentist');
  });

  it('posts the card as its page draws it, and the task line only on a card that shows it', () => {
    const shown = cardShareRequest({ ...share, format: 'card', hideTask: false }, signed);
    expect(shown).toEqual({
      kind: 'card',
      language: 'en',
      card,
      screen: 'pass',
      signature: signed.signature,
    });
    expect(shown.card.taskLine).toBe(card.taskLine);

    const posts = [
      cardShareRequest({ ...share, format: 'card', hideTask: true }, signed),
      // A story's page never shows the task line, hidden or not.
      cardShareRequest({ ...share, format: 'story', hideTask: false }, signed),
      cardShareRequest({ ...share, format: 'story', hideTask: true }, signed),
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
    const cardShare = { ...share, format: 'card', signed: { ...signed, language: 'vi' } } as const;

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

    expect(pageOffered({ card, signed: written, format: 'story' })).toBe(true);
    // A sticker sheet, a receipt and a poster have no page, even for a catch that could have one.
    for (const format of ['stickers', 'receipt', 'poster'] as const) {
      expect(pageOffered({ card, signed: written, format })).toBe(false);
    }
    expect(await shareCatch(device, pages, { ...share, signed: written })).toBe('shared');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.body).toMatchObject({
      kind: 'story',
      language: 'vi',
      signature: signed.signature,
      card: { name: card.name, title: card.title, flavourText: card.flavourText, taskLine: null },
    });
  });

  it('sends a sticker sheet, a receipt and a poster as pictures alone, and asks the server nothing', async () => {
    for (const format of ['stickers', 'receipt', 'poster'] as const) {
      const { calls, device } = recorder();
      const { pages, sent } = website();
      expect(await shareCatch(device, pages, { ...share, format })).toBe('shared_picture');
      expect(sent).toEqual([]);
      expect(calls.sheets).toEqual([`image/png file:///scootch-${format}-1.png`]);
    }
  });

  it('shares a trading card as one turning video where the phone can write one, and as a picture where it cannot', async () => {
    const turning = recorder();
    const videos: { frames: number; name: string; fps: number }[] = [];
    turning.device.renderVideo = (frames, name, fps) => {
      videos.push({ frames: frames.length, name, fps });
      // Every frame is the same card: only the light on it moves.
      const words = frames.map((frame) => texts(frame));
      expect(new Set(words).size).toBe(1);
      expect(frames[0]).not.toEqual(frames[10]);
      return Promise.resolve(`file:///${name}.mp4`);
    };
    const { pages } = website();
    const cardShare = { ...share, format: 'card' } as const;
    expect(await shareCatch(turning.device, pages, cardShare)).toBe('shared');
    expect(videos).toEqual([{ frames: 40, name: 'scootch-card-1', fps: 20 }]);
    expect(turning.calls.sheets[0]).toMatch(/^video\/mp4 file:\/\/\/scootch-card-1\.mp4 /);
    expect(turning.calls.drawn).toEqual([]);
    // A story is never a video, whatever the phone can do.
    await shareCatch(turning.device, pages, share);
    expect(turning.calls.sheets[1]).toMatch(/^image\/png /);

    // A writer that fails leaves the picture, not nothing.
    const failing = recorder();
    failing.device.renderVideo = () => Promise.reject(new Error('disk full'));
    expect(await shareCatch(failing.device, website().pages, cardShare)).toBe('shared');
    expect(failing.calls.sheets[0]).toMatch(/^image\/png file:\/\/\/scootch-card-1\.png /);
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
    await shareCatch(device, pages, { ...share, format: 'card', hideTask: false });
    await shareCatch(device, pages, { ...share, format: 'card', hideTask: true });

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
    expect(await saveCatch(allowed.device, { ...share, format: 'card' })).toBe('saved');
    expect(allowed.calls.saved).toEqual(['file:///scootch-card-1.png']);
    expect(await saveCatch(recorder('refused').device, share)).toBe('refused');
  });

  it('copies the link of a page it puts up, and has none for a task that may not be shared', async () => {
    const { pages, sent } = website();
    expect(await linkOfCatch(pages, share)).toBe(`${SITE}/s/molar-page1`);
    expect(sent).toHaveLength(1);
    // A monster with no signature has no page, and a private task is never sent anywhere.
    expect(await linkOfCatch(pages, { ...share, signed: null })).toBeNull();
    expect(
      await linkOfCatch(pages, { ...share, task: { ...task, sharePrivate: true } }),
    ).toBeNull();
    expect(sent).toHaveLength(1);
  });

  it('sends a wanted poster as a picture alone, with the monster and never the task', async () => {
    const wanted = { monster: card.monster, name: card.name, title: card.title, day: 12, since: 9 };
    const poster = composeWanted(wanted, 'riso', 'en');
    expect(texts(poster)).not.toContain('dentist');
    const { calls, device } = recorder();
    expect(await sharePicture(device, poster, 'scootch-wanted')).toBe('shared_picture');
    expect(await savePicture(device, poster, 'scootch-wanted')).toBe('saved');
    expect(calls.sheets).toEqual(['image/png file:///scootch-wanted.png']);
    expect(calls.saved).toEqual(['file:///scootch-wanted.png']);
  });

  it('prints a story on a frame, opens on the frame of the finish that is worn, and frames nothing else', () => {
    expect(
      ['paper', 'riso', 'holo', 'flock', 'chrome', 'jelly', 'glass'].map((finish) =>
        frameOfFinish(finish as ShareDress['finish']),
      ),
    ).toEqual(['paper', 'riso', 'holo', 'velvet', 'paper', 'paper', 'paper']);
    // Paper and Riso are everyone's; the other two are a finish somebody has to be able to wear.
    expect((['paper', 'riso', 'holo', 'velvet'] as const).map(finishOfFrame)).toEqual([
      null,
      null,
      'holo',
      'flock',
    ]);
    expect(
      (['story', 'card', 'stickers', 'receipt', 'poster'] as const).filter(takesFrame),
    ).toEqual(['story']);
    const onVelvet = composeShareImage(
      'story',
      card,
      { hideTask: true, language: 'en' },
      {
        ...plain,
        frame: 'velvet',
      },
    );
    const onPaper = composeShareImage('story', card, { hideTask: true, language: 'en' }, plain);
    expect(JSON.stringify(onVelvet.commands)).not.toEqual(JSON.stringify(onPaper.commands));
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

describe('the guess line on a shared story', () => {
  const GUESS = /Thought \d+ (minutes|hours?)\. Took \d+/;
  const still = { hideTask: true, language: 'en' } as const;

  it('offers its switch only for the story of a catch that had a guess', () => {
    expect(guessOffered('story', 120)).toBe(true);
    expect(guessOffered('story', null)).toBe(false);
    expect(guessOffered('story', undefined)).toBe(false);
    for (const format of ['card', 'stickers', 'receipt', 'poster', 'page'] as const) {
      expect(guessOffered(format, 120)).toBe(false);
    }
  });

  it('prints the line on the story with a guess, and the story as it always was without one', () => {
    const on = composeShareImage('story', card, { ...still, guessMinutes: 120 }, plain);
    expect(texts(on)).toMatch(GUESS);
    // Switched off, and with no guess at all, the picture is the one the app made before.
    const before = composeShareImage('story', card, still, plain);
    expect(composeShareImage('story', card, { ...still, guessMinutes: null }, plain)).toEqual(
      before,
    );
    expect(texts(before)).not.toMatch(GUESS);
    // No other picture of the catch prints it.
    for (const format of ['card', 'stickers'] as const) {
      expect(
        texts(composeShareImage(format, card, { ...still, guessMinutes: 120 }, plain)),
      ).not.toMatch(GUESS);
    }
    expect(texts(composeCardImage(card, { ...still, guessMinutes: 120 }))).toMatch(GUESS);
    expect(composeCardImage(card, { ...still, guessMinutes: null })).toEqual(
      composeCardImage(card, still),
    );
  });

  it('sends and saves the picture the composer shows: with the line, or without it once it is switched off', async () => {
    // The composer hands the guess over on the share itself, beside the task's switch.
    type Guessed = CatchShare & Pick<ShareImageOptions, 'guessMinutes'>;
    const share = { task, card, signed, format: 'story', dress: plain, ...still } as const;
    const on: Guessed = { ...share, guessMinutes: 120 };
    const off: Guessed = { ...share, guessMinutes: null };
    const withLine = recorder();
    await shareCatch(withLine.device, website().pages, on);
    await saveCatch(withLine.device, on);
    expect(withLine.calls.drawn.map((image) => GUESS.test(texts(image)))).toEqual([true, true]);
    const without = recorder();
    await shareCatch(without.device, website().pages, off);
    await saveCatch(without.device, share);
    expect(without.calls.drawn.map((image) => GUESS.test(texts(image)))).toEqual([false, false]);
  });
});
