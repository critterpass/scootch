import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { DrawerItemRow, Id, IsoDate } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { CloseIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { Sheet, SheetScroll } from '../../ui/sheet/sheet';
import { useScreenStyle } from '../../ui/use-screen-style';

import { dayWords } from './day-words';
import { DrawerRow, type RowLeft } from './drawer-row';
import { drawerStyles as styles } from './drawer-sheet-styles';

const TITLE_SIZE = 22;
const COUNT_SIZE = 13;
const NOTE_SIZE = 13;
/** The peek lists this many parked things; the rest are one tap away. */
const PEEK_ROWS = 6;
/** A row that was taken out can be put back for this long. */
const UNDO_MS = 4500;

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
  /** A row was swiped away or ticked off, and was not put back. */
  readonly onRemove: (itemId: Id) => void;
  readonly onEdit: (itemId: Id, text: string) => void;
  readonly onClose: () => void;
  /** The row whose words are open for rewording as the sheet appears, for a capture. */
  readonly startEditing?: Id;
}

/**
 * The drawer: what is parked, listed calmly with any dates. Each row can be swapped in for today,
 * reworded on a tap, ticked off, or swiped away; a row that was taken out can be put back for a
 * few seconds, and is only then really gone. It lists six things and says how many more there are.
 */
export function DrawerSheet({
  open,
  items,
  today,
  canSwap,
  capNote = null,
  onSwapIn,
  onRemove,
  onEdit,
  onClose,
  startEditing,
}: DrawerSheetProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const { language } = useLanguage();
  const t = useT();
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState<Id | null>(startEditing ?? null);
  // The row that has left the list and can still be put back. It is removed for good when its
  // time is up, when another row leaves, or when the sheet closes.
  const [left, setLeft] = useState<{ readonly id: Id; readonly how: RowLeft } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Id | null>(null);
  const remove = useRef(onRemove);
  remove.current = onRemove;

  const settle = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) remove.current(pending.current);
    pending.current = null;
    setLeft(null);
  };
  const rowLeft = (id: Id, how: RowLeft) => {
    settle();
    pending.current = id;
    setLeft({ id, how });
    timer.current = setTimeout(settle, UNDO_MS);
  };
  const putBack = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setLeft(null);
  };
  // A sheet that goes away takes its undo with it: what had left is gone.
  useEffect(() => {
    if (!open) settle();
    // Runs on the change of `open` alone.
  }, [open]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null) remove.current(pending.current);
    },
    [],
  );

  const listed = items.filter((item) => item.id !== left?.id);
  const dated = listed.filter((item) => item.dueDate !== null).length;
  const shown = all ? listed : listed.slice(0, PEEK_ROWS);
  const hidden = listed.length - shown.length;
  const type = (weight: '400' | '500' | '600' | '700', points: number, color: string) => ({
    color,
    fontSize: size(points),
    lineHeight: size(points) * 1.25,
    fontWeight: weight,
  });
  const close = () => {
    setAll(false);
    setEditing(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      testID="drawer"
      header={
        <View style={styles.head}>
          <View style={[styles.headWords, largeText && styles.stacked]}>
            <Text
              accessibilityRole="header"
              allowFontScaling={allowFontScaling}
              style={[styles.title, type('700', TITLE_SIZE, palette.ink)]}
            >
              {t('drawer.title')}
            </Text>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.body, type('500', COUNT_SIZE, palette.muted)]}
            >
              {listed.length === 0
                ? t('drawer.empty')
                : t('drawer.count', { parked: listed.length, dated })}
            </Text>
          </View>
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('drawer.close')}
            accessibilityHint={t('drawer.close.hint')}
            onPress={close}
            hitSlop={8}
            testID="drawer-close"
            style={[styles.closeButton, { backgroundColor: `${palette.ink}0F` }]}
          >
            <CloseIcon color={palette.ink} />
          </PressSpring>
        </View>
      }
    >
      {capNote === null || listed.length === 0 ? null : (
        <Text
          testID="drawer-cap"
          allowFontScaling={allowFontScaling}
          style={[styles.body, styles.note, styles.cap, type('500', NOTE_SIZE, palette.ink)]}
        >
          {capNote}
        </Text>
      )}
      {listed.length === 0 ? null : (
        <SheetScroll style={styles.list} contentContainerStyle={styles.listContent}>
          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            {shown.map((item, index) => (
              <DrawerRow
                key={item.id}
                item={item}
                index={index}
                last={index === shown.length - 1}
                when={
                  item.dueDate === null
                    ? t('drawer.noDate')
                    : t('drawer.dated', {
                        due: dayWords(item.dueDate, today, language),
                        back: dayWords(item.returnOn ?? item.dueDate, today, language),
                      })
                }
                canSwap={canSwap}
                editing={editing === item.id}
                onEditStart={() => setEditing(item.id)}
                onEditEnd={(words) => {
                  setEditing(null);
                  if (words !== null) onEdit(item.id, words);
                }}
                onSwapIn={() => onSwapIn(item.id)}
                onLeft={(how) => rowLeft(item.id, how)}
              />
            ))}
          </View>
          <PressSpring
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
          </PressSpring>
        </SheetScroll>
      )}
      {left === null ? null : (
        <View
          testID="drawer-undo-bar"
          accessibilityLiveRegion="polite"
          style={[styles.undo, { backgroundColor: palette.ink }]}
        >
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.body, styles.undoWords, type('500', NOTE_SIZE + 1, palette.page)]}
          >
            {t(left.how === 'ticked' ? 'drawer.ticked' : 'drawer.removed')}
          </Text>
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('drawer.undo')}
            accessibilityHint={t('drawer.undo.hint')}
            onPress={putBack}
            feedback="choice"
            hitSlop={10}
            testID="drawer-undo"
            style={styles.undoButton}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.strong, type('700', NOTE_SIZE + 1, palette.page)]}
            >
              {t('drawer.undo')}
            </Text>
          </PressSpring>
        </View>
      )}
    </Sheet>
  );
}
