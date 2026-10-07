import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DrawerItemRow, Id, IsoDate } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { dayWords } from './day-words';
import { drawerStyles as styles } from './drawer-sheet-styles';

const TITLE_SIZE = 22;
const COUNT_SIZE = 13;
const ROW_SIZE = 16;
const WHEN_SIZE = 12.5;
const SWAP_SIZE = 13;
const NOTE_SIZE = 13;
const CLOSE_SIZE = 16;
/** The peek lists this many parked things; the rest are one tap away. */
const PEEK_ROWS = 6;
/** The sheet starts this far under the top safe edge, as the design sets it. */
const TOP_GAP = 106;

export interface DrawerSheetProps {
  /** From the day store, which opens it only on the person's own pull or their tap on "Peek". */
  readonly open: boolean;
  readonly items: readonly DrawerItemRow[];
  readonly today: IsoDate;
  /** False once today's thing has been started: nothing can be swapped for it then. */
  readonly canSwap: boolean;
  /** Said in place of "Swap in" when today's starts are all used; `null` otherwise. */
  readonly capNote?: string | null;
  readonly onSwapIn: (itemId: Id) => void;
  readonly onClose: () => void;
}

/**
 * The drawer: what is parked, listed calmly with any dates, each one a tap away from today. A
 * floating sheet over the one screen with its grabber, a count, one white card of rows (a marked
 * circle for a dated thing, an empty ring for the rest) and a quiet way out. It lists six things
 * and says how many more there are; tapping that shows them all, and the list scrolls.
 */
export function DrawerSheet({
  open,
  items,
  today,
  canSwap,
  capNote = null,
  onSwapIn,
  onClose,
}: DrawerSheetProps) {
  const { palette, allowFontScaling, size, reducedMotion, largeText } = useScreenStyle();
  const { language } = useLanguage();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [all, setAll] = useState(false);
  const dated = items.filter((item) => item.dueDate !== null).length;
  const shown = all ? items : items.slice(0, PEEK_ROWS);
  const hidden = items.length - shown.length;
  const type = (weight: '400' | '500' | '600' | '700', points: number, color: string) => ({
    color,
    fontSize: size(points),
    lineHeight: size(points) * 1.25,
    fontWeight: weight,
  });
  const close = () => {
    setAll(false);
    onClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType={reducedMotion ? 'fade' : 'slide'}
      onRequestClose={close}
    >
      <View style={styles.shade}>
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          testID="drawer"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight: height - insets.top - TOP_GAP,
              paddingBottom: Math.max(22, insets.bottom),
              backgroundColor: palette.page,
              borderColor: `${palette.ink}1F`,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: `${palette.ink}33` }]} />
          <View style={styles.head}>
            <Text
              accessibilityRole="header"
              allowFontScaling={allowFontScaling}
              style={[styles.title, type('700', TITLE_SIZE, palette.ink)]}
            >
              {t('drawer.title')}
            </Text>
            <Text
              allowFontScaling={allowFontScaling}
              style={[
                styles.body,
                type('500', COUNT_SIZE, palette.muted),
                largeText && styles.wide,
              ]}
            >
              {items.length === 0
                ? t('drawer.empty')
                : t('drawer.count', { parked: items.length, dated })}
            </Text>
          </View>
          {capNote === null || items.length === 0 ? null : (
            <Text
              testID="drawer-cap"
              allowFontScaling={allowFontScaling}
              style={[styles.body, styles.note, type('500', NOTE_SIZE, palette.ink)]}
            >
              {capNote}
            </Text>
          )}
          {items.length === 0 ? null : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.card, { backgroundColor: palette.surface }]}>
                {shown.map((item, index) => {
                  const when =
                    item.dueDate === null
                      ? t('drawer.noDate')
                      : t('drawer.dated', {
                          due: dayWords(item.dueDate, today, language),
                          back: dayWords(item.returnOn ?? item.dueDate, today, language),
                        });
                  const last = index === shown.length - 1;
                  return (
                    <View
                      key={item.id}
                      testID={`drawer-item-${index}`}
                      style={[
                        styles.row,
                        !last && { borderBottomColor: `${palette.ink}1A`, borderBottomWidth: 0.5 },
                      ]}
                    >
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={[
                          styles.marker,
                          item.dueDate === null
                            ? { borderColor: `${palette.ink}2E`, borderWidth: 1.5 }
                            : { backgroundColor: palette.tomato },
                        ]}
                      >
                        {item.dueDate === null ? null : (
                          <Text
                            allowFontScaling={false}
                            style={[styles.mark, { color: '#FFFFFF' }]}
                          >
                            !
                          </Text>
                        )}
                      </View>
                      <View
                        accessible
                        accessibilityLabel={`${item.text}, ${when}`}
                        style={styles.words}
                      >
                        <Text
                          allowFontScaling={allowFontScaling}
                          style={[styles.body, type('500', ROW_SIZE, palette.ink)]}
                        >
                          {item.text}
                        </Text>
                        <Text
                          allowFontScaling={allowFontScaling}
                          style={[
                            styles.body,
                            type(
                              '400',
                              WHEN_SIZE,
                              item.dueDate === null ? palette.muted : palette.tomato,
                            ),
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
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                          testID={`drawer-swap-${index}`}
                          style={[styles.swap, { backgroundColor: `${palette.ink}0F` }]}
                        >
                          <Text
                            allowFontScaling={allowFontScaling}
                            style={[styles.strong, type('600', SWAP_SIZE, palette.ink)]}
                          >
                            {t('drawer.swapIn')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <Pressable
                disabled={hidden === 0}
                accessibilityRole={hidden === 0 ? 'text' : 'button'}
                accessibilityHint={hidden === 0 ? undefined : t('drawer.more.hint')}
                onPress={() => setAll(true)}
                testID="drawer-more"
                style={styles.noteBox}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.body, styles.note, type('400', NOTE_SIZE, palette.muted)]}
                >
                  {hidden === 0
                    ? t('drawer.fades')
                    : `${t('drawer.more', { count: hidden })} ${t('drawer.fades')}`}
                </Text>
              </Pressable>
            </ScrollView>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
            accessibilityHint={t('drawer.close.hint')}
            onPress={close}
            testID="drawer-close"
            style={styles.close}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.strong, type('600', CLOSE_SIZE, palette.ink)]}
            >
              {t('drawer.close')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
