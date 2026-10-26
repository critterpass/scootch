import { type NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  ActiveSessionActivity,
  PushToStartTokenEvent,
  PushTokenEvent,
  SessionActivityAttributes,
  SessionActivityStartOptions,
  SessionActivityState,
  SessionActivityUpdateOptions,
} from './ScootchLiveActivity.types';

type ScootchLiveActivityEvents = {
  onPushToken: (event: PushTokenEvent) => void;
  onPushToStartToken: (event: PushToStartTokenEvent) => void;
};

/** The Swift module (`ios/ScootchLiveActivityModule.swift`). */
export declare class NativeScootchLiveActivityModule extends NativeModule<ScootchLiveActivityEvents> {
  areActivitiesEnabled(): boolean;
  start(
    attributes: SessionActivityAttributes,
    state: SessionActivityState,
    options?: SessionActivityStartOptions,
  ): Promise<string>;
  update(
    id: string,
    state: SessionActivityState,
    options?: SessionActivityUpdateOptions,
  ): Promise<boolean>;
  end(
    id: string,
    finalState?: SessionActivityState | null,
    dismissAfterSeconds?: number | null,
  ): Promise<boolean>;
  listActive(): Promise<ActiveSessionActivity[]>;
  refreshShortcuts(): void;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativeScootchLiveActivityModule =
  requireOptionalNativeModule<NativeScootchLiveActivityModule>('ScootchLiveActivity');
