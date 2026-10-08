import { describe, expect, it } from 'vitest';

import { CARD_FINISH_IDS, cardDataSchema, type CardData } from '@scootch/domain';

import { toSvg } from '../backends/svg';
import type { DrawCommand, TextCommand } from '../core/commands';
import { specFromSeed } from '../core/spec-from-seed';
import { estimateTextWidth } from '../core/text';
import { buildCaughtStory } from './build-caught-story';
import { buildPostcard } from './build-postcard';
import { buildBinderPage, PAGE_POCKETS } from './build-binder-page';
import { buildPoster, POSTER_MONSTERS } from './build-poster';
import { buildReceipt, RECEIPT_ROWS } from './build-receipt';
import { buildSleeve } from './build-sleeve';
import { buildStickerSheet } from './build-sticker-sheet';
import { buildStory } from './build-story';
import { buildTradingCard } from './build-trading-card';
import { buildWanted } from './build-wanted';
import { CARD_LABELS } from './labels';
import { SHARE_FRAMES, STORY } from './share-frame';

const molar: CardData = cardDataSchema.parse({
  monster: specFromSeed('tooth', 'dentist'),
  name: 'Molar, Keeper of Thursday',
  title: 'Inbox dweller',
  rarity: 'rare',
  number: 41,
  taskLine: 'zzqx the dentist',
  daysLurked: 214,
  catchMinutes: 9,
  dread: 4,
  flavourText: 'Feeds on unread notifications. Weak against two-sentence replies.',
  finish: 'holo',
  caughtOn: '2026-10-06',
});

const texts = (commands: readonly DrawCommand[]): TextCommand[] =>
  commands.filter((command): command is TextCommand => command.op === 'text');
const printed = (commands: readonly DrawCommand[]): string =>
  texts(commands)
    .map((command) => command.text)
    .join(' | ');
const fits = (commands: readonly DrawCommand[]): void => {
  for (const line of texts(commands)) {
    const style = { ...line, tracking: line.letterSpacing / line.size };
    expect(estimateTextWidth(line.text, style), line.text).toBeLessThanOrEqual(
      line.maxWidth + 0.01,
    );
    expect(line.size, line.text).toBeGreaterThanOrEqual(7);
  }
};
const LONG = 'Pneumonoultramicroscopicsilicovolcanoconiosis and then some more of it, at length';

describe('the story of a catch', () => {
  it('says what was done, how long it took and how long it waited, in either language', () => {
    const en = printed(buildStory(molar, { headline: 'Emailed the dentist.' }).commands);
    for (const part of [
      'CAUGHT.',
      'TUE 6 OCT',
      'took 9 minutes',
      'Emailed the dentist.',
      '214 days',
    ]) {
      expect(en).toContain(part);
    }
    expect(en).toContain('NO. 0041 · HOLO FOIL');
    const vi = printed(buildStory(molar, { language: 'vi' }).commands);
    for (const part of ['ĐÃ BẮT.', 'mất 9 phút', '214 ngày', 'ÁNH BẢY MÀU'])
      expect(vi).toContain(part);
  });

  it('prints the card on the finish it is given, and changes nothing else with it', () => {
    const shapes = (finish: CardData['finish']) =>
      texts(buildStory({ ...molar, finish }).commands).map((line) => [line.x, line.y, line.size]);
    for (const finish of CARD_FINISH_IDS) expect(shapes(finish), finish).toEqual(shapes('paper'));
    expect(buildStory({ ...molar, finish: 'flock' })).not.toEqual(buildStory(molar));
  });
});

describe('the trading card', () => {
  it('carries three true facts and never the task', () => {
    const card = buildTradingCard(molar, { time: '09:41' });
    const words = printed(card.commands);
    for (const part of [
      'INBOX DWELLER',
      'EPIC',
      'Lurked',
      '214 days',
      'Tue 09:41',
      '9 min',
      'NO. 0041',
    ]) {
      expect(words).toContain(part);
    }
    expect(JSON.stringify(card.commands)).not.toContain('zzqx');
    expect(printed(buildTradingCard(molar).commands)).toContain('Tue 6 Oct');
  });

  it('moves only its light when it leans, so its frames make one turning card', () => {
    const level = buildTradingCard(molar).commands;
    const leant = buildTradingCard(molar, { lean: { rx: 5, ry: 8 } }).commands;
    expect(leant.map((command) => command.op)).toEqual(level.map((command) => command.op));
    expect(printed(leant)).toBe(printed(level));
    expect(leant).not.toEqual(level);
  });
});

describe('the sticker sheet', () => {
  it('cuts the round sticker for a member with their number, and without one otherwise', () => {
    const base = { finish: 'holo', monster: molar.monster } as const;
    expect(printed(buildStickerSheet({ ...base, member: 42 }).commands)).toContain('MEMBER 0042');
    const free = printed(buildStickerSheet({ ...base, member: null }).commands);
    expect(free).not.toContain('MEMBER');
    expect(free).not.toContain('PLUS');
  });

  it('still makes a sheet for someone who has caught nothing yet', () => {
    const none = buildStickerSheet({ finish: 'paper', member: null, monster: null });
    const one = buildStickerSheet({ finish: 'paper', member: null, monster: molar.monster });
    expect(none.commands.length).toBeGreaterThan(0);
    expect(one.commands.length).toBeGreaterThan(none.commands.length);
  });
});

describe("the day's receipt", () => {
  const day = {
    date: '2026-10-07',
    rows: [
      { label: 'reply to Sam', time: '09:12' },
      { label: LONG, time: '11:40' },
    ],
    caught: 2,
    minutes: 112,
  } as const;

  it('lists what was done with its times and totals that are counted, not written', () => {
    const words = printed(buildReceipt({ ...day, stamp: null }).commands);
    for (const part of ['DONE LOG · WED 7 OCT 2026', 'reply to Sam', '09:12', '1 h 52 min']) {
      expect(words).toContain(part);
    }
    const totals = texts(buildReceipt({ ...day, stamp: null }).commands).map((line) => line.text);
    expect(totals[totals.indexOf('THINGS DONE') + 1]).toBe('2');
    expect(totals[totals.indexOf('MONSTERS CAUGHT') + 1]).toBe('2');
  });

  it('has the foil stamp only with Plus', () => {
    expect(printed(buildReceipt({ ...day, stamp: null }).commands)).not.toContain('STAMPED');
    expect(printed(buildReceipt({ ...day, stamp: 'chrome' }).commands)).toContain('STAMPED');
  });

  it('grows with the day, and stops listing after a dozen things', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      label: `thing ${index}`,
      time: '10:00',
    }));
    const short = buildReceipt({ ...day, stamp: null });
    const long = buildReceipt({ ...day, rows, stamp: null });
    expect(long.height).toBeGreaterThan(short.height);
    const listed = texts(long.commands).filter((line) => line.text.startsWith('thing '));
    expect(listed).toHaveLength(RECEIPT_ROWS);
    // The total still counts every one of them.
    expect(printed(long.commands)).toContain('| 30 |');
  });
});

describe("the month's poster", () => {
  const month = {
    year: 2026,
    month: 9,
    caught: 42,
    monsters: Array.from({ length: 20 }, (_, index) => specFromSeed('sock', `m${index}`)),
    most: { kind: 'paperwork', times: 9 },
    bestWeekday: 4,
  } as const;

  it('prints the count it is given and the facts counted for it', () => {
    const words = printed(buildPoster(month).commands);
    for (const part of [
      'SEPTEMBER, WRAPPED',
      '2026',
      '42',
      'monsters caught.',
      'paperwork, 9 times',
    ]) {
      expect(words).toContain(part);
    }
    expect(printed(buildPoster({ ...month, language: 'vi' }).commands)).toContain(
      'THÁNG 9, NHÌN LẠI',
    );
  });

  it('says nothing it was not given, and stands no more monsters than fit', () => {
    const bare = buildPoster({ ...month, most: null, bestWeekday: null, monsters: [] });
    expect(printed(bare.commands)).not.toMatch(/Most caught|Best day/);
    const some = (count: number) =>
      buildPoster({ ...month, monsters: month.monsters.slice(0, count) }).commands.length;
    expect(some(POSTER_MONSTERS + 5)).toBe(some(POSTER_MONSTERS));
    expect(some(3)).toBeLessThan(some(POSTER_MONSTERS));
  });
});

describe("the binder's leaf", () => {
  const pocket = (index: number) => ({
    monster: specFromSeed('sock', `p${index}`),
    name: `Sock ${index}`,
  });
  const leaf = {
    year: 2026,
    month: 9,
    caught: 22,
    pockets: Array.from({ length: 12 }, (_, index) => pocket(index)),
    stamped: true,
  } as const;

  it('prints the month, how full the leaf is and the names in its pockets', () => {
    const words = printed(buildBinderPage(leaf).commands);
    for (const part of [
      'September',
      '2026',
      '9 / 9',
      'Sock 0',
      'Sock 8',
      'COMPLETE',
      '22 CAUGHT',
    ]) {
      expect(words).toContain(part);
    }
    // Nine to a leaf: the tenth is on the next one.
    expect(words).not.toContain('Sock 9');
    expect(PAGE_POCKETS).toBe(9);
  });

  it('wears the stamp only when it is told to, and leaves an empty sleeve empty', () => {
    const part = buildBinderPage({ ...leaf, pockets: [pocket(0)], caught: 1, stamped: false });
    const words = printed(part.commands);
    expect(words).toContain('1 / 9');
    expect(words).toContain('1 monster caught.');
    expect(words).not.toContain('COMPLETE');
    expect(printed(buildBinderPage({ ...leaf, language: 'vi' }).commands)).toContain('ĐỦ BỘ');
  });
});

describe('every shared picture', () => {
  const pictures = (language: 'en' | 'vi') => [
    buildStory({ ...molar, name: LONG.slice(0, 60) }, { language, headline: LONG }),
    buildTradingCard({ ...molar, name: LONG.slice(0, 60), title: LONG.slice(0, 40) }, { language }),
    buildStickerSheet({ language, finish: 'jelly', member: 1_234_567, monster: molar.monster }),
    buildReceipt({
      language,
      date: '2026-10-07',
      rows: [{ label: LONG, time: '23:59' }],
      caught: 1,
      minutes: 50_000,
      stamp: 'riso',
    }),
    buildPoster({
      language,
      year: 2026,
      month: 12,
      caught: 1_234,
      monsters: [molar.monster],
      most: { kind: LONG, times: 999 },
      bestWeekday: 0,
    }),
    buildBinderPage({
      language,
      year: 2026,
      month: 12,
      caught: 1_234,
      pockets: Array.from({ length: 9 }, () => ({ monster: molar.monster, name: LONG })),
      stamped: true,
    }),
  ];

  it('never prints a line wider than its box, in either language, however long the words', () => {
    for (const language of ['en', 'vi'] as const)
      for (const picture of pictures(language)) fits(picture.commands);
  });

  it('is the same picture every time, and prints as a standalone image', () => {
    expect(pictures('en')).toEqual(pictures('en'));
    for (const picture of pictures('en')) {
      const svg = toSvg(picture.commands, picture);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain(`viewBox="0 0 ${picture.width} ${picture.height}"`);
    }
  });

  it('has every label in both languages', () => {
    expect(Object.keys(CARD_LABELS.vi).sort()).toEqual(Object.keys(CARD_LABELS.en).sort());
    expect(Object.keys(CARD_LABELS.vi.finish).sort()).toEqual([...CARD_FINISH_IDS].sort());
  });
});

describe('the story of a catch, on a frame', () => {
  it('carries the strip, the sentence, three numbers and the mark, on every frame', () => {
    for (const frame of SHARE_FRAMES) {
      const story = buildCaughtStory(molar, { frame, headline: 'Emailed the dentist.' });
      expect([story.width, story.height]).toEqual([STORY.width, STORY.height]);
      const words = printed(story.commands);
      for (const part of [
        'SCOOTCH · CAUGHT',
        'TUE 6 OCT',
        'CAUGHT.',
        'Emailed the dentist.',
        '214 days',
        '9 min',
        '4 / 5',
        'SCOOTCH.APP',
        'NO. 041',
        '06·10·26',
      ]) {
        expect(words, `${frame}: ${part}`).toContain(part);
      }
      fits(story.commands);
      expect(() => toSvg(story.commands, story)).not.toThrow();
    }
  });

  it('never prints the task, and drops the sentence about it when the task is hidden', () => {
    const shown = buildCaughtStory(molar, { headline: 'zzqx the dentist.' });
    expect(printed(shown.commands)).toContain('zzqx the dentist.');
    const hidden = buildCaughtStory(molar, { headline: 'zzqx the dentist.', hideTask: true });
    expect(JSON.stringify(hidden.commands)).not.toContain('zzqx');
    expect(printed(hidden.commands)).toContain(CARD_LABELS.en.storyHeadline);
    expect(printed(hidden.commands)).toContain('214 days');
  });

  it('fits a long sentence and a long name, in both languages', () => {
    for (const language of ['en', 'vi'] as const) {
      const story = buildCaughtStory(
        { ...molar, name: LONG, title: LONG },
        { language, headline: LONG },
      );
      fits(story.commands);
    }
  });
});

describe('the wanted poster', () => {
  const wild = {
    monster: molar.monster,
    name: 'Molar',
    title: 'Keeper of Thursday',
    day: 214,
    since: 3,
  };

  it('names the monster, its days and the month it turned up, and never the task', () => {
    for (const frame of SHARE_FRAMES) {
      const poster = buildWanted(wild, { frame });
      const words = printed(poster.commands);
      for (const part of [
        'SCOOTCH · STILL WILD',
        'SEEN 214 DAYS',
        'WANTED',
        'for lurking since March',
        'MOLAR, KEEPER OF THURSDAY',
        'Hold me to it.',
        'Reward: one coffee.',
      ]) {
        expect(words, `${frame}: ${part}`).toContain(part);
      }
      expect(texts(poster.commands).filter((line) => line.text === 'scootch.app')).toHaveLength(6);
      fits(poster.commands);
      expect(() => toSvg(poster.commands, poster)).not.toThrow();
    }
  });

  it('fits a long name in both languages', () => {
    for (const language of ['en', 'vi'] as const) {
      fits(buildWanted({ ...wild, name: LONG, title: LONG }, { language }).commands);
    }
  });
});

describe('a postcard from the world', () => {
  const world = { things: 71, month: 10, year: 2026, scene: [], sceneSize: 200 };

  it('counts what lives there on the strip, the postmark and the sentence, and names no task', () => {
    for (const frame of SHARE_FRAMES) {
      const card = buildPostcard(world, { frame });
      const words = printed(card.commands);
      for (const part of [
        'SCOOTCH · MY WORLD',
        '71 THINGS',
        'Greetings from',
        'my world.',
        'OCT 2026',
        'one small hill.',
        '71 / ∞',
      ]) {
        expect(words, `${frame}: ${part}`).toContain(part);
      }
      fits(card.commands);
      expect(() => toSvg(card.commands, card)).not.toThrow();
    }
    fits(buildPostcard({ ...world, things: 1 }, { language: 'vi' }).commands);
  });
});

describe("the week's record in its sleeve", () => {
  const week = {
    weekNumber: 41,
    week: '2026-W41',
    name: 'Molar and the Bin Bags',
    credits: [
      { position: 1, instrument: 'Keys', task: 'replied to Sam' },
      { position: 2, instrument: 'Bassline', task: 'zzqx the dentist' },
      { position: 7, instrument: 'Choir', task: null },
    ],
  };

  it('credits each day with its instrument, and its task only where there is one', () => {
    for (const frame of SHARE_FRAMES) {
      const sleeve = buildSleeve(week, { frame });
      const words = printed(sleeve.commands);
      for (const part of ['SCOOTCH · WEEK 41', '3 BARS', 'SIDE A', 'MON', 'Keys', 'SUN', 'Choir']) {
        expect(words, `${frame}: ${part}`).toContain(part);
      }
      expect(words).toContain('zzqx the dentist');
      fits(sleeve.commands);
      expect(() => toSvg(sleeve.commands, sleeve)).not.toThrow();
    }
  });

  it('names the week alone before it has a name, and fits a long one', () => {
    expect(printed(buildSleeve({ ...week, name: null }).commands)).toContain('WEEK 41');
    for (const language of ['en', 'vi'] as const) {
      fits(buildSleeve({ ...week, name: LONG }, { language }).commands);
    }
  });
});
