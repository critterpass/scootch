import { useEffect } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';
import { withTiming, type SharedValue, type WithTimingConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenStyle } from '../../ui/use-screen-style';
import { BUBBLE_ROOM } from '../desk/speech-bubble';

import { useKeyboardHeight } from './use-keyboard-height';

/** The desk sheet's grabber and the space round it, above its content. */
const SHEET_GRABBER = 29;

/**
 * How tall the typed field may grow: four lines, and at the largest text sizes no taller than the
 * room between his bubble and the keyboard, so the desk sheet riding the keyboard never reaches
 * under the bubble. The field scrolls past that.
 */
export function useFieldRoom(fourLines: number): number {
  const { largeText } = useScreenStyle();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  if (!largeText || keyboard === 0) return fourLines;
  // Below the bubble: the sheet's grabber, then the bar's own 5-point edges, then the field; under
  // it the sheet's 8 points above the keyboard.
  const room = height - keyboard - 8 - insets.top - BUBBLE_ROOM - SHEET_GRABBER - 10;
  return Math.max(46, Math.min(fourLines, room));
}

/**
 * Runs `open` to 1 as the keyboard comes up. Bringing the keyboard up holds the screen for a moment;
 * a morph started before that would have run out by the time anything is drawn again. Without a
 * keyboard event it starts a moment later anyway.
 */
export function useOpenWithKeyboard(open: SharedValue<number>, timing: WithTimingConfig): void {
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      open.set(withTiming(1, timing));
    };
    const shown = Keyboard.addListener('keyboardWillShow', start);
    const late = setTimeout(start, 350);
    return () => {
      shown.remove();
      clearTimeout(late);
    };
  }, [open, timing]);
}
