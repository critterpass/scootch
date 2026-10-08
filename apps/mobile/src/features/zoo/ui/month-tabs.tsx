import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressSpring } from '../../../ui/motion/press-spring';
import { STAMPED } from '../../plus/ui/member-card';

/** The leaf's own paper, which a tab of another month is cut from. */
const LEAF = '#E9DFCF';
const INK = '#1C1A17';
const TOMATO = '#F0562E';
const MUTED = '#6F6A62';
/** A tab is as wide as its one line of small capitals and tall enough to press. */
const TAB = { width: 26, height: 46 } as const;

export interface MonthTab {
  /** `2026-09`. */
  readonly month: string;
  /** "SEP". */
  readonly short: string;
  /** "September", read out. */
  readonly name: string;
}

export interface MonthTabsProps {
  readonly tabs: readonly MonthTab[];
  /** The month the page is open on: its tab is ink. */
  readonly shown: string;
  /** This month, the page still being filled: its tab is tomato. */
  readonly current: string;
  readonly hint: string;
  readonly onShow: (month: string) => void;
}

/**
 * The index tabs down the page's outer edge, one for each month, newest at the foot. The open
 * month's is ink, this month's is tomato, and the others are the page's own paper. With many
 * months the column scrolls.
 */
export function MonthTabs({ tabs, shown, current, hint, onShow }: MonthTabsProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      accessibilityRole="tablist"
      style={styles.column}
      contentContainerStyle={styles.tabs}
    >
      {tabs.map((tab) => {
        const on = tab.month === shown;
        const now = tab.month === current;
        return (
          <PressSpring
            key={tab.month}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.name}
            accessibilityHint={hint}
            onPress={() => onShow(tab.month)}
            feedback="choice"
            hitSlop={{ left: 6, right: 12 }}
            testID={`binder-tab-${tab.month}`}
            style={[styles.tab, { backgroundColor: on ? INK : now ? TOMATO : LEAF }]}
          >
            {/* One line of capitals, turned to read down the tab. */}
            <View style={styles.turned}>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.word, { color: on || now ? '#FFFFFF' : MUTED }]}
              >
                {tab.short.toLocaleUpperCase()}
              </Text>
            </View>
          </PressSpring>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  column: { flexGrow: 0 },
  tabs: { gap: 6 },
  tab: {
    width: TAB.width,
    height: TAB.height,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turned: {
    width: TAB.height,
    height: TAB.width,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  word: { fontFamily: STAMPED, fontWeight: '700', fontSize: 9, letterSpacing: 1.26 },
});
