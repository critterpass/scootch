import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { currentFold, watchFold, type NativeFoldReading } from '../../../modules/phusclass-fold';

import { foldLayout, type FoldLayout, type FoldReading } from './fold-layout';

function toReading(native: NativeFoldReading | null): FoldReading | null {
  if (native === null) return null;
  return { status: native.status, angle: native.angle, division: native.division ?? null };
}

// One subscription to the hinge for the whole app, however many screens read it.
let latest: FoldReading | null = null;
let stop: (() => void) | null = null;
const listeners = new Set<() => void>();

function publish(reading: FoldReading | null) {
  latest = reading;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (stop === null) {
    latest = toReading(currentFold());
    stop = watchFold((native) => publish(toReading(native)));
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stop !== null) {
      stop();
      stop = null;
    }
  };
}

/**
 * A hinge reading to use instead of the phone's, for a registry capture of a pose the simulator
 * cannot be put in by a flow.
 */
export const ForcedFold = createContext<FoldReading | null | undefined>(undefined);

/**
 * The pose and its layout, kept up to date as the phone folds, turns or shares its screen. A
 * screen reads it to place its parts; nothing it holds is reset by a change of pose.
 */
export function useFold(): FoldLayout {
  const forced = useContext(ForcedFold);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const live = useSyncExternalStore(subscribe, () => latest);
  // The fold's strip moves with the window: read it again whenever the window changes.
  useEffect(() => {
    if (forced === undefined) publish(toReading(currentFold()) ?? latest);
  }, [window.width, window.height, forced]);
  const reading = forced === undefined ? live : forced;
  const screen = Dimensions.get('screen');
  return useMemo(
    () =>
      foldLayout(
        { width: window.width, height: window.height },
        { width: screen.width, height: screen.height },
        reading,
        insets,
      ),
    [window.width, window.height, screen.width, screen.height, reading, insets],
  );
}
