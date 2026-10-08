import { ExtensionStorage } from '@bacons/apple-targets';
import { drawAsImage, Group, ImageFormat } from '@shopify/react-native-skia';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { File, Paths, type Directory } from 'expo-file-system';

import { buildMonster, buildScootch, VIEW_SIZE } from '@scootch/art';

import { refreshShortcuts } from '../../../modules/scootch-live-activity';

import { CommandLayer } from '../../art/skia-commands';

import { IslandStill } from '../world/island-still';

import type { MonsterPainter, SharedFiles, SharedStore, WorldPainter } from './surface-ports';

// The real phone behind each port. Nothing here is covered by the unit tests, which use fakes: it
// runs only in a native build.

/** The App Group of this variant of the app (`app.config.ts`, `targets/_shared/AppGroup.swift`). */
export function appGroupId(): string {
  return Constants.expoConfig?.extra?.['appVariant'] === 'prd'
    ? 'group.app.scootch'
    : 'group.app.scootch.dev';
}

/** The App Group's defaults through the targets library's bridge; a no-op off iOS. */
export function nativeSharedStore(): SharedStore {
  const storage = new ExtensionStorage(appGroupId());
  return {
    get: (key) => storage.get(key) ?? null,
    set: (key, value) => storage.set(key, value),
    remove: (key) => storage.remove(key),
    reloadSurfaces() {
      ExtensionStorage.reloadWidget();
      ExtensionStorage.reloadControls();
      refreshShortcuts();
    },
  };
}

/** Takes back a local notification that was set outside the app, by the id it was given. */
export const cancelNativeNotification = (id: string): Promise<void> =>
  Notifications.cancelScheduledNotificationAsync(id);

/** The App Group container. Where there is none (Android), nothing is ever there or written. */
export function nativeSharedFiles(): SharedFiles {
  const container = (): Directory | null => Paths.appleSharedContainers[appGroupId()] ?? null;
  const file = (name: string) => {
    const directory = container();
    return directory ? new File(directory, name) : null;
  };
  return {
    exists: (name) => file(name)?.exists ?? false,
    async write(name, bytes) {
      const target = file(name);
      if (!target) return;
      if (!target.exists) target.create();
      await target.write(bytes);
    },
    list: () =>
      (container()?.list() ?? []).filter((one) => one instanceof File).map((one) => one.name),
    remove: (name) => {
      const target = file(name);
      if (target?.exists) target.delete();
    },
  };
}

/** Draws the monster on Skia's off-screen surface and encodes it as a PNG. */
export const skiaMonsterPainter: MonsterPainter = {
  async paint(spec, pixels) {
    const scale = pixels / VIEW_SIZE;
    const image = await drawAsImage(
      <Group transform={[{ scale }]}>
        <CommandLayer commands={buildMonster(spec)} />
      </Group>,
      { width: pixels, height: pixels },
    );
    return image ? image.encodeToBytes(ImageFormat.PNG) : null;
  },
};

/** Draws the island as the world screen does, as one still picture. */
export const skiaWorldPainter: WorldPainter = {
  async paint(pieces, monsters, pixels, asleep) {
    const image = await drawAsImage(
      <IslandStill pieces={pieces} monsters={monsters} side={pixels} asleep={asleep} />,
      { width: pixels, height: pixels },
    );
    return image ? image.encodeToBytes(ImageFormat.PNG) : null;
  },
  async paintScootch(pixels) {
    const image = await drawAsImage(
      <Group transform={[{ scale: pixels / VIEW_SIZE }]}>
        <CommandLayer
          commands={buildScootch({
            mood: 'pleased',
            attitude: 'cheeky',
            workMode: null,
            reducedMotion: true,
            hat: null,
          })}
        />
      </Group>,
      { width: pixels, height: pixels },
    );
    return image ? image.encodeToBytes(ImageFormat.PNG) : null;
  },
};
