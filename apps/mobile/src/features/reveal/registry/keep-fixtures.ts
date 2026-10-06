import { specFromSeed } from '@scootch/art';
import {
  addDays,
  MONSTER_BODY_TYPE_IDS,
  recordBarFor,
  type IsoDate,
  type MonsterRow,
  type RecordBarRow,
  type TaskRow,
  type WorldPieceRow,
} from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import { seedRoll } from '../../world/piece-kit';
import type { CaughtMonster } from '../../zoo/zoo-cards';

// Made-up keepsakes for the screen registry and the tests. The names and tasks stand in for what
// a person typed and what was written for them; none of it is anything Scootch says.

/** A Monday, so a week of fixtures starts on its first bar. */
export const FIXTURE_MONDAY: IsoDate = '2026-10-05';

const NAMES = [
  'Molar',
  'Receipt Hydra',
  'Ringaling',
  'Baron von Grout',
  'The Unreplied',
  'Sir Overdue',
];
const TASKS = {
  en: ['Email the dentist about Thursday', 'Reply to Sam', 'Take the bins out'],
  vi: ['Gửi email cho nha sĩ về lịch thứ Năm', 'Trả lời tin nhắn của Sâm', 'Mang rác ra ngoài'],
} as const satisfies Record<Language, readonly string[]>;

export function fixtureTask(index: number, language: Language = 'en'): TaskRow {
  const texts = TASKS[language];
  const text = texts[index % texts.length] ?? texts[0];
  const day = addDays(FIXTURE_MONDAY, index % 7);
  return {
    id: `fixture-task-${index}`,
    localDate: day,
    text,
    originalText: text,
    source: 'typed',
    screen: 'pass',
    seriousOverridden: false,
    status: 'finished',
    carriedOver: false,
    firstMentionedOn: day,
    dueDate: null,
    workMode: null,
    fitsTenMinutes: true,
    sharePrivate: false,
    shrinkCount: 0,
    lines: null,
    notifications: [],
    createdAt: `${day}T09:00:00.000Z`,
    finishedAt: `${day}T09:20:00.000Z`,
  };
}

/** The n-th caught monster: its body, its stats and its day all follow from its number. */
export function fixtureMonster(index: number): CaughtMonster {
  const roll = seedRoll(`fixture-${index}`);
  const body = MONSTER_BODY_TYPE_IDS[index % MONSTER_BODY_TYPE_IDS.length] ?? 'tooth';
  const day = addDays(FIXTURE_MONDAY, index % 7);
  const lurked = [0, 3, 21, 120][Math.floor(roll(1) * 4)] ?? 0;
  return {
    id: `fixture-monster-${index}`,
    taskId: `fixture-task-${index}`,
    origin: 'task',
    spec: specFromSeed(body, `fixture-${index}`),
    name: NAMES[index % NAMES.length] ?? 'Molar',
    title: 'the Postponed',
    flavourText: '-',
    hatchedAt: `${day}T09:00:00.000Z`,
    caughtAt: `${day}T09:20:00.000Z`,
    caughtOn: day,
    number: index + 1,
    rarity: lurked >= 90 ? 'rare' : lurked >= 14 ? 'uncommon' : 'common',
    daysLurked: lurked,
    catchMinutes: 3 + Math.floor(roll(2) * 40),
    dread: 1 + Math.floor(roll(3) * 5),
    finish: 'standard',
  };
}

export const fixtureMonsters = (count: number): CaughtMonster[] =>
  Array.from({ length: count }, (_, index) => fixtureMonster(index));

/** One world piece for each of the first `count` monsters; every seventh is a quiet, plain one. */
export function fixturePieces(count: number): WorldPieceRow[] {
  return Array.from({ length: count }, (_, index): WorldPieceRow => {
    const plain = index % 7 === 6;
    const roll = seedRoll(`fixture-${index}`);
    return {
      id: `fixture-piece-${String(index).padStart(4, '0')}`,
      kind: plain ? 'plain' : 'monster',
      monsterId: plain ? null : `fixture-monster-${index}`,
      x: roll(5),
      y: roll(6),
      seed: `fixture-${index}`,
      addedOn: addDays(FIXTURE_MONDAY, Math.floor(index / 3)),
    };
  });
}

/** The bars of the first `count` days of the fixture week, each earned by that day's monster. */
export function fixtureBars(count: number): RecordBarRow[] {
  return Array.from({ length: count }, (_, index) => ({
    ...recordBarFor(addDays(FIXTURE_MONDAY, index)),
    seed: `fixture-${index}`,
    monsterId: `fixture-monster-${index}`,
  }));
}

export const asRows = (monsters: readonly CaughtMonster[]): MonsterRow[] => [...monsters];
