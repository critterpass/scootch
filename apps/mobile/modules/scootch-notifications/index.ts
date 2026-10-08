import {
  nativeScootchNotificationsModule as native,
  type NativeActionLabels,
  type NativeMonsterNotification,
} from './src/ScootchNotificationsModule';

export type { NativeActionLabels, NativeMonsterNotification };

/** The category a monster's notification carries (`targets/_shared/MorningHunt.swift`). */
export const HUNT_CATEGORY = 'scootch.hunt';
/** The actions under it, as the response names them. */
export const HUNT_ACTIONS = {
  hunt: 'scootch.hunt.now',
  tomorrow: 'scootch.hunt.tomorrow',
  turnDown: 'scootch.hunt.turn-down',
} as const;

/** False on Android and in a build made before the module existed. */
export function isAvailable(): boolean {
  return native !== null;
}

/**
 * Schedules one local notification. With a sender it arrives as a message from that monster,
 * with its picture and Scootch's badge; without one it is Scootch's own.
 */
export async function schedule(notification: NativeMonsterNotification): Promise<void> {
  if (!native) throw new Error('No notification module in this build');
  await native.schedule(notification);
}

/** The words on the three actions, in the person's language. */
export async function setActionLabels(labels: NativeActionLabels): Promise<void> {
  await native?.setActionLabels(labels);
}

/**
 * Sets nine o'clock tomorrow for the thing carried on, as the nightstand's button does. False
 * where there is nothing carried on or no module.
 */
export async function setMorningHunt(): Promise<boolean> {
  return (await native?.setMorningHunt()) ?? false;
}
