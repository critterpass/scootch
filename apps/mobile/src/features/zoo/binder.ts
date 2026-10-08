import { CARD_LABELS, formatCardDate, type CardLanguage } from '@scootch/art';
import {
  dayOfLurking,
  type Id,
  type IsoDate,
  type MonsterRow,
  type TaskRow,
} from '@scootch/domain';

import { showsComedy } from '../../state/shows-comedy';

import { isCaught, type CaughtMonster } from './zoo-cards';

/** How the shelf can be ordered. Newest first is everyone's; the other three are Plus. */
export const SHELF_SORTS = ['newest', 'longest', 'fastest', 'rarest'] as const;
export type ShelfSort = (typeof SHELF_SORTS)[number];

/** Whether a sort is the binder's, and so needs Plus. */
export function sortNeedsPlus(sort: ShelfSort): boolean {
  return sort !== 'newest';
}

const RANK = { common: 0, uncommon: 1, rare: 2 } as const;
const newestFirst = (a: CaughtMonster, b: CaughtMonster) => b.number - a.number;

const ORDER: Record<ShelfSort, (a: CaughtMonster, b: CaughtMonster) => number> = {
  newest: newestFirst,
  longest: (a, b) => b.daysLurked - a.daysLurked,
  fastest: (a, b) => a.catchMinutes - b.catchMinutes,
  rarest: (a, b) => RANK[b.rarity] - RANK[a.rarity],
};

/**
 * The shelf: every caught card, always. Plus hides none and adds none; it only opens the other
 * three orders, and one of those asked for without Plus is newest first.
 */
export function shelfCards(
  monsters: readonly MonsterRow[],
  sort: ShelfSort,
  plus: boolean,
): CaughtMonster[] {
  const caught = monsters.filter(isCaught);
  const order = sortNeedsPlus(sort) && !plus ? ORDER.newest : ORDER[sort];
  return caught.sort((a, b) => order(a, b) || newestFirst(a, b));
}

/**
 * The card that is out of its pocket: the one last shown, or the one a link asked for. The Lock
 * Screen's caught card knows the thing its monster came from, not the card, and asks by that
 * (`targets/widgets/SurfaceStyle.swift`). `null` is the first card of the order.
 */
export function cardOut(
  cards: readonly CaughtMonster[],
  shown: Id | null,
  taskId: Id | null,
): Id | null {
  if (shown !== null || taskId === null) return shown;
  return cards.find((card) => card.taskId === taskId)?.id ?? null;
}

/** The one number that matters for the order the shelf is in, as a pocket writes it. */
export function pocketStat(card: CaughtMonster, sort: ShelfSort, language: CardLanguage): string {
  const labels = CARD_LABELS[language];
  if (sort === 'longest') return labels.days(card.daysLurked);
  if (sort === 'fastest') {
    return labels.duration(Math.floor(card.catchMinutes / 60), card.catchMinutes % 60);
  }
  if (sort === 'rarest') return labels.rarity[card.rarity];
  return formatCardDate(card.caughtOn, language);
}

/** A page holds nine pockets: three rows of three. */
export const POCKETS = 9;

/** One month of the binder: the first nine monsters caught in it, in the order they were caught. */
export interface MonthPage {
  /** `2026-10`. */
  readonly month: string;
  readonly cards: readonly CaughtMonster[];
  /** How many were caught that month, which can be more than the page holds. */
  readonly caught: number;
  /** All nine pockets are filled: the page is stamped. */
  readonly complete: boolean;
}

export const monthOf = (date: IsoDate): string => date.slice(0, 7);

function pageOf(month: string, caught: readonly CaughtMonster[]): MonthPage {
  const inOrder = [...caught].sort((a, b) => a.number - b.number);
  return {
    month,
    cards: inOrder.slice(0, POCKETS),
    caught: inOrder.length,
    complete: inOrder.length >= POCKETS,
  };
}

/**
 * The binder's pages, oldest month first: one for every month something was caught in, and one
 * for this month even while it is empty, since that is the page being filled.
 */
export function monthPages(monsters: readonly MonsterRow[], today: IsoDate): MonthPage[] {
  const byMonth = new Map<string, CaughtMonster[]>([[monthOf(today), []]]);
  for (const monster of monsters) {
    if (!isCaught(monster)) continue;
    const month = monthOf(monster.caughtOn);
    byMonth.set(month, [...(byMonth.get(month) ?? []), monster]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, caught]) => pageOf(month, caught));
}

/** This month's page, which is always there. */
export function pageOfToday(monsters: readonly MonsterRow[], today: IsoDate): MonthPage {
  const month = monthOf(today);
  return pageOf(
    month,
    monsters.filter(isCaught).filter((monster) => monthOf(monster.caughtOn) === month),
  );
}

/** A monster that is hatched and not caught yet, waiting in an empty pocket. */
export interface WildOne {
  readonly monster: MonsterRow;
  /** Which day of waiting its thing is on, from 1. The thing's days, never the person's. */
  readonly day: number;
}

/**
 * The monsters still wild: hatched, not caught, and on a task that is still to do. A serious task
 * has no monster to show, with or without "it's fine, be funny", and a crisis day shows none.
 */
export function wildOnes(
  monsters: readonly MonsterRow[],
  tasks: ReadonlyMap<string, TaskRow>,
  today: IsoDate,
  crisis: boolean,
): WildOne[] {
  if (crisis) return [];
  return monsters.flatMap((monster) => {
    if (monster.caughtOn !== null) return [];
    const task = tasks.get(monster.taskId);
    if (!task || task.status === 'finished' || !showsComedy(task, 'monster')) return [];
    return [{ monster, day: dayOfLurking(task.firstMentionedOn, today) }];
  });
}
