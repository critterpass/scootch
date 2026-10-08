import { specFromSeed } from '@scootch/art';
import {
  MONSTER_BODY_TYPE_IDS,
  isoFromInstant,
  parkThings,
  sameThing,
  type DrawerItemRow,
  type MonsterCopy,
  type MonsterRow,
  type Parkable,
  type TaskLabels,
  type TaskRow,
  type TaskScreen,
} from '@scootch/domain';
import { offlineLine, offlineMonsterName, offlinePacks } from '@scootch/voice';

import type { DayContext } from './day-types';
import { sizeStep } from './smaller';

export const TASK_TEXT_MAX = 280;

export function newTask(
  ctx: DayContext,
  text: string,
  source: TaskRow['source'],
  screen: TaskScreen,
): TaskRow {
  const { localDate } = ctx.memory.state;
  return {
    id: ctx.deps.nextId(),
    localDate,
    text,
    originalText: text,
    source,
    screen,
    seriousOverridden: false,
    status: 'set',
    carriedOver: false,
    firstMentionedOn: localDate,
    dueDate: null,
    workMode: null,
    fitsTenMinutes: null,
    sharePrivate: null,
    shrinkCount: 0,
    lines: null,
    notifications: [],
    createdAt: isoFromInstant(ctx.now()),
    bitesCaught: null,
    softUntil: null,
    finishedAt: null,
  };
}

/** Parks things in the drawer and returns the rows they are now, new or mentioned again. */
export async function park(
  ctx: DayContext,
  things: readonly Parkable[],
  screen: TaskScreen,
): Promise<DrawerItemRow[]> {
  if (things.length === 0) return [];
  const { drawerItems } = ctx.deps.repositories;
  const parked = parkThings({
    drawer: await drawerItems.all(),
    things,
    screen,
    today: ctx.memory.state.localDate,
    now: ctx.now(),
    nextId: ctx.deps.nextId,
  });
  for (const item of parked) await drawerItems.put(item);
  return parked.filter((item) => things.some((thing) => sameThing(thing.text, item.text)));
}

const seedOf = (task: TaskRow) =>
  [...task.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);

/** A plain name and card text for a monster the server never named, from the offline pack. */
export function fallbackCopy(ctx: DayContext, task: TaskRow, labels: TaskLabels): MonsterCopy {
  const { language, attitude } = ctx.memory.state.settings;
  const seed = seedOf(task);
  const titles = offlinePacks[language].monsterTitles;
  return {
    name: offlineMonsterName(language, labels.bodyType, seed),
    title: titles[seed % titles.length] ?? titles[0],
    flavourText: offlineLine(language, attitude, 'flavourText', seed),
  };
}

/** The task's monster, drawn at the size its shrinks so far have left it. */
export function monsterFor(
  ctx: DayContext,
  task: TaskRow,
  labels: TaskLabels,
  copy: MonsterCopy,
): MonsterRow {
  // The body comes from the task's meaning; with no label, the task's own id picks one.
  const ids = MONSTER_BODY_TYPE_IDS;
  const bodyType = labels.bodyType ?? ids[seedOf(task) % ids.length] ?? 'slime';
  // Words the server signed are signed for a seed of its choosing, and the monster is drawn from
  // that one; a monster the phone names itself is drawn from the task's own id.
  const spec = specFromSeed(bodyType, copy.signed?.seed ?? task.id);
  return {
    id: ctx.deps.nextId(),
    taskId: task.id,
    origin: 'task',
    spec: { ...spec, size: Math.max(0.25, spec.size * sizeStep(task.shrinkCount)) },
    ...copy,
    hatchedAt: isoFromInstant(ctx.now()),
    caughtAt: null,
    caughtOn: null,
    number: null,
    rarity: null,
    daysLurked: null,
    catchMinutes: null,
    dread: null,
    finish: 'paper',
  };
}
