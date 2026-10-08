import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { BOUNCE_CURVE } from '../../../ui/motion/motion-tokens';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import type { StudioItem, StudioKind } from '../catalogue';

import { Swatch, swatchShape } from './swatch';

/** How far the chosen swatch rises, and how long it takes to get there. */
const LIFT = { by: -6, ms: 350 } as const;
/** The board gives each kind's swatch its own column: a card is narrower than a pot. */
const COLUMN: Record<StudioKind, number> = { finish: 46, ink: 56, trail: 62 };

export interface SwatchNote {
  /** The store's own price text, or the word for how it is already held; `null` shows nothing. */
  readonly text: string | null;
  /** A price is in tomato; something already held is quiet. */
  readonly priced: boolean;
}

function Lifted({ chosen, item }: { readonly chosen: boolean; readonly item: StudioItem }) {
  const { palette, reducedMotion } = useScreenStyle();
  const rise = useSharedValue(chosen ? LIFT.by : 0);
  useEffect(() => {
    const to = chosen ? LIFT.by : 0;
    rise.value = reducedMotion ? to : withTiming(to, { duration: LIFT.ms, easing: BOUNCE_CURVE });
  }, [chosen, reducedMotion, rise]);
  const lifted = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));
  return (
    <Animated.View
      style={[
        swatchShape(item.kind),
        {
          boxShadow: chosen
            ? `0 0 0 3px ${palette.page}, 0 0 0 5px ${palette.ink}`
            : '0 0 0 0.5px rgba(28,26,23,0.14), 0 4px 10px -4px rgba(28,26,23,0.25)',
        },
        lifted,
      ]}
    >
      <View style={[styles.clip, swatchShape(item.kind)]}>
        <Swatch item={item} />
      </View>
    </Animated.View>
  );
}

export interface SwatchStripProps {
  readonly kind: StudioKind;
  readonly items: readonly StudioItem[];
  readonly chosen: string;
  /** What is written under each swatch, by the item's id. */
  readonly notes: Readonly<Record<string, SwatchNote>>;
  readonly onPick: (item: StudioItem) => void;
}

/**
 * Everything of one kind, in a row that scrolls sideways to the screen's edges: each a swatch of
 * the real thing with its name and either its price or that it is already held. The chosen one
 * rises a little inside a ring.
 */
export function SwatchStrip({ kind, items, chosen, notes, onPick }: SwatchStripProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      contentContainerStyle={styles.row}
      testID={`studio-strip-${kind}`}
    >
      {items.map((item) => {
        const on = item.id === chosen;
        const note = notes[item.id];
        return (
          <PressSpring
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={note?.text ? `${t(item.name)}, ${note.text}` : t(item.name)}
            accessibilityHint={t('studio.item.hint')}
            onPress={() => onPick(item)}
            feedback="choice"
            testID={`studio-item-${item.id}`}
            style={[styles.item, { minWidth: COLUMN[kind] }]}
          >
            <Lifted chosen={on} item={item} />
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.6}
              numberOfLines={1}
              style={[
                styles.name,
                { color: palette.ink, fontSize: size(10.5), fontWeight: on ? '700' : '500' },
              ]}
            >
              {t(item.short)}
            </Text>
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.6}
              numberOfLines={1}
              style={[
                styles.note,
                { color: note?.priced ? palette.tomato : palette.muted, fontSize: size(9) },
              ]}
            >
              {(note?.text ?? ' ').toLocaleUpperCase()}
            </Text>
          </PressSpring>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Room above for the chosen swatch to rise into, ring and all.
  row: {
    paddingHorizontal: 24,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: 10,
    alignItems: 'flex-end',
  },
  item: { alignItems: 'center', gap: 7 },
  clip: { overflow: 'hidden' },
  name: { fontFamily: fonts.body },
  note: { fontFamily: STAMPED, fontWeight: '700' },
});
