import { describe, expect, it } from 'vitest';

import { cardDataSchema, cardFinishSchema, type CardData } from '@scootch/domain';

import type { DrawCommand, TextCommand } from '../core/commands';
import { hash } from '../core/rng';
import { specFromSeed } from '../core/spec-from-seed';
import { estimateTextWidth } from '../core/text';
import {
  buildCard,
  buildCardLayers,
  CARD_FINISHES,
  CARD_WIDTH,
  type CardOptions,
} from './build-card';
import { buildCardBack } from './card-back';
import { buildStory } from './build-story';
import { CARD_LABELS } from './labels';

const molar: CardData = cardDataSchema.parse({
  monster: specFromSeed('tooth', 'dentist'),
  name: 'Molar, Keeper of Thursday',
  title: 'Inbox dweller',
  rarity: 'rare',
  number: 41,
  taskLine: 'email the dentist',
  daysLurked: 214,
  catchMinutes: 9,
  dread: 4,
  flavourText: 'Feeds on unread notifications. Weak against two-sentence replies.',
  finish: 'standard',
  caughtOn: '2026-10-06',
});

const texts = (commands: readonly DrawCommand[]): TextCommand[] =>
  commands.filter((command): command is TextCommand => command.op === 'text');
const printed = (commands: readonly DrawCommand[]): string =>
  texts(commands)
    .map((command) => command.text)
    .join(' ');

/** A command with its colours taken out: what a finish may not change. */
const shape = (command: DrawCommand): unknown =>
  'color' in command ? { ...command, color: '', alpha: 0 } : command;

describe('buildCard', () => {
  it('gives identical commands for the same data and options', () => {
    const options: CardOptions = { language: 'vi', tilt: { x: 0.3, y: -0.7 } };
    expect(buildCard(molar, options)).toEqual(buildCard({ ...molar }, { ...options }));
    expect(buildStory(molar, '9:16', options)).toEqual(buildStory({ ...molar }, '9:16', options));
  });

  it('prints the card data, and the fixed labels in the chosen language', () => {
    const en = printed(buildCard(molar));
    for (const part of ['Molar, Keeper of Thursday', 'INBOX DWELLER · RARE', 'No. 041']) {
      expect(en).toContain(part);
    }
    for (const part of ['“email the dentist”', '214 days', '9 min', 'Tue 6 Oct', 'scootch.app']) {
      expect(en).toContain(part);
    }
    expect(en).toContain('CAUGHT');
    const vi = printed(buildCard(molar, { language: 'vi' }));
    for (const part of ['Số 041', '214 ngày', '9 phút', 'Th 3, 6 thg 10', 'ĐÃ BẮT']) {
      expect(vi).toContain(part);
    }
  });

  it('carries no task text anywhere once the task is hidden', () => {
    const task = 'zzqx the dentist';
    const data = { ...molar, taskLine: task };
    expect(JSON.stringify(buildCard(data))).toContain('zzqx');
    for (const language of ['en', 'vi'] as const) {
      const options = { hideTask: true, language, headline: `Did ${task}.` };
      expect(JSON.stringify(buildCard(data, options))).not.toContain('zzqx');
      for (const format of ['4:5', '9:16'] as const) {
        expect(JSON.stringify(buildStory(data, format, options).commands)).not.toContain('zzqx');
      }
    }
  });

  it('changes only colours between finishes', () => {
    expect(Object.keys(CARD_FINISHES).sort()).toEqual([...cardFinishSchema.options].sort());
    const standard = buildCard(molar);
    for (const finish of cardFinishSchema.options) {
      const card = buildCard({ ...molar, finish });
      expect(card.map(shape), finish).toEqual(standard.map(shape));
      if (finish !== 'standard') expect(card, finish).not.toEqual(standard);
    }
  });

  it('leaves the stamp, the catch time and the caught line off a wild card', () => {
    for (const language of ['en', 'vi'] as const) {
      const labels = CARD_LABELS[language];
      const wild = texts(buildCard(molar, { wild: true, language })).map((line) => line.text);
      expect(wild).not.toContain(labels.stamp);
      expect(wild).not.toContain(labels.duration(0, 9));
      expect(wild).toContain(labels.notCaughtYet);
      const caught = buildCard(molar, { language });
      expect(texts(caught).map((line) => line.text)).toContain(labels.stamp);
      expect(buildCard(molar, { wild: true, language }).length).toBeLessThan(caught.length);
    }
  });

  it('moves the foil with the tilt, and holds it still with reduced motion', () => {
    const flat = buildCard(molar);
    const tilted = buildCard(molar, { tilt: { x: 0.8, y: -0.4 } });
    expect(tilted).not.toEqual(flat);
    expect(tilted.map((command) => command.op)).toEqual(flat.map((command) => command.op));
    expect(buildCard(molar, { tilt: { x: 0.8, y: -0.4 }, reducedMotion: true })).toEqual(flat);
  });
});

const WORDS = {
  en: ['a', 'the', 'Keeper', 'of', 'Thursday', 'notifications', 'two-sentence', 'I', 'unread'],
  vi: ['Kẻ', 'canh', 'giữ', 'ngăn', 'kéo', 'thứ', 'ba', 'nghiêng', 'biên', 'lai', 'ở'],
  odd: ['Pneumonoultramicroscopicsilicovolcanoconiosis', 'WWWWWWWWWWWW', 'x', '————', 'ỞỞỞỞỞỞ'],
};

/** Seeded text of exactly `length` characters, from short words, long words or both. */
function words(seed: number, length: number, pool: readonly string[]): string {
  let text = '';
  for (let i = 0; text.length < length; i++) {
    text += `${pool[Math.floor(hash(seed + i * 17) * pool.length)] ?? 'x'} `;
  }
  return text.slice(0, length).trim().padEnd(1, 'x');
}

describe('card text', { timeout: 60_000 }, () => {
  it('never prints a line wider than its box or below the foot of the card', () => {
    const pools = [WORDS.en, WORDS.vi, WORDS.odd, [...WORDS.en, ...WORDS.vi, ...WORDS.odd]];
    for (let run = 0; run < 400; run++) {
      const roll = (slot: number): number => hash(run * 131 + slot);
      const pool = pools[run % pools.length] ?? WORDS.en;
      // Every fourth run takes the longest text the contract allows.
      const longest = run % 4 === 3;
      const length = (slot: number, max: number): number =>
        longest ? max : 1 + Math.floor(roll(slot) * max);
      const data = cardDataSchema.parse({
        ...molar,
        name: words(run, length(1, 60), pool),
        title: words(run + 1, length(2, 40), pool),
        taskLine: words(run + 2, length(3, 280), pool),
        flavourText: words(run + 3, length(4, 160), pool),
        number: 1 + Math.floor(roll(5) ** 3 * 2_000_000),
        daysLurked: Math.floor(roll(6) ** 3 * 100_000),
        catchMinutes: 1 + Math.floor(roll(7) ** 3 * 50_000),
      });
      const language = run % 2 === 0 ? 'en' : 'vi';
      const card = buildCard(data, { language });
      const format = run % 3 === 0 ? '4:5' : '9:16';
      const story = buildStory(data, format, {
        language,
        headline: words(run + 4, length(8, 120), pool),
        time: '14:52',
      });
      for (const line of [...texts(card), ...texts(story.commands)]) {
        const style = { ...line, tracking: line.letterSpacing / line.size };
        expect(estimateTextWidth(line.text, style), line.text).toBeLessThanOrEqual(line.maxWidth);
        expect(line.size, line.text).toBeGreaterThanOrEqual(7);
      }
      // The foot of the card: nothing but the foot line itself sits below the dashed rule.
      const flavour = texts(card).filter((line) => line.italic);
      expect(flavour.length).toBeGreaterThan(0);
      for (const line of flavour) expect(line.y, line.text).toBeLessThan(412);
      for (const line of texts(card)) expect(line.y, line.text).toBeLessThan(444);
      // The story's own three blocks of text end above the card (9:16) or above Scootch (4:5).
      const cardStart = story.commands.findIndex((command) => command.op === 'save');
      const ownText = texts(story.commands.slice(0, cardStart));
      expect(ownText.length).toBeGreaterThanOrEqual(3);
      for (const line of ownText) {
        expect(line.y, line.text).toBeLessThan(format === '9:16' ? 214 : 474);
      }
    }
  });
});

describe('a card in layers', () => {
  it('carries exactly what the one list carries, with the monster and the stamp set apart', () => {
    for (const language of ['en', 'vi'] as const) {
      const whole = buildCard(molar, { language });
      const layers = buildCardLayers(molar, { language });
      const drawn = [...layers.under, ...layers.over, ...layers.stamp];
      expect(printed(drawn)).toBe(printed(whole));
      // The monster stands inside its panel, and the stamp turns about a point on the card's edge.
      expect(layers.monster.y + layers.monster.h).toBe(layers.panel.y + layers.panel.h);
      expect(layers.stampCentre.x).toBeGreaterThan(CARD_WIDTH - 60);
      expect(buildCardLayers(molar, { language, wild: true }).stamp).toEqual([]);
    }
  });

  it('gives the back the same frame as the front, so nothing jumps as the card turns', () => {
    const front = buildCard(molar)[0];
    const back = buildCardBack({ label: 'Wild task card' });
    expect(back[0] && 'path' in back[0] ? back[0].path : null).toEqual(
      front && 'path' in front ? front.path : undefined,
    );
    expect(printed(back)).toContain('WILD TASK CARD');
    const bare = buildCardBack({ label: 'Wild task card', scootch: false });
    expect(bare.length).toBeLessThan(back.length);
  });
});
