import { type NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  ActiveSessionActivity,
  PushToStartTokenEvent,
  PushTokenEvent,
  SessionActivityAttributes,
  SessionActivityStartOptions,
  SessionActivityState,
  SessionActivityUpdateOptions,
} from './PhusclassLiveActivity.types';

type PhusclassLiveActivityEvents = {
  onPushToken: (event: PushTokenEvent) => void;
  onPushToStartToken: (event: PushToStartTokenEvent) => void;
};

/** The Swift module (`ios/PhusclassLiveActivityModule.swift`). */
export declare class NativePhusclassLiveActivityModule extends NativeModule<PhusclassLiveActivityEvents> {
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
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativePhusclassLiveActivityModule =
  requireOptionalNativeModule<NativePhusclassLiveActivityModule>('PhusclassLiveActivity');
