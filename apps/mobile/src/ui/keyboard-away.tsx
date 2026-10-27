import { Keyboard, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useKeyboardOpen } from './use-keyboard-open';

/**
 * Holds a part of a screen with a text field: a tap on its empty room puts the keyboard away, as a
 * tap beside a field does on the system's own screens. What is on it keeps its own touches, and it
 * is no control of its own to a screen reader.
 */
export function KeyboardAway(props: Omit<PressableProps, 'onPress' | 'accessible'>) {
  return <Pressable {...props} accessible={false} onPress={() => Keyboard.dismiss()} />;
}

/**
 * Laid over the room around a sheet with a text field, only while the keyboard is up: a tap
 * anywhere there puts the keyboard away and does nothing else. Drawn under the sheet.
 */
export function KeyboardCatcher() {
  const open = useKeyboardOpen();
  if (!open) return null;
  return <KeyboardAway style={StyleSheet.absoluteFill} testID="keyboard-catcher" />;
}
