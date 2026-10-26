import { type NativeModule, requireOptionalNativeModule } from 'expo';

export interface NativeMonsterNotification {
  id: string;
  /** Milliseconds since 1970. */
  at: number;
  body: string;
  /** Who sends it: the monster's name, and its picture's file name in the App Group. */
  senderName: string | null;
  senderImage: string | null;
  taskId: string | null;
  /** True when the three actions and the bites hang under it. */
  actions: boolean;
  /** A picture that arrives with it: the address of a file, which the system takes as its own. */
  attachment: string | null;
}

export interface NativeActionLabels {
  hunt: string;
  tomorrow: string;
  turnDown: string;
}

/** The Swift module (`ios/ScootchNotificationsModule.swift`). */
export declare class NativeScootchNotificationsModule extends NativeModule {
  schedule(notification: NativeMonsterNotification): Promise<void>;
  setActionLabels(labels: NativeActionLabels): Promise<void>;
  setMorningHunt(): Promise<boolean>;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativeScootchNotificationsModule =
  requireOptionalNativeModule<NativeScootchNotificationsModule>('ScootchNotifications');
