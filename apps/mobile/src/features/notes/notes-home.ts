import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { HttpClient } from '../../api/http-client';
import { isPushBundleId, registerPushToken } from '../../api/push-client';

import { noteFaceAttachment } from '../surfaces/note-face';

import type { PlannedNote } from './notes-plan';

const NOTE_PREFIX = 'note-home-';
/** His name, which stays as it is in both languages. */
const SENDER = 'Thầy Phú';

/** Whether the system lets the app's notes through: granted, or delivered quietly. */
export async function notesAllowed(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

/** Whether the system would still show its own prompt, or the person already answered it. */
export async function notesAskable(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.canAskAgain && !status.granted;
}

/** The system's prompt, asked only when the person has said yes to his notes. */
export async function askForNotes(): Promise<boolean> {
  const answer = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return answer.granted || answer.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Replaces every planned note home with this plan. Nothing else the app scheduled is touched. */
export async function scheduleNotes(plan: readonly PlannedNote[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((one) => one.identifier.startsWith(NOTE_PREFIX))
      .map((one) => Notifications.cancelScheduledNotificationAsync(one.identifier)),
  );
  for (const note of plan) {
    // A local note never reaches the service extension, so his face is attached here.
    const face = await noteFaceAttachment(note.step);
    await Notifications.scheduleNotificationAsync({
      identifier: note.id,
      content: {
        title: SENDER,
        body: note.body,
        // His face at the note's pressure step, under the key the notification art reads
        // (0 calm to 5 glare; notes home use 1 to 3).
        data: { taskId: note.taskId, face: note.face, 'phu-pressure': note.step },
        threadIdentifier: 'notes-home',
        ...(face === null ? {} : { attachments: [face] }),
        interruptionLevel: note.timeSensitive ? 'timeSensitive' : 'active',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: note.at },
    });
  }
}

/** Takes back every note home, for notes switched off, a heavy day or a deleted student. */
export function cancelNotes(): Promise<void> {
  return scheduleNotes([]);
}

/**
 * Hands this phone's push token to the server, so a note can also come from there. Sent on every
 * launch with a connection, since Apple may change it. Quietly does nothing where there is no
 * token to give (a simulator, notes not allowed, an unknown build).
 */
export async function sendPushToken(http: HttpClient): Promise<void> {
  if (Platform.OS !== 'ios' || !(await notesAllowed())) return;
  const bundleId = Application.applicationId;
  if (!isPushBundleId(bundleId)) return;
  const environment = await Application.getIosPushNotificationServiceEnvironmentAsync();
  if (environment === null) return;
  const device = await Notifications.getDevicePushTokenAsync();
  if (typeof device.data !== 'string' || device.data === '') return;
  await registerPushToken(http, {
    token: device.data,
    environment: environment === 'production' ? 'production' : 'sandbox',
    bundleId,
  });
}
