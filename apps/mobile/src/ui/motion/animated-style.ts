import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type Animated from 'react-native-reanimated';

/** The style an animated view takes. */
export type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

/**
 * A plain view style, as an animated view takes it. The two types differ only in values of
 * `position` that exist on the web and are never used in this app.
 */
export function plainStyle(style: StyleProp<ViewStyle>): AnimatedViewStyle {
  return style as AnimatedViewStyle;
}
