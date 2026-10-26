import { type NativeModule, requireOptionalNativeModule } from 'expo';

export interface NativeLocalNotification {
  id: string;
  /** Milliseconds since 1970. */
  at: number;
  /** Shown above the body when the notification has no sender. */
  title: string | null;
  body: string;
  /** Who sends it: their name, and their picture's file name in the App Group. */
  senderName: string | null;
  senderImage: string | null;
  taskId: string | null;
  /** A picture that arrives with it: the address of a file, which the system takes as its own. */
  attachment: string | null;
  /**
   * His face at this pressure step (0 to 5) arrives with it when there is no other picture. Left
   * out for a serious or crisis task, which never carries pressure.
   */
  pressure?: number | null;
}

/** The Swift module (`ios/PhusclassNotificationsModule.swift`). */
export declare class NativePhusclassNotificationsModule extends NativeModule {
  schedule(notification: NativeLocalNotification): Promise<void>;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativePhusclassNotificationsModule =
  requireOptionalNativeModule<NativePhusclassNotificationsModule>('PhusclassNotifications');
