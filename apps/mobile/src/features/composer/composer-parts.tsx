import { StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ClassIcon } from '../desk/class-icons';
import { useEased } from '../desk/class-motion';
import { BUTTON_MAX_SCALE, cappedSize, curves, ink } from '../desk/class-style';

import { useFieldRoom, useOpenWithKeyboard } from './typing-room';

export const IDLE_HEIGHT = 56;
const LINE = 21;
/** The board's `.ease` morph of the bar's parts: 520 ms on the interface curve. */
const MORPH = { duration: 520, easing: curves.ui } as const;

/** "Hold to tell him", with the microphone, across the bar at rest. */
export function IdleLayer({ onLayout }: { readonly onLayout: (e: LayoutChangeEvent) => void }) {
  const t = useT();
  const sizing = useTextSizing();
  const { largeText } = useScreenStyle();
  return (
    <View style={styles.idle} onLayout={onLayout}>
      <View style={styles.hold}>
        <ClassIcon name="mic" color={ink.text} />
        <Text
          allowFontScaling={sizing.allowFontScaling}
          maxFontSizeMultiplier={BUTTON_MAX_SCALE}
          // At the largest sizes the words wrap rather than being cut.
          numberOfLines={largeText ? 2 : 1}
          style={[styles.holdText, { fontSize: cappedSize(sizing, 16) }]}
        >
          {t('composer.hold')}
        </Text>
      </View>
    </View>
  );
}

/** Typing: the microphone shrinks to a round button as the keyboard key opens into the field. */
export function TypingLayer({
  draft,
  barWidth,
  mayMove,
  onCancel,
  onEdit,
  onSubmit,
  onLayout,
}: {
  readonly draft: string;
  /** The bar's width, for the microphone to shrink from. */
  readonly barWidth: number;
  readonly mayMove: boolean;
  readonly onCancel: () => void;
  readonly onEdit: (draft: string) => void;
  readonly onSubmit: () => void;
  readonly onLayout: (e: LayoutChangeEvent) => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const fieldMax = useFieldRoom(25 + 4 * sizing.size(LINE));
  const ready = useEased(draft.trim() !== '', 200, mayMove);
  const send = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(ready.get(), [0, 1], ['rgba(28,26,24,0.2)', ink.red]),
  }));
  // The microphone starts as wide as the hold bar was (all but the key and its gaps) and shrinks
  // to a round button; the field beside it, starting as the 46-point key, takes the room it
  // leaves. The microphone's width drives both, so the two edges stay 5 points apart.
  const wide = Math.max(46, barWidth - 61);
  const open = useSharedValue(mayMove && barWidth > 0 ? 0 : 1);
  useOpenWithKeyboard(open, MORPH);
  const mic = useAnimatedStyle(() => ({
    width: wide + (46 - wide) * open.get(),
    backgroundColor: interpolateColor(open.get(), [0, 1], ['rgba(28,26,24,0)', ink.soft]),
  }));
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(open.get(), [0, 1], [ink.soft, 'rgba(255,255,255,0.95)']),
  }));
  const field = useAnimatedStyle(() => ({ opacity: Math.min(1, open.get() * 1.7) }));
  return (
    <View style={styles.typing} onLayout={onLayout}>
      <Animated.View style={[styles.mic, mic]}>
        <PressSpring
          testID="composer-close"
          accessibilityRole="button"
          accessibilityLabel={t('composer.hold')}
          onPress={onCancel}
          style={styles.micPress}
        >
          <ClassIcon name="mic" color={ink.text} />
        </PressSpring>
      </Animated.View>
      <Animated.View style={[styles.box, box]}>
        <Animated.View style={[styles.field, field]}>
          <TextInput
            testID="composer-input"
            autoFocus
            multiline
            value={draft}
            onChangeText={onEdit}
            placeholder={t('composer.placeholder')}
            placeholderTextColor={ink.muted}
            accessibilityLabel={t('composer.inWriting')}
            allowFontScaling={sizing.allowFontScaling}
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={onSubmit}
            style={[
              styles.input,
              // The line grows with the text, so large text never overlaps itself; four at most.
              {
                fontSize: sizing.size(16),
                lineHeight: sizing.size(LINE),
                maxHeight: fieldMax,
              },
            ]}
          />
          <PressSpring
            testID="composer-send"
            accessibilityRole="button"
            accessibilityLabel={t('composer.handIn')}
            onPress={onSubmit}
            style={styles.sendPress}
          >
            <Animated.View style={[styles.send, send]}>
              <ClassIcon name="up" color={ink.white} size={16} weight={2.6} />
            </Animated.View>
          </PressSpring>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  idle: { padding: 5, paddingRight: 61, minHeight: IDLE_HEIGHT, justifyContent: 'center' },
  hold: {
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  holdText: { color: ink.text, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  // The board's gaps: 5 points round the microphone and the field.
  typing: { flexDirection: 'row', alignItems: 'flex-end', padding: 5, gap: 5 },
  mic: { height: 46, borderRadius: 23, overflow: 'hidden' },
  micPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  box: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  field: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 46,
    paddingLeft: 16,
    paddingRight: 6,
    paddingTop: 12.5,
    paddingBottom: 12.5,
    color: ink.text,
  },
  sendPress: { marginRight: 5, marginBottom: 5 },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
