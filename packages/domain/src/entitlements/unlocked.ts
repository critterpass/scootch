import { FREE_STARTS_PER_DAY, PLUS_STARTS_PER_DAY } from '../day';

/**
 * Where a user stands with the store. `expired` is a subscription or a trial that ran out or was
 * cancelled; `friend_pass_guest` is a free user seated at a Plus host's table.
 */
export const PURCHASE_STATES = [
  'free',
  'trial',
  'monthly',
  'yearly',
  'lifetime',
  'expired',
  'refunded',
  'friend_pass_guest',
] as const;
export type PurchaseState = (typeof PURCHASE_STATES)[number];

/** The states that hold Plus. Every other state is free Scootch, all of it. */
export const PLUS_STATES: readonly PurchaseState[] = ['trial', 'monthly', 'yearly', 'lifetime'];

/** Free forever, whatever the store says. No purchase state may take one of these away. */
export const ALWAYS_FREE = [
  'start',
  'day_loop',
  'all_attitudes',
  'all_work_modes',
  'all_monsters',
  'caught_cards',
  'world',
  'live_activity',
  'small_widget',
  'medium_widget',
  'control_center',
  'action_button',
  'join_table',
  'listen_to_sunday_record',
  'share',
] as const;
export type FreeCapability = (typeof ALWAYS_FREE)[number];

/** What Plus adds. Each is a quiet locked control in the place it lives. */
export const PLUS_ONLY = [
  'more_starts',
  'open_table',
  'friend_pass',
  'keep_records',
  'export_records',
  'extra_card_finishes',
  'binder',
  'extra_large_widget',
  'stand_by',
  'learning',
  'paper_camera',
  'screen_camera',
] as const;
export type PlusCapability = (typeof PLUS_ONLY)[number];

export type Capability = FreeCapability | PlusCapability;
export const CAPABILITIES: readonly Capability[] = [...ALWAYS_FREE, ...PLUS_ONLY];

/** A Plus host's pass covers this many free friends at a table. */
export const FRIEND_PASS_SEATS = 3;

export interface Unlocked {
  readonly plus: boolean;
  /** How many things may be started today. */
  readonly startsPerDay: number;
  /** Free friends this user's pass can seat at a table they open; zero without Plus. */
  readonly friendPassSeats: number;
  readonly capabilities: ReadonlySet<Capability>;
}

export function hasPlus(state: PurchaseState): boolean {
  return PLUS_STATES.includes(state);
}

/** The one place that decides what a purchase state unlocks. Every locked control reads it. */
export function unlockedBy(state: PurchaseState): Unlocked {
  const plus = hasPlus(state);
  return {
    plus,
    startsPerDay: plus ? PLUS_STARTS_PER_DAY : FREE_STARTS_PER_DAY,
    friendPassSeats: plus ? FRIEND_PASS_SEATS : 0,
    capabilities: new Set<Capability>(plus ? CAPABILITIES : ALWAYS_FREE),
  };
}

export function isUnlocked(state: PurchaseState, capability: Capability): boolean {
  return unlockedBy(state).capabilities.has(capability);
}

/** What a user has caught and kept. These only ever grow. */
export interface Holdings {
  readonly cards: number;
  readonly worldPieces: number;
  readonly surpriseDrops: number;
  /** Weeks whose record was kept while Plus was on. */
  readonly keptRecords: number;
  /** Cards wearing a finish other than the standard one. */
  readonly finishedCards: number;
}

/**
 * What a user still has after the store reports a new state. Losing Plus locks the controls that
 * add more; it never takes back a card, a piece, a drop, a kept record or a finish already applied.
 */
export function holdingsAfter(holdings: Holdings, _state: PurchaseState): Holdings {
  return holdings;
}
