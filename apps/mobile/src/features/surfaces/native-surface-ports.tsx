import { ExtensionStorage } from '@bacons/apple-targets';
import { drawAsImage, Group, ImageFormat } from '@shopify/react-native-skia';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { File, Paths, type Directory } from 'expo-file-system';

import { buildMonster, buildScootch, GROUND_Y, VIEW_SIZE } from '@scootch/art';

import { CommandLayer } from '../../art/skia-commands';

import { islandCommands } from '../world/island-commands';
import { ISLAND_SPACE, layoutIsland, SCOOTCH_AT } from '../world/island-layout';
import { inLandingOrder } from '../world/world-layout';

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

/**
 * Draws the island as the world screen does, with Scootch standing between what is behind him
 * and what is in front, as one still picture. Scootch is drawn in tomato, like every drawing of
 * him on a surface.
 */
export const skiaWorldPainter: WorldPainter = {
  async paint(pieces, monsters, pixels, asleep) {
    const unit = pixels / ISLAND_SPACE;
    const layout = layoutIsland(inLandingOrder(pieces, monsters));
    const drawing = islandCommands(layout, new Map(monsters.map((one) => [one.id, one])));
    const scootch = buildScootch({
      mood: asleep ? 'asleep' : 'pleased',
      attitude: 'cheeky',
      workMode: null,
      reducedMotion: true,
      hat: null,
    });
    const scale = layout.scootchScale * unit;
    const image = await drawAsImage(
      <Group>
        <Group transform={[{ scale: unit }]}>
          <CommandLayer commands={drawing.behind} />
        </Group>
        <Group
          transform={[
            { translateX: (SCOOTCH_AT.x - (VIEW_SIZE / 2) * layout.scootchScale) * unit },
            { translateY: (SCOOTCH_AT.y - GROUND_Y * layout.scootchScale) * unit },
            { scale },
          ]}
        >
          <CommandLayer commands={scootch} />
        </Group>
        <Group transform={[{ scale: unit }]}>
          <CommandLayer commands={drawing.inFront} />
        </Group>
      </Group>,
      { width: pixels, height: pixels },
    );
    return image ? image.encodeToBytes(ImageFormat.PNG) : null;
  },
};
