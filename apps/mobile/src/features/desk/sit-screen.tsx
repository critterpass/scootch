import { StyleSheet, Text } from 'react-native';

import { fonts, fontSizes } from '@phusclass/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { SafeFrame } from '../../ui/safe-frame';
import { usePalette } from '../../ui/use-palette';

/** The desk before anything is on it: the warm page and one word, centred. */
export function SitScreen() {
  const t = useT();
  const palette = usePalette();
  const sizing = useTextSizing();
  return (
    <SafeFrame style={[styles.frame, { backgroundColor: palette.page }]} testID="desk-sit">
      <Text
        accessibilityRole="header"
        allowFontScaling={sizing.allowFontScaling}
        style={[styles.word, { color: palette.ink, fontSize: sizing.size(fontSizes.sentence) }]}
      >
        {t('desk.sit')}
      </Text>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
});
