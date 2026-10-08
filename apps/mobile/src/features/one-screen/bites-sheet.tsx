import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { Tick } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { Sheet, SheetScroll } from '../../ui/sheet/sheet';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Words } from '../table/words';

import { bitesNote, type BiteRow } from './task-set-helpers';

const TEXT_SIZE = 17;
const SMALL_SIZE = 12;
const TICK = 30;

export interface BitesSheetProps {
  readonly open: boolean;
  /** The monster's name, or `null` when it has none to show. */
  readonly name: string | null;
  readonly rows: readonly BiteRow[];
  /** A bite was ticked. It is never un-ticked, and the last one opens the catch. */
  readonly onTick: (place: number) => void;
  readonly onClose: () => void;
}

/**
 * The thing in its three bites, each with its minutes and a tick: the same ticks as under the
 * monster's notification, kept in the same place. One line under them says where things stand.
 */
export function BitesSheet({ open, name, rows, onTick, onClose }: BitesSheetProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const note = bitesNote(rows);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      testID="bites-sheet"
      header={
        <View style={styles.head}>
          <Words kind="title">
            {name === null ? t('bites.title.plain') : t('bites.title', { name })}
          </Words>
          <Words kind="quiet">{t('bites.sub')}</Words>
        </View>
      }
    >
      <SheetScroll contentContainerStyle={styles.content}>
        {rows.map((row) => {
          const small = [
            ...(row.minutes === null ? [] : [t('bites.minutes', { minutes: row.minutes })]),
            ...(row.opensCatch ? [t('bites.opensCatch')] : []),
          ].join(' · ');
          return (
            <PressSpring
              key={row.place}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: row.ticked, disabled: row.ticked }}
              accessibilityLabel={small ? `${row.text}, ${small}` : row.text}
              accessibilityHint={row.ticked ? t('bites.ticked') : t('bites.tick.hint')}
              disabled={row.ticked}
              onPress={() => onTick(row.place)}
              feedback="choice"
              testID={`bite-${row.place}`}
              style={[styles.row, { backgroundColor: palette.surface }]}
            >
              <View style={styles.words}>
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[
                    styles.text,
                    {
                      color: row.ticked ? palette.muted : palette.ink,
                      fontSize: size(TEXT_SIZE),
                      lineHeight: size(TEXT_SIZE) * 1.3,
                    },
                    row.ticked && styles.struck,
                  ]}
                >
                  {row.text}
                </Text>
                {small ? (
                  <Text
                    allowFontScaling={allowFontScaling}
                    style={[
                      styles.small,
                      {
                        color: row.opensCatch ? palette.tomato : palette.muted,
                        fontSize: size(SMALL_SIZE),
                        lineHeight: size(SMALL_SIZE) * 1.4,
                      },
                    ]}
                  >
                    {small}
                  </Text>
                ) : null}
              </View>
              <View
                testID={`bite-${row.place}-${row.ticked ? 'ticked' : 'open'}`}
                style={[
                  styles.tick,
                  row.ticked
                    ? { backgroundColor: palette.tomato, borderColor: palette.tomato }
                    : { borderColor: `${palette.ink}33` },
                ]}
              >
                {row.ticked ? <Tick color={palette.onTomato} /> : null}
              </View>
            </PressSpring>
          );
        })}
        <Words kind="quiet" centred testID="bites-note" accessibilityLiveRegion="polite">
          {note.key === 'bites.note.down' ? t(note.key, { count: note.count }) : t(note.key)}
        </Words>
      </SheetScroll>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6, paddingHorizontal: 6 },
  content: { gap: 10, paddingBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 26,
    paddingVertical: 16,
    paddingLeft: 20,
    paddingRight: 16,
  },
  words: { flex: 1, gap: 4 },
  text: { fontFamily: fonts.body, fontWeight: '600' },
  struck: { textDecorationLine: 'line-through', fontWeight: '500' },
  small: {
    fontFamily: fonts.body,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tick: {
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
