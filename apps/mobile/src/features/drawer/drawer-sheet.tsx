import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DrawerItemRow, Id, IsoDate } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { dayWords } from './day-words';

const TITLE_SIZE = 24;
const ROW_SIZE = 17;
const SMALL_SIZE = 15;

export interface DrawerSheetProps {
  /** From the day store, which opens it only on the person's own pull or their tap on "Peek". */
  readonly open: boolean;
  readonly items: readonly DrawerItemRow[];
  readonly today: IsoDate;
  /** False once today's thing has been started: nothing can be swapped for it then. */
  readonly canSwap: boolean;
  readonly onSwapIn: (itemId: Id) => void;
  readonly onClose: () => void;
}

/** The drawer: what is parked, listed calmly with any dates, each one a tap away from today. */
export function DrawerSheet({ open, items, today, canSwap, onSwapIn, onClose }: DrawerSheetProps) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const { language } = useLanguage();
  const t = useT();
  const dated = items.filter((item) => item.dueDate !== null).length;
  const text = (tone: string, points: number) => ({ color: tone, fontSize: size(points) });

  return (
    <Modal
      visible={open}
      transparent
      animationType={reducedMotion ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={[styles.shade, { backgroundColor: `${palette.ink}40` }]}>
        <SafeAreaView
          edges={['bottom']}
          testID="drawer"
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: palette.page }]}
        >
          <View style={styles.head}>
            <Text
              accessibilityRole="header"
              allowFontScaling={allowFontScaling}
              style={[styles.title, text(palette.ink, TITLE_SIZE)]}
            >
              {t('drawer.title')}
            </Text>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.body, text(palette.muted, SMALL_SIZE)]}
            >
              {items.length === 0
                ? t('drawer.empty')
                : t('drawer.count', { parked: items.length, dated })}
            </Text>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.rows}>
            {items.map((item, index) => {
              const when =
                item.dueDate === null
                  ? t('drawer.noDate')
                  : t('drawer.dated', {
                      due: dayWords(item.dueDate, today, language),
                      back: dayWords(item.returnOn ?? item.dueDate, today, language),
                    });
              return (
                <View
                  key={item.id}
                  testID={`drawer-item-${index}`}
                  style={[styles.row, { backgroundColor: palette.surface }]}
                >
                  <View
                    accessible
                    accessibilityLabel={`${item.text}, ${when}`}
                    style={styles.words}
                  >
                    <Text
                      allowFontScaling={allowFontScaling}
                      style={[styles.body, text(palette.ink, ROW_SIZE)]}
                    >
                      {item.text}
                    </Text>
                    <Text
                      allowFontScaling={allowFontScaling}
                      style={[
                        styles.body,
                        text(item.dueDate === null ? palette.muted : palette.tomato, SMALL_SIZE),
                      ]}
                    >
                      {when}
                    </Text>
                  </View>
                  {canSwap ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('drawer.swapIn')}: ${item.text}`}
                      accessibilityHint={t('drawer.swapIn.hint')}
                      onPress={() => onSwapIn(item.id)}
                      testID={`drawer-swap-${index}`}
                      style={[styles.swap, { backgroundColor: `${palette.ink}0F` }]}
                    >
                      <Text
                        allowFontScaling={allowFontScaling}
                        style={[styles.strong, text(palette.ink, SMALL_SIZE)]}
                      >
                        {t('drawer.swapIn')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.body, styles.fades, text(palette.muted, SMALL_SIZE)]}
            >
              {t('drawer.fades')}
            </Text>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
            accessibilityHint={t('drawer.close.hint')}
            onPress={onClose}
            testID="drawer-close"
            style={styles.close}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.strong, text(palette.ink, ROW_SIZE)]}
            >
              {t('drawer.close')}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  head: { gap: spacing.xs, paddingHorizontal: spacing.sm },
  title: { fontFamily: fonts.heading, fontWeight: '700' },
  body: { fontFamily: fonts.body },
  strong: { fontFamily: fonts.heading, fontWeight: '700' },
  list: { flexGrow: 0 },
  rows: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
  },
  words: { flex: 1, gap: 2 },
  swap: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: spacing.md,
  },
  fades: { textAlign: 'center', padding: spacing.md },
  close: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
