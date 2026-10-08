import type { Id } from '@scootch/domain';

import type { SqlDatabase } from '../data/table';

import type { DayContext, DayMemory, Offer } from './day-types';

/**
 * A thing that arrived from a monster's page on the website, and the page it came from. `holder`
 * is the task it became, or the drawer item it waits as.
 */
export interface ArrivedPage {
  readonly holder: Id;
  /** The id in `scootch.app/m/<id>`. */
  readonly page: string;
}

/** Which things on this phone arrived from which pages, kept across a relaunch. */
export interface ArrivedPages {
  all(): Promise<readonly ArrivedPage[]>;
  write(pages: readonly ArrivedPage[]): Promise<void>;
}

/** The newest arrivals kept. A thing older than these has long had its monster or gone. */
export const ARRIVED_PAGES_LIMIT = 50;

const KEY = 'arrivedPages';

function parse(stored: string | undefined): ArrivedPage[] {
  if (stored === undefined) return [];
  try {
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return (value as unknown[]).flatMap((one) => {
      const { holder, page } = (one ?? {}) as Record<string, unknown>;
      return typeof holder === 'string' && typeof page === 'string' ? [{ holder, page }] : [];
    });
  } catch {
    return [];
  }
}

/**
 * One key of the key and value table the settings live in, as the unsorted words are: it survives
 * a relaunch, goes with everything else when the person deletes their data, and is skipped by the
 * settings row, the backup and the export. Only ids are in it, never the thing's words.
 */
export function arrivedPagesStore(db: SqlDatabase): ArrivedPages {
  return {
    all: async () => {
      const rows = await db.getAllAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [KEY],
      );
      return parse(rows[0]?.value);
    },
    write: async (pages) => {
      if (pages.length === 0) {
        await db.runAsync('DELETE FROM settings WHERE key = ?', [KEY]);
        return;
      }
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
        [KEY, JSON.stringify(pages)],
      );
    },
  };
}

/** The page the thing with this id arrived from, or `null` when it came from nowhere. */
export async function arrivedPageOf(ctx: DayContext, holder: Id): Promise<string | null> {
  const kept = await ctx.deps.arrivedPages?.all();
  return kept?.find((one) => one.holder === holder)?.page ?? null;
}

/**
 * The thing with this id arrived from that page. Every task call made for it carries the page, so
 * the monster it hatches is the one on the page, however late the answer comes.
 */
export async function keepArrivedPage(
  ctx: DayContext,
  holder: Id,
  page: string | undefined,
): Promise<void> {
  const store = ctx.deps.arrivedPages;
  if (page === undefined || store === undefined) return;
  const others = (await store.all()).filter((one) => one.holder !== holder);
  await store.write([...others, { holder, page }].slice(-ARRIVED_PAGES_LIMIT));
}

/**
 * A thing changed hands with its words as they were (a drawer item became a task, or a task set
 * aside became a drawer item): the page it arrived from goes with it.
 */
export async function moveArrivedPage(ctx: DayContext, from: Id, to: Id): Promise<void> {
  const store = ctx.deps.arrivedPages;
  if (store === undefined || from === to) return;
  const kept = await store.all();
  const moved = kept.find((one) => one.holder === from);
  if (!moved) return;
  await store.write([
    ...kept.filter((one) => one.holder !== from && one.holder !== to),
    { holder: to, page: moved.page },
  ]);
}

/** The thing with this id was reworded: it is the person's own thing now, and no monster's. */
export async function forgetArrivedPage(ctx: DayContext, holder: Id): Promise<void> {
  const store = ctx.deps.arrivedPages;
  if (store === undefined) return;
  const kept = await store.all();
  if (kept.some((one) => one.holder === holder)) {
    await store.write(kept.filter((one) => one.holder !== holder));
  }
}

/** What tells whether a page's thing is on this phone: the pages kept, and the rows that hold them. */
export interface PageHolders {
  readonly arrivedPages?: ArrivedPages;
  readonly repositories: {
    readonly tasks: { get(id: Id): Promise<unknown> };
    readonly drawerItems: { get(id: Id): Promise<unknown> };
  };
}

/**
 * The task or the drawer item that holds this page, or `null` when its thing is not on this phone:
 * never taken in, or let go since. A finished task still holds its page, so its monster is not
 * made a second time.
 */
export async function holderOfPage(from: PageHolders, page: string): Promise<Id | null> {
  const { tasks, drawerItems } = from.repositories;
  for (const one of (await from.arrivedPages?.all()) ?? []) {
    if (one.page !== page) continue;
    if ((await tasks.get(one.holder)) || (await drawerItems.get(one.holder))) return one.holder;
  }
  return null;
}

/**
 * Words handed back to the composer keep the page they arrived with, in memory, for as long as
 * they are the next thing sent and are sent as they were.
 */
export function handBack(memory: DayMemory, offer: Offer): void {
  const { text, monsterPage } = offer;
  memory.handedBack = monsterPage === undefined ? null : { text: text.trim(), monsterPage };
}

/** The offer as it is sent: words handed back and sent again unchanged are still that monster's. */
export function withHandedBackPage(memory: DayMemory, offer: Offer): Offer {
  const back = memory.handedBack;
  memory.handedBack = null;
  if (offer.monsterPage !== undefined || back?.text !== offer.text.trim()) return offer;
  return { ...offer, monsterPage: back.monsterPage };
}

/** Whether this page's thing is already being asked about, or on the phone. */
export async function pageInHand(ctx: DayContext, page: string): Promise<boolean> {
  if (ctx.memory.offer?.monsterPage === page) return true;
  return (await holderOfPage(ctx.deps, page)) !== null;
}
