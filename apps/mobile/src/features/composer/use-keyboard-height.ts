import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useAnimatedKeyboard, type SharedValue } from 'react-native-reanimated';

/** The on-screen keyboard's height in points, 0 while it is down. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * The keyboard's height as it moves, frame by frame on the UI thread, for what rides on top of it:
 * the sheet follows the keyboard exactly, never a frame ahead of it, and nothing re-renders.
 */
export function useKeyboardRide(): SharedValue<number> {
  return useAnimatedKeyboard().height;
}
