import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { CROSSFADE_MS } from '../motion/motion-tokens';
import { useMayMove } from '../motion/use-feel';
import { useScreenStyle } from '../use-screen-style';

import { closesOnRelease, rubberBand, SHEET } from './sheet-motion';

const ALWAYS = ReduceMotion.Never;
const SheetCloseContext = createContext<() => void>(() => undefined);

export interface SheetProps {
  readonly open: boolean;
  /** Asked for by a tap on the shade, a drag down, a pull on the list, or the system's back. */
  readonly onClose: () => void;
  /** Under the grabber. The whole top of the sheet, this included, is where it is dragged from. */
  readonly header: ReactNode;
  readonly children: ReactNode;
  readonly testID?: string;
}

/**
 * The app's sheet: a floating card that springs up from the bottom over a shade. It follows a
 * finger on its grabber and header: dragged down past a third of its height, or flicked, it
 * closes, and anything less springs back; pulled up it gives a little and returns. The shade
 * fades with the sheet's own position. It lifts above the keyboard, and never runs under the
 * notch or the home bar. Where nothing may move it fades in and out. Everything runs on the UI
 * thread.
 */
export function Sheet({ open, onClose, header, children, testID }: SheetProps) {
  const mayMove = useMayMove();
  const { palette } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  /** 0 below the screen, 1 at rest. */
  const up = useSharedValue(0);
  /** How far the finger has moved it from rest. */
  const drag = useSharedValue(0);
  const tall = useSharedValue(height);

  useEffect(() => {
    if (open) {
      drag.value = 0;
      up.value = mayMove
        ? withSpring(1, { ...SHEET.open, reduceMotion: ALWAYS })
        : withTiming(1, { duration: CROSSFADE_MS, reduceMotion: ALWAYS });
      return;
    }
    up.value = withTiming(
      0,
      {
        duration: mayMove ? SHEET.closeMs : CROSSFADE_MS,
        easing: Easing.in(Easing.cubic),
        reduceMotion: ALWAYS,
      },
      (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      },
    );
  }, [open, mayMove, up, drag]);

  const pan = usePanGesture({
    activeOffsetY: [-SHEET.takesAfter, SHEET.takesAfter],
    failOffsetX: [-SHEET.sidewaysFails, SHEET.sidewaysFails],
    onUpdate: (event) => {
      'worklet';
      drag.value = rubberBand(event.translationY);
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled && closesOnRelease(drag.value, event.velocityY, tall.value)) {
        // It carries on down from where the finger left it.
        scheduleOnRN(onClose);
        return;
      }
      drag.value = withSpring(0, { ...SHEET.settle, reduceMotion: ALWAYS });
    },
  });

  const sheetStyle = useAnimatedStyle(() => {
    if (!mayMove)
      return { opacity: up.value, transform: [{ translateY: Math.max(0, drag.value) }] };
    return {
      opacity: 1,
      transform: [{ translateY: (1 - up.value) * (tall.value + SHEET.margin * 2) + drag.value }],
    };
  }, [mayMove]);
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: up.value * (1 - Math.min(1, Math.max(0, drag.value) / Math.max(1, tall.value))),
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]}>
          <Pressable
            accessible={false}
            importantForAccessibility="no"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={[styles.place, { paddingTop: insets.top + SHEET.topGap }]}
        >
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            onLayout={(event) => {
              tall.value = event.nativeEvent.layout.height;
            }}
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(SHEET.bottomPad, insets.bottom),
                backgroundColor: palette.page,
                borderColor: `${palette.ink}1F`,
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.top}>
                <View style={[styles.grabber, { backgroundColor: `${palette.ink}33` }]} />
                {header}
              </View>
            </GestureDetector>
            <SheetCloseContext.Provider value={onClose}>{children}</SheetCloseContext.Provider>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * The scrolling part of a sheet. Pulled down past its top and let go, it closes the sheet, as a
 * drag on the header does.
 */
export function SheetScroll({ onScrollEndDrag, ...rest }: ComponentProps<typeof ScrollView>) {
  const close = useContext(SheetCloseContext);
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
      onScrollEndDrag={(event) => {
        onScrollEndDrag?.(event);
        if (event.nativeEvent.contentOffset.y <= -SHEET.pullCloses) close();
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shade: { backgroundColor: 'rgba(28,26,23,0.32)' },
  place: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    flexShrink: 1,
    marginHorizontal: SHEET.margin,
    marginBottom: SHEET.margin,
    borderRadius: 44,
    borderWidth: 0.5,
    paddingHorizontal: 18,
    overflow: 'hidden',
    boxShadow: '0 -8px 40px -12px rgba(28, 26, 23, 0.35)',
  },
  top: { paddingTop: 12, paddingBottom: 12, gap: 12 },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center' },
});
