import { Canvas, drawAsImage, ImageFormat } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import type { MonsterRow, WorldPieceRow } from '@scootch/domain';

import { useDispatch, useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';

import { PREVIEW, WallpaperPage, type SaveState } from './wallpaper-page';
import { WALLPAPER_PIXELS, WallpaperScene, type WallpaperKind } from './wallpaper-scene';

const NOTHING: readonly never[] = [];

/** Draws the wallpaper at a Lock Screen's size into a file and adds it to the person's photos. */
async function saveWallpaper(
  kind: WallpaperKind,
  pieces: readonly WorldPieceRow[],
  monsters: readonly MonsterRow[],
): Promise<'saved' | 'refused' | 'failed'> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'refused';
  const image = await drawAsImage(
    <WallpaperScene kind={kind} pieces={pieces} monsters={monsters} {...WALLPAPER_PIXELS} />,
    WALLPAPER_PIXELS,
  );
  if (!image) return 'failed';
  const file = new File(Paths.cache, `scootch-wallpaper-${kind}.png`);
  if (!file.exists) file.create();
  await file.write(image.encodeToBytes(ImageFormat.PNG));
  await MediaLibrary.saveToLibraryAsync(file.uri);
  return 'saved';
}

/**
 * Wallpaper on the real phone: the world is the person's own, read from the phone's tables. The
 * wallpaper looked at last is kept, since it is the one the Shortcuts action draws each morning.
 */
export function WallpaperContainer() {
  const { settings } = useToday();
  const { keepsakes } = useKeepsakes();
  const dispatch = useDispatch();
  const router = useRouter();
  const [saving, setSaving] = useState<SaveState>('idle');
  const kind = settings.wallpaper;
  const pieces = keepsakes?.pieces ?? NOTHING;
  const monsters = keepsakes?.monsters ?? NOTHING;

  return (
    <WallpaperPage
      kind={kind}
      onKind={(wallpaper) => {
        setSaving('idle');
        void dispatch({ type: 'settings_changed', changes: { wallpaper } }).catch(() => undefined);
      }}
      preview={
        <Canvas style={{ width: PREVIEW.width, height: PREVIEW.height }}>
          <WallpaperScene
            kind={kind}
            pieces={pieces}
            monsters={monsters}
            width={PREVIEW.width}
            height={PREVIEW.height}
          />
        </Canvas>
      }
      saving={saving}
      onSave={() => {
        setSaving('saving');
        void saveWallpaper(kind, pieces, monsters)
          .catch(() => 'failed' as const)
          .then(setSaving);
      }}
      onOpenSettings={() => void Linking.openSettings().catch(() => undefined)}
      onOpenShortcuts={() => void Linking.openURL('shortcuts://').catch(() => undefined)}
      onClose={() => goBack(router, '/settings')}
    />
  );
}
