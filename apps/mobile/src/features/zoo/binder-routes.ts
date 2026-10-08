import type { Href } from 'expo-router';

import type { Id } from '@scootch/domain';

import type { ShelfSort } from './binder';

/** The binder's month pages, opened on this month or on the one named. */
export function pagesRoute(month?: string): Href {
  return month ? `/binder/pages?month=${month}` : '/binder/pages';
}

/**
 * One card out of its pocket. `sort` is the order the shelf was in, which the arrows browse in;
 * `month` keeps the arrows to that month's page when the card was opened from one.
 */
export function cardRoute(monsterId: Id, from: { sort?: ShelfSort; month?: string } = {}): Href {
  const query = [
    `id=${encodeURIComponent(monsterId)}`,
    ...(from.sort ? [`sort=${from.sort}`] : []),
    ...(from.month ? [`month=${from.month}`] : []),
  ].join('&');
  return `/binder/card?${query}` as Href;
}
