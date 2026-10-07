import type { Unlocked } from '@scootch/domain';

import type { CustomerState } from '../plus/purchases-port';

import { FINISHES, type StudioItem } from './catalogue';
import { partOf, type Look } from './look';

/** What deciding needs: what the store says this Apple ID bought, and what Plus unlocks. */
export interface WearFacts {
  readonly ownedItems: CustomerState['ownedItems'];
  readonly capabilities: Unlocked['capabilities'];
}

/** Whether this Apple ID bought the item itself. The ones that are everyone's count as owned. */
export function owns(item: StudioItem, ownedItems: readonly string[]): boolean {
  return item.productId === null || ownedItems.includes(item.productId);
}

/**
 * Whether the item may be put on. Plus wears every finish; an ink and a trail are worn only when
 * bought. This is the one place that decides, and it asks the domain what Plus unlocks.
 */
export function mayWear(item: StudioItem, facts: WearFacts): boolean {
  if (owns(item, facts.ownedItems)) return true;
  return item.kind === 'finish' && facts.capabilities.has('extra_card_finishes');
}

/**
 * The look the person keeps after the store reports a change. Nothing already worn is taken off
 * when Plus ends: the controls that would put a new one on lock, and what is on stays on until it
 * is taken off.
 */
export function lookAfter(look: Look, _facts: WearFacts): Look {
  return look;
}

/**
 * What the action under an item does: nothing when it is already on, put it on when it may be
 * worn, otherwise buy it. A worn item never shows a price.
 */
export function actionFor(
  item: StudioItem,
  look: Look,
  facts: WearFacts,
): 'wearing' | 'wear' | 'buy' {
  if (partOf(look, item.kind) === item.id) return 'wearing';
  return mayWear(item, facts) ? 'wear' : 'buy';
}

/** How many finishes are this person's own to keep: Paper and each one bought. */
export function finishesOwned(ownedItems: readonly string[]): number {
  return FINISHES.filter((finish) => owns(finish, ownedItems)).length;
}
