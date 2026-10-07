import { CARD_LABELS, type CardLanguage } from '@scootch/art';
import {
  isoWeekOf,
  isUnlocked,
  type CardData,
  type IsoDate,
  type MonsterRow,
  type TaskRow,
} from '@scootch/domain';

/** A monster with its card: every card field was frozen at the catch. */
export type CaughtMonster = MonsterRow & {
  readonly [
    Field in 'caughtOn' | 'number' | 'rarity' | 'daysLurked' | 'catchMinutes' | 'dread'
  ]: NonNullable<MonsterRow[Field]>;
};

export function isCaught(monster: MonsterRow): monster is CaughtMonster {
  return (
    monster.number !== null &&
    monster.caughtOn !== null &&
    monster.rarity !== null &&
    monster.daysLurked !== null &&
    monster.catchMinutes !== null &&
    monster.dread !== null
  );
}

/** How the binder can order the cards. */
export const BINDER_SORTS = ['rarity', 'daysLurked', 'catchMinutes', 'bodyType'] as const;
export type BinderSort = (typeof BINDER_SORTS)[number];

/**
 * Whether the binder is open. The entitlement rules decide; until purchases are wired in, the one
 * thing known about the store is whether Plus is on.
 */
export function binderOpen(plus: boolean): boolean {
  return isUnlocked(plus ? 'lifetime' : 'free', 'binder');
}

const RARITY_ORDER = { rare: 0, uncommon: 1, common: 2 } as const;
const newestFirst = (a: CaughtMonster, b: CaughtMonster) => b.number - a.number;

const COMPARE: Record<BinderSort, (a: CaughtMonster, b: CaughtMonster) => number> = {
  rarity: (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity],
  daysLurked: (a, b) => b.daysLurked - a.daysLurked,
  catchMinutes: (a, b) => a.catchMinutes - b.catchMinutes,
  bodyType: (a, b) => a.spec.bodyType.localeCompare(b.spec.bodyType),
};

/**
 * The zoo: every caught monster, always, newest first. Plus hides none and adds none; it only
 * opens the binder's sorting, and a sort asked for without it is ignored.
 */
export function zooCards(
  monsters: readonly MonsterRow[],
  plus: boolean,
  sort: BinderSort | null = null,
): CaughtMonster[] {
  const caught = monsters.filter(isCaught).sort(newestFirst);
  if (sort === null || !binderOpen(plus)) return caught;
  return caught.sort((a, b) => COMPARE[sort](a, b) || newestFirst(a, b));
}

/** What the zoo's three-way control shows: everything, the rare ones, or this week's catches. */
export const ZOO_FILTERS = ['all', 'rare', 'thisWeek'] as const;
export type ZooFilter = (typeof ZOO_FILTERS)[number];

/**
 * The cards a filter leaves, in the order they came in. A filter only chooses what is on screen:
 * every card is still the person's. "This week" is the week of `today`, Monday to Sunday.
 */
export function filterCards(
  cards: readonly CaughtMonster[],
  filter: ZooFilter,
  today: IsoDate,
): CaughtMonster[] {
  if (filter === 'rare') return cards.filter((card) => card.rarity === 'rare');
  if (filter === 'thisWeek') {
    const { week } = isoWeekOf(today);
    return cards.filter((card) => isoWeekOf(card.caughtOn).week === week);
  }
  return [...cards];
}

/** How many of the cards wear the rare foil, for the line under the title. */
export function rareCount(cards: readonly CaughtMonster[]): number {
  return cards.filter((card) => card.rarity === 'rare').length;
}

/** The card as the art package draws it. `task` is the task's row, when it is still stored. */
export function cardDataFor(monster: CaughtMonster, task: Pick<TaskRow, 'text'> | null): CardData {
  return {
    monster: monster.spec,
    name: monster.name,
    title: monster.title,
    rarity: monster.rarity,
    number: monster.number,
    taskLine: task ? task.text.slice(0, 280) : null,
    daysLurked: monster.daysLurked,
    catchMinutes: monster.catchMinutes,
    dread: monster.dread,
    flavourText: monster.flavourText,
    finish: monster.finish,
    caughtOn: monster.caughtOn,
  };
}

/** What a screen reader says for a card, as one element: its name, its rarity and its stats. */
export function cardSpokenLabel(card: CardData, language: CardLanguage): string {
  const labels = CARD_LABELS[language];
  const hours = Math.floor(card.catchMinutes / 60);
  return [
    card.name,
    labels.rarity[card.rarity],
    labels.number(String(card.number).padStart(3, '0')),
    `${labels.lurked} ${labels.days(card.daysLurked)}`,
    `${labels.dread} ${card.dread}/5`,
    `${labels.caughtIn} ${labels.durationLong(hours, card.catchMinutes % 60)}`,
  ].join(', ');
}
