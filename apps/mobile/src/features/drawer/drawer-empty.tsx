import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

const TITLE_SIZE = 20;
const BODY_SIZE = 15;
const FRONT = { width: 132, height: 46 } as const;

/**
 * The drawer with nothing in it: an open, empty drawer drawn in the page's own inks, one line
 * that says so, and what will end up here. It is the interface speaking, in plain words: nothing
 * here is Scootch's, and nothing counts anything.
 */
export function DrawerEmpty() {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <View testID="drawer-empty-state" style={styles.place}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.picture}
      >
        {/* The inside of the drawer, seen from above, with one dashed slip where a thing will lie. */}
        <View style={[styles.inside, { backgroundColor: `${palette.ink}0A` }]}>
          <View style={[styles.slip, { borderColor: `${palette.ink}33` }]} />
        </View>
        <View style={[styles.front, { backgroundColor: palette.surface }]}>
          <View style={[styles.knob, { backgroundColor: palette.tomato }]} />
        </View>
      </View>
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[
          styles.title,
          { color: palette.ink, fontSize: size(TITLE_SIZE), lineHeight: size(TITLE_SIZE) * 1.2 },
        ]}
      >
        {t('drawer.empty')}
      </Text>
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.body,
          { color: palette.muted, fontSize: size(BODY_SIZE), lineHeight: size(BODY_SIZE) * 1.4 },
        ]}
      >
        {t('drawer.empty.body')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  place: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 8 },
  picture: { alignItems: 'center', marginBottom: 14 },
  inside: {
    width: FRONT.width - 20,
    height: 40,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slip: {
    width: 64,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    transform: [{ rotate: '-4deg' }],
  },
  front: {
    width: FRONT.width,
    height: FRONT.height,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px -6px rgba(28, 26, 23, 0.28), 0 0 0 0.5px rgba(28, 26, 23, 0.08)',
  },
  knob: { width: 30, height: 8, borderRadius: 4 },
  title: { fontFamily: fonts.heading, fontWeight: '700', textAlign: 'center' },
  body: { fontFamily: fonts.body, textAlign: 'center' },
});
