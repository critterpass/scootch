import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { specFromSeed } from '@scootch/art';
import {
  isOddWeek,
  type MonsterRow,
  type TaskCreateNameResponse,
  type TaskCreatePackResponse,
} from '@scootch/domain';

import nameFixture from '../../../../packages/voice/fixtures/task.create_name.en.json';
import packFixture from '../../../../packages/voice/fixtures/task.create_pack.en.json';
import { openRepositories } from '../data/repositories';

import { stagedPhone, stagedServer } from './test/staged-phone';

const name: TaskCreateNameResponse = nameFixture.response;
const pack = packFixture.response as TaskCreatePackResponse;
/** The staged phone's day. */
const TODAY = '2026-10-06';
const seeds = Array.from({ length: 200 }, (_, index) => `first-catch-${index}`);
/** A first catch whose owner finds this week odd, and one whose owner does not. */
const oddSeed = seeds.find((seed) => isOddWeek(seed, TODAY)) ?? '';
const plainSeed = seeds.find((seed) => !isOddWeek(seed, TODAY)) ?? '';

function caught(taskId: string, number: number): MonsterRow {
  return {
    id: `monster-${number}`,
    taskId,
    origin: 'task',
    spec: specFromSeed('tooth', taskId),
    name: 'Molar',
    title: 'Keeper of Thursday',
    flavourText: 'It waited.',
    hatchedAt: `2026-06-0${number}T09:00:00.000Z`,
    caughtAt: `2026-06-0${number}T10:00:00.000Z`,
    caughtOn: `2026-06-0${number}`,
    number,
    rarity: 'common',
    daysLurked: 0,
    catchMinutes: 10,
    dread: 1,
    finish: 'paper',
  };
}

async function hatchAfter(binder: readonly MonsterRow[]): Promise<MonsterRow | undefined> {
  const app = await stagedPhone(
    stagedServer({ name: () => Promise.resolve(name), pack: () => Promise.resolve(pack) }),
  );
  const { monsters } = openRepositories(app.data.db);
  for (const row of binder) await monsters.put(row);
  await app.say();
  await app.until(() => app.store.getState().monster !== null);
  return (await monsters.all()).find((row) => row.number === null);
}

describe('a hatch in an odd week', () => {
  it('stores the word on the monster, and leaves its name as it came', async () => {
    const hatched = await hatchAfter([caught(oddSeed, 1), caught('two', 2), caught('three', 3)]);
    expect(hatched?.oddWord).toBe('tiny');
    expect(hatched?.name).toBe(name.monster.name);
  });

  it('stores nothing in an ordinary week', async () => {
    const hatched = await hatchAfter([caught(plainSeed, 1), caught('two', 2), caught('three', 3)]);
    expect(hatched).toBeDefined();
    expect(hatched?.oddWord ?? null).toBeNull();
  });

  it('stores nothing before the fourth catch', async () => {
    const hatched = await hatchAfter([caught(oddSeed, 1), caught('two', 2)]);
    expect(hatched).toBeDefined();
    expect(hatched?.oddWord ?? null).toBeNull();
  });
});

describe('the folder of odd variations', () => {
  it('has every one of its files in its index, so a new one is a new file and nothing else', () => {
    const folder = path.join(__dirname, '../../../../packages/domain/src/rewards/odd');
    const files = readdirSync(folder)
      .filter((file) => !file.startsWith('index.'))
      .map((file) => file.replace(/\.ts$/, ''))
      .sort();
    const index = readFileSync(path.join(folder, 'index.generated.ts'), 'utf8');
    const listed = [...index.matchAll(/from '\.\/(.+)'/g)].map((found) => found[1]);
    expect(listed).toEqual(files);
  });
});
