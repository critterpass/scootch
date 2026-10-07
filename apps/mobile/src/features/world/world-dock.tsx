import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useScreenStyle } from '../../ui/use-screen-style';

export interface WorldDockItem {
  readonly label: string;
  readonly hint: string;
  readonly testID: string;
  readonly onPress: () => void;
}

const HEIGHT = 44;
const LABEL_SIZE = 15;
/** The most the largest text sizes enlarge a label here; past that it would leave its one line. */
const LABEL_CAP = 1.3;

/**
 * The two ways on from the world, side by side as small capsules. Each label keeps to one line at
 * every text size and in both languages: it grows a little with the phone's text size and is
 * fitted to its capsule beyond that, so the pair never wraps or stacks under the island.
 */
export function WorldDock({ items }: { readonly items: readonly WorldDockItem[] }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.testID}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityHint={item.hint}
          onPress={item.onPress}
          testID={item.testID}
          style={({ pressed }) => [
            styles.capsule,
            { backgroundColor: `${palette.ink}0F`, opacity: pressed ? 0.6 : 1 },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={LABEL_CAP}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.label,
              {
                color: palette.ink,
                fontSize: Math.min(size(LABEL_SIZE), LABEL_SIZE * LABEL_CAP),
              },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  capsule: {
    flex: 1,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  label: { fontFamily: fonts.body, fontWeight: '600' },
});
