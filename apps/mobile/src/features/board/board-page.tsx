import type { SkTypeface } from '@shopify/react-native-skia';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PhuMood } from '@phusclass/art/class';
import { fonts } from '@phusclass/tokens';

import { useT } from '../../i18n/i18n-provider';
import type { AnimatedViewStyle } from '../../ui/motion/animated-style';
import { useScreenStyle } from '../../ui/use-screen-style';

import { BoardFoot, BoardHeading } from './board-parts';
import { BoardRowView, type RowAction } from './board-row';
import type { BoardRow } from './board-rows';
import { CHALK } from './chalk';
import { RowMenu } from './row-menu';

export { LedgeHandle } from './board-parts';

export interface BoardPageProps {
  readonly rows: readonly BoardRow[];
  readonly dateLine: string;
  /** His one line at the foot of the board, or null. */
  readonly remark: string | null;
  /** His "Still yours?" for each old row that shows it. */
  readonly stillYours: Readonly<Record<string, string>>;
  readonly mood: PhuMood;
  readonly hand: SkTypeface | null;
  readonly onAction: (id: string, action: RowAction) => void;
  readonly onReword: (id: string, text: string) => void;
  readonly onLogbook: () => void;
  readonly onTimetable: () => void;
  /** The ledge at the foot, which pushes the board back up: its gesture belongs to the screen. */
  readonly ledge: ReactNode;
  /** Wraps the header, so the screen can hang the logbook's pull on it. */
  readonly header?: (children: ReactNode) => ReactNode;
  /** The words and controls fade in as the board grows; the chalkboard itself never fades. */
  readonly contentStyle?: AnimatedViewStyle;
  /** For a capture: the menu already open on a row. */
  readonly menuOpen?: { readonly id: string; readonly rewording?: boolean };
}

/**
 * The board: the chalkboard taken off the wall and grown to the whole screen, with every task in
 * his order, today's underlined, dates and tallies in the corner, and his line at the foot.
 */
export function BoardPage({
  rows,
  dateLine,
  remark,
  stillYours,
  mood,
  hand,
  onAction,
  onReword,
  onLogbook,
  onTimetable,
  ledge,
  header = (children) => children,
  contentStyle,
  menuOpen,
}: BoardPageProps) {
  const t = useT();
  const { size, allowFontScaling, largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [menu, setMenu] = useState(menuOpen ?? null);
  const menuRow = menu === null ? undefined : rows.find((row) => row.id === menu.id);
  // Reword needs the words in front of the person, so it always opens on the panel.
  const act = (id: string, action: RowAction) => {
    if (action === 'reword') setMenu({ id, rewording: true });
    else onAction(id, action);
  };

  const heading = header(
    <BoardHeading dateLine={dateLine} onTimetable={onTimetable} onLogbook={onLogbook} />,
  );
  const list =
    rows.length === 0 ? (
      <Text
        testID="board-empty"
        allowFontScaling={allowFontScaling}
        style={[styles.emptyHint, { fontSize: size(16) }]}
      >
        {t('board.empty.hint')}
      </Text>
    ) : (
      rows.map((row, index) => (
        <BoardRowView
          key={row.id}
          row={row}
          index={index}
          stillYours={stillYours[row.id] ?? null}
          open={openRow === row.id}
          onOpen={setOpenRow}
          onMenu={(id) => setMenu({ id })}
          onAction={act}
        />
      ))
    );
  const foot = <BoardFoot remark={remark} mood={mood} hand={hand} />;

  return (
    <View style={styles.board} testID="board">
      <View pointerEvents="none" style={styles.band} />
      <Animated.View style={[styles.fill, contentStyle]}>
        {largeText ? (
          // At the largest text sizes the heading and his line scroll with the rows, so no part
          // of the board is squeezed out.
          <ScrollView style={styles.fill} contentContainerStyle={styles.scrollAll}>
            {heading}
            <View style={styles.list}>{list}</View>
            {foot}
          </ScrollView>
        ) : (
          <>
            {heading}
            <ScrollView style={styles.fill} contentContainerStyle={styles.list}>
              {list}
            </ScrollView>
            {foot}
          </>
        )}
      </Animated.View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: CHALK.ledge }}>{ledge}</View>
      {menu !== null && menuRow !== undefined ? (
        <RowMenu
          row={menuRow}
          {...(menu.rewording ? { rewording: true } : {})}
          onAction={onAction}
          onReword={onReword}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    backgroundColor: CHALK.board,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 160,
    height: '200%',
    backgroundColor: CHALK.band,
    transform: [{ skewX: '-14deg' }],
    transformOrigin: 'top left',
  },
  scrollAll: {
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyHint: {
    color: CHALK.faint,
    fontFamily: fonts.body,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingTop: 24,
  },
});
