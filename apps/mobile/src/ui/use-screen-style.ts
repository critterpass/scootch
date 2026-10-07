import { useEffect, useState } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';

import { colors, type Palette } from '@scootch/tokens';

import {
  useAppearance,
  useForcedVariant,
  useTextSizing,
  type TextSizing,
} from '../screens/registry/support/forced-variant';

import { useMayMove } from './motion/use-feel';

/** From this text scale up, rows of controls stack into full-width ones instead of squeezing. */
const STACKING_TEXT_SCALE = 1.6;

export interface ScreenStyle extends TextSizing {
  readonly palette: Palette;
  /** True at the large accessibility text sizes, where a screen reflows. */
  readonly largeText: boolean;
  /** True under a registry capture, which must look the same every time. */
  readonly captured: boolean;
  /**
   * True where nothing may move: the system's Reduce Motion, the app's Motion switch set to calm,
   * a capture, a serious task or a crisis day. The answer is `useFeel`'s, never worked out again.
   */
  readonly reducedMotion: boolean;
}

/** What every screen needs to draw itself: its inks, its text sizing and the motion setting. */
export function useScreenStyle(): ScreenStyle {
  const palette = colors[useAppearance()];
  const sizing = useTextSizing();
  const forced = useForcedVariant();
  const { fontScale } = useWindowDimensions();
  const mayMove = useMayMove();
  const largeText =
    forced === undefined ? fontScale >= STACKING_TEXT_SCALE : forced.textSize === 'largest';
  return {
    ...sizing,
    palette,
    largeText,
    captured: forced !== undefined,
    reducedMotion: !mayMove,
  };
}

/** Whether VoiceOver or TalkBack is on, kept up to date. */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let current = true;
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (current) setEnabled(on);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
