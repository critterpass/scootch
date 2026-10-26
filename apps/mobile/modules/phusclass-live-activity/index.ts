import type {
  ActiveSessionActivity,
  LiveActivitySubscription,
  PushToStartTokenEvent,
  PushTokenEvent,
  SessionActivityAttributes,
  SessionActivityStartOptions,
  SessionActivityState,
  SessionActivityUpdateOptions,
} from './src/ScootchLiveActivity.types';
import { nativeScootchLiveActivityModule as native } from './src/ScootchLiveActivityModule';

export type {
  ActiveSessionActivity,
  LiveActivitySubscription,
  PushToStartTokenEvent,
  PushTokenEvent,
  SessionActivityAttributes,
  SessionActivityCaughtCard,
  SessionActivityHunt,
  SessionActivityStartOptions,
  SessionActivityState,
  SessionActivityStatus,
  SessionActivityTable,
  SessionActivityTableSeat,
  SessionActivityUpdateOptions,
} from './src/ScootchLiveActivity.types';

const NO_SUBSCRIPTION: LiveActivitySubscription = { remove: () => undefined };

/** False on Android, and on an iPhone where Live Activities are switched off for the app. */
export function areActivitiesEnabled(): boolean {
  return native?.areActivitiesEnabled() ?? false;
}

/**
 * Starts the session's Live Activity and resolves to its id, or to `null` where there are no Live
 * Activities (Android, or switched off). Rejects only when iOS refuses a request it could have
 * taken, such as one made while the app is in the background.
 */
export async function start(
  attributes: SessionActivityAttributes,
  state: SessionActivityState,
  options?: SessionActivityStartOptions,
): Promise<string | null> {
  if (!native?.areActivitiesEnabled()) return null;
  return native.start(attributes, state, options);
}

/** Resolves to whether an activity with that id was there to update. */
export async function update(
  id: string,
  state: SessionActivityState,
  options?: SessionActivityUpdateOptions,
): Promise<boolean> {
  if (!native) return false;
  return native.update(id, state, options);
}

/**
 * Ends the activity, optionally with a last state. `dismissAfterSeconds` of zero removes it from
 * the Lock Screen at once; left out, iOS decides how long it stays. Resolves to whether an
 * activity with that id was there to end.
 */
export async function end(
  id: string,
  finalState?: SessionActivityState,
  dismissAfterSeconds?: number,
): Promise<boolean> {
  if (!native) return false;
  return native.end(id, finalState ?? null, dismissAfterSeconds ?? null);
}

/** Every session activity iOS still holds, including ended ones it has not yet removed. */
export async function listActive(): Promise<ActiveSessionActivity[]> {
  if (!native) return [];
  return native.listActive();
}

/**
 * Tells Siri and Spotlight that the waiting monsters changed, so the names they offer are today's.
 * Nothing happens where there are no shortcuts, or in a binary made before them.
 */
export function refreshShortcuts(): void {
  try {
    native?.refreshShortcuts();
  } catch {
    // An older binary has no such call.
  }
}

/** Fires with the token for updating one activity started with `pushUpdates`. */
export function addPushTokenListener(
  listener: (event: PushTokenEvent) => void,
): LiveActivitySubscription {
  return native?.addListener('onPushToken', listener) ?? NO_SUBSCRIPTION;
}

/** Fires with the token for starting an activity by push (iOS 17.2 and later). */
export function addPushToStartTokenListener(
  listener: (event: PushToStartTokenEvent) => void,
): LiveActivitySubscription {
  return native?.addListener('onPushToStartToken', listener) ?? NO_SUBSCRIPTION;
}
