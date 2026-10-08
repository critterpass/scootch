import type { Unlocked } from '@scootch/domain';

import type { CustomerState } from '../plus/purchases-port';

import { FINISHES, FREE_LOOK, type StudioItem, type StudioKind } from './catalogue';
import { partOf, withPart, type Look } from './look';

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

/** What is worn, and what the studio is showing, which may be something only tried on. */
export interface StudioLooks {
  readonly worn: Look;
  readonly trying: Look;
}

/**
 * A swatch was picked. It is always shown; it is also put on, at once, when it may be worn. What
 * has to be bought first is only tried on until it is.
 */
export function afterPick(looks: StudioLooks, item: StudioItem, facts: WearFacts): StudioLooks {
  const trying = withPart(looks.trying, item.kind, item.id);
  if (!mayWear(item, facts)) return { worn: looks.worn, trying };
  return { worn: withPart(looks.worn, item.kind, item.id), trying };
}

/**
 * "Take it off", for the kind in focus alone. Something worn comes off for the one of its kind
 * that is everyone's; something only tried on goes back to what is worn. The other two kinds are
 * never touched.
 */
export function afterTakeOff(looks: StudioLooks, kind: StudioKind): StudioLooks {
  const focus = partOf(looks.trying, kind);
  const plain = FREE_LOOK[kind];
  if (partOf(looks.worn, kind) === focus && focus !== plain) {
    return {
      worn: withPart(looks.worn, kind, plain),
      trying: withPart(looks.trying, kind, plain),
    };
  }
  return { worn: looks.worn, trying: withPart(looks.trying, kind, partOf(looks.worn, kind)) };
}

/** Whether "Take it off" would change anything for the kind in focus. */
export function canTakeOff(looks: StudioLooks, kind: StudioKind): boolean {
  const after = afterTakeOff(looks, kind);
  return (
    partOf(after.worn, kind) !== partOf(looks.worn, kind) ||
    partOf(after.trying, kind) !== partOf(looks.trying, kind)
  );
}
