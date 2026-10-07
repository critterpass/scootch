import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A full-screen frame that keeps clear of the notch and the home bar. The insets are read from the
 * provider, which has them from the first frame, and applied as padding in the same layout pass as
 * everything inside. The native `SafeAreaView` applies them a moment after the first draw, which
 * moves a control after it has been drawn and leaves its hit area where it was.
 */
export function SafeFrame({ style, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      style={[
        style,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    />
  );
}
