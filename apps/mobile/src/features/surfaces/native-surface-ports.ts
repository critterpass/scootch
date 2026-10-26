import { ExtensionStorage } from '@bacons/apple-targets';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import * as LiveActivity from '../../../modules/phusclass-live-activity';
import { getNetworkStateAsync } from '../offline/connection';

import type { ActivityPort, SharedStore } from './surfaces-sync';

// The real phone behind each port. Nothing here is covered by the unit tests, which drive the sync
// through ports that record: it runs only in a native build.

/** The App Group of this variant of the app (`app.config.ts`, `targets/_shared/AppGroup.swift`). */
export function appGroupId(): string {
  return Constants.expoConfig?.extra?.['appVariant'] === 'prd'
    ? 'group.com.phusclass'
    : 'group.com.phusclass.dev';
}

const NOTHING: SharedStore = {
  get: () => null,
  set: () => undefined,
  remove: () => undefined,
  reloadWidgets: () => undefined,
};

/** The App Group's defaults through the targets library's bridge; nothing at all off iOS. */
export function nativeSharedStore(): SharedStore {
  if (Platform.OS !== 'ios') return NOTHING;
  const storage = new ExtensionStorage(appGroupId());
  return {
    get: (key) => storage.get(key) ?? null,
    set: (key, value) => storage.set(key, value),
    remove: (key) => storage.remove(key),
    reloadWidgets: () => ExtensionStorage.reloadWidget(),
  };
}

async function isOffline(): Promise<boolean> {
  try {
    const network = await getNetworkStateAsync();
    return !(network.isInternetReachable ?? network.isConnected ?? true);
  } catch {
    return false;
  }
}

async function live(): Promise<string[]> {
  return (await LiveActivity.listActive())
    .filter((activity) => activity.status === 'active' || activity.status === 'stale')
    .map((activity) => activity.id);
}

/** The Live Activity through the local module, found by asking iOS which ones are live. */
export const nativeActivityPort: ActivityPort = {
  async start(attributes, state, staleDate) {
    const offline = state.mode === 'session' ? await isOffline() : false;
    await LiveActivity.start(
      attributes,
      { ...state, offline },
      staleDate === null ? undefined : { staleDate },
    );
  },
  async update(state, staleDate) {
    const offline = state.mode === 'session' ? await isOffline() : false;
    for (const id of await live()) {
      await LiveActivity.update(
        id,
        { ...state, offline },
        staleDate === null ? undefined : { staleDate },
      );
    }
  },
  async endAll() {
    for (const activity of await LiveActivity.listActive()) {
      if (activity.status !== 'dismissed') await LiveActivity.end(activity.id, undefined, 0);
    }
  },
};
