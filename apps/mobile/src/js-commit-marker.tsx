import { StyleSheet, Text, useColorScheme } from 'react-native';

import { colors, fonts, spacing } from '@scootch/tokens';

/**
 * Names the commit whose JavaScript is running. Device runs export the bundle with
 * EXPO_PUBLIC_JS_COMMIT set, and their first flow reads this label as proof of which code ran.
 * Every other bundle leaves the variable unset and renders nothing.
 */
export function JsCommitMarker() {
  const scheme = useColorScheme();
  const commit = process.env['EXPO_PUBLIC_JS_COMMIT'];
  if (commit === undefined || commit === '') return null;

  return (
    <Text
      testID="js-commit"
      pointerEvents="none"
      style={[styles.marker, { color: colors[scheme === 'dark' ? 'dark' : 'light'].muted }]}
    >
      {`js:${commit}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    bottom: spacing.xs,
    alignSelf: 'center',
    fontFamily: fonts.body,
    fontSize: 9,
  },
});
