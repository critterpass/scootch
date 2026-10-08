import { Canvas } from '@shopify/react-native-skia';

import { asRows, fixtureMonsters, fixturePieces } from '../reveal/registry/keep-fixtures';

import { IconPickerPage } from './icon-picker-page';
import { mayShow } from './icons';
import { PREVIEW, WallpaperPage, type SaveState } from './wallpaper-page';
import { WallpaperScene, type WallpaperKind } from './wallpaper-scene';

// The icon picker as the registry draws it, with nothing behind it. Used by the registry and by
// the tests.

const nothing = () => undefined;

/** The picker as the board draws it: following the attitude, with only Paper's finish worn. */
export function IconPickerCapture() {
  return (
    <IconPickerPage
      icon="cheeky"
      follows="attitude"
      iconOf={{ attitude: 'cheeky', finish: 'paper', pinned: 'cheeky' }}
      mayShow={(icon) => mayShow(icon, (finish) => finish === 'paper')}
      onFollow={nothing}
      onPick={nothing}
      onClose={nothing}
    />
  );
}

/** With Plus, and one icon kept: every finish is open and the pick wears the ring. */
export function IconPickerPinned() {
  return (
    <IconPickerPage
      icon="holo"
      follows="pinned"
      iconOf={{ attitude: 'cheeky', finish: 'holo', pinned: 'holo' }}
      mayShow={() => true}
      onFollow={nothing}
      onPick={nothing}
      onClose={nothing}
    />
  );
}

function Wallpaper({
  kind = 'world',
  things = 42,
  saving = 'idle',
}: {
  readonly kind?: WallpaperKind;
  readonly things?: number;
  readonly saving?: SaveState;
}) {
  return (
    <WallpaperPage
      kind={kind}
      onKind={nothing}
      preview={
        <Canvas style={{ width: PREVIEW.width, height: PREVIEW.height }}>
          <WallpaperScene
            kind={kind}
            pieces={fixturePieces(things)}
            monsters={asRows(fixtureMonsters(things))}
            width={PREVIEW.width}
            height={PREVIEW.height}
          />
        </Canvas>
      }
      saving={saving}
      onSave={nothing}
      onOpenSettings={nothing}
      onOpenShortcuts={nothing}
      onClose={nothing}
    />
  );
}

export function WallpaperCapture() {
  return <Wallpaper />;
}

/** Day zero: nothing caught yet, so the wallpaper is Scootch alone on the sand. */
export function WallpaperEmptyWorld() {
  return <Wallpaper things={0} />;
}

/** Photos refused the picture: the page says so and offers the way to Settings. */
export function WallpaperPhotosRefused() {
  return <Wallpaper kind="night" saving="refused" />;
}
