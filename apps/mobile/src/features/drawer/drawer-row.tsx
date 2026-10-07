import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ITEM_TEXT_MAX, type DrawerItemRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { BinIcon, Tick } from '../../ui/icons';
import { PressSpring, touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { drawerStyles as styles } from './drawer-sheet-styles';
import { removesOnRelease, ROW } from './drawer-row-motion';

const ALWAYS = ReduceMotion.Never;
const ROW_SIZE = 16;
const WHEN_SIZE = 12.5;
const SWAP_SIZE = 13;

/** How a row left the drawer: swiped away, or ticked off. Both clear it the same way. */
export type RowLeft = 'removed' | 'ticked';

export interface DrawerRowProps {
  readonly item: DrawerItemRow;
  readonly index: number;
  /** "no date", or when it is due and when it comes back. */
  readonly when: string;
  readonly last: boolean;
  readonly canSwap: boolean;
  /** This row's words are in a field, with the keyboard. */
  readonly editing: boolean;
  readonly onEditStart: () => void;
  /** The field was left: with the words to keep, or `null` to leave them as they were. */
  readonly onEditEnd: (words: string | null) => void;
  readonly onSwapIn: () => void;
  /** The row has finished leaving the list. */
  readonly onLeft: (how: RowLeft) => void;
}

/**
 * One parked thing. Its ring is a tick box; its words open for rewording on a tap or a hold; a
 * swipe to the left slides it off over a bin and takes it out. Ticked or swiped, the row closes up
 * and is gone; the sheet offers to put it back for a moment after.
 */
export function DrawerRow({
  item,
  index,
  when,
  last,
  canSwap,
  editing,
  onEditStart,
  onEditEnd,
  onSwapIn,
  onLeft,
}: DrawerRowProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { mayMove, haptics } = useFeel();
  const t = useT();
  const [ticked, setTicked] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const dated = item.dueDate !== null;

  const wide = useSharedValue(0);
  const tall = useSharedValue(0);
  const slid = useSharedValue(0);
  /** 0 in the list, 1 closed up and gone. */
  const gone = useSharedValue(0);

  const leave = (how: RowLeft) => {
    'worklet';
    gone.value = withTiming(
      1,
      { duration: mayMove ? ROW.closeMs : 0, reduceMotion: ALWAYS },
      (finished) => {
        if (finished) scheduleOnRN(onLeft, how);
      },
    );
  };

  const pan = usePanGesture({
    enabled: !editing && !ticked,
    activeOffsetX: [-ROW.takesAfter, ROW.takesAfter],
    failOffsetY: [-ROW.scrollsAfter, ROW.scrollsAfter],
    onUpdate: (event) => {
      'worklet';
      slid.value = Math.min(0, event.translationX);
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled && removesOnRelease(slid.value, event.velocityX, wide.value)) {
        slid.value = withTiming(-wide.value, { duration: ROW.offMs, reduceMotion: ALWAYS });
        leave('removed');
        return;
      }
      slid.value = withSpring(0, { ...ROW.settle, reduceMotion: ALWAYS });
    },
  });
  // The point of no return is felt once, as the row crosses it.
  const tick = () => touchHaptic('choice');
  useAnimatedReaction(
    () => wide.value > 0 && -slid.value > wide.value * ROW.removesPast,
    (past, before) => {
      if (haptics && past && before === false) scheduleOnRN(tick);
    },
  );

  // A ticked row shows its tick for a beat, then closes up.
  useEffect(() => {
    if (!ticked) return undefined;
    const timer = setTimeout(() => leave('ticked'), mayMove ? ROW.tickedMs : 0);
    return () => clearTimeout(timer);
    // The leave is started once, when the tick lands.
  }, [ticked]);

  const closing = useAnimatedStyle(() =>
    gone.value === 0 || tall.value === 0
      ? { opacity: 1 }
      : { height: tall.value * (1 - gone.value), opacity: 1 - gone.value },
  );
  const sliding = useAnimatedStyle(() => ({ transform: [{ translateX: slid.value }] }));
  const lane = useAnimatedStyle(() => ({ opacity: slid.value < 0 ? 1 : 0 }));
  const bin = useAnimatedStyle(() => {
    const past = wide.value > 0 && -slid.value > wide.value * ROW.removesPast;
    return { transform: [{ scale: withTiming(past ? 1.25 : 1, { duration: 140 }) }] };
  });

  const finishEdit = () => {
    const words = draft.trim();
    onEditEnd(words === '' || words === item.text ? null : words);
  };
  const inkOf = (weight: '400' | '500' | '600', points: number, color: string) => ({
    color,
    fontSize: size(points),
    lineHeight: size(points) * 1.25,
    fontWeight: weight,
  });

  return (
    <Animated.View style={[styles.rowClip, closing]}>
      <View
        onLayout={(event) => {
          wide.value = event.nativeEvent.layout.width;
          if (gone.value === 0) tall.value = event.nativeEvent.layout.height;
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.lane, { backgroundColor: palette.tomato }, lane]}
        >
          <Animated.View style={bin}>
            <BinIcon color={palette.onTomato} />
          </Animated.View>
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            testID={`drawer-item-${index}`}
            style={[
              styles.row,
              { backgroundColor: palette.surface },
              !last && { borderBottomColor: `${palette.ink}1A`, borderBottomWidth: 0.5 },
              sliding,
            ]}
          >
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ticked }}
              accessibilityLabel={`${t('drawer.tick')}: ${item.text}`}
              accessibilityHint={t('drawer.tick.hint')}
              disabled={ticked || editing}
              hitSlop={10}
              onPress={() => {
                if (haptics) touchHaptic('primary');
                setTicked(true);
              }}
              testID={`drawer-tick-${index}`}
              style={[
                styles.marker,
                ticked
                  ? { backgroundColor: palette.ink }
                  : dated
                    ? { backgroundColor: palette.tomato }
                    : { borderColor: `${palette.ink}2E`, borderWidth: 1.5 },
              ]}
            >
              {ticked ? (
                <Tick color={palette.page} />
              ) : dated ? (
                <Text allowFontScaling={false} style={[styles.mark, { color: palette.onTomato }]}>
                  !
                </Text>
              ) : null}
            </Pressable>
            {editing ? (
              <View style={styles.words}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  autoFocus
                  selectTextOnFocus={false}
                  maxLength={ITEM_TEXT_MAX}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onBlur={finishEdit}
                  allowFontScaling={allowFontScaling}
                  accessibilityLabel={t('drawer.edit.field')}
                  accessibilityHint={t('drawer.edit.hint')}
                  testID={`drawer-edit-${index}`}
                  style={[
                    styles.body,
                    styles.field,
                    inkOf('500', ROW_SIZE, palette.ink),
                    { borderBottomColor: palette.tomato },
                  ]}
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.text}, ${when}`}
                accessibilityHint={t('drawer.item.hint')}
                accessibilityActions={[
                  { name: 'activate', label: t('drawer.edit') },
                  { name: 'delete', label: t('drawer.remove') },
                ]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'delete') onLeft('removed');
                  else onEditStart();
                }}
                disabled={ticked}
                onPress={() => {
                  setDraft(item.text);
                  onEditStart();
                }}
                onLongPress={() => {
                  setDraft(item.text);
                  onEditStart();
                }}
                testID={`drawer-words-${index}`}
                style={styles.words}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[
                    styles.body,
                    inkOf('500', ROW_SIZE, ticked ? palette.muted : palette.ink),
                    ticked && styles.struck,
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[
                    styles.body,
                    inkOf('400', WHEN_SIZE, dated && !ticked ? palette.tomato : palette.muted),
                  ]}
                >
                  {when}
                </Text>
              </Pressable>
            )}
            {canSwap && !editing && !ticked ? (
              <PressSpring
                accessibilityRole="button"
                accessibilityLabel={`${t('drawer.swapIn')}: ${item.text}`}
                accessibilityHint={t('drawer.swapIn.hint')}
                onPress={onSwapIn}
                feedback="primary"
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                testID={`drawer-swap-${index}`}
                style={[styles.swap, { backgroundColor: `${palette.ink}0F` }]}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.strong, inkOf('600', SWAP_SIZE, palette.ink)]}
                >
                  {t('drawer.swapIn')}
                </Text>
              </PressSpring>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}
