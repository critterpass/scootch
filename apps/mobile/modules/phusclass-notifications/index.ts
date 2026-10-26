import {
  nativePhusclassNotificationsModule as native,
  type NativeLocalNotification,
} from './src/PhusclassNotificationsModule';

export type { NativeLocalNotification };

/** False on Android and in a build made before the module existed. */
export function isAvailable(): boolean {
  return native !== null;
}

/**
 * Schedules one local notification. With a sender it arrives as a message from them, with their
 * picture and the app's badge; without one it is the app's own, with its title.
 */
export async function schedule(notification: NativeLocalNotification): Promise<void> {
  if (!native) throw new Error('No notification module in this build');
  await native.schedule(notification);
}
