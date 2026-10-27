import { StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolateColor,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ClassIcon } from '../desk/class-icons';
import { css, useEased } from '../desk/class-motion';
import { BUTTON_MAX_SCALE, cappedSize, curves, ink, type } from '../desk/class-style';

import { useFieldRoom, useOpenWithKeyboard } from './typing-room';
import { ListeningDot, VoiceBars } from './voice-bars';

export const IDLE_HEIGHT = 56;
const LINE = 21;
/** The board's `.ease` morph of the bar's parts: 520 ms on the interface curve. */
const MORPH = { duration: 520, easing: curves.ui } as const;

/** The board's `wordA`: each word as it is heard rises 6 points into place, 260 ms ease-out. */
const wordIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 6 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: css.easeOut },
}).duration(260);

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

/** The listening panel: the dot, the words as they are heard, the voice and "Let go". */
export function ListeningLayer({
  showing,
  words,
  minHeight,
  mayMove,
  onLayout,
}: {
  /** Let go: the words stay on show while they go to the board. */
  readonly showing: boolean;
  readonly words: string;
  readonly minHeight: number;
  readonly mayMove: boolean;
  readonly onLayout: (e: LayoutChangeEvent) => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const all = words === '' ? [] : words.split(/\s+/);
  const word = [type.rounded, styles.words, { fontSize: sizing.size(18) }];
  return (
    <View style={[styles.listening, { minHeight }]} onLayout={onLayout}>
      <View style={styles.listenHead}>
        <ListeningDot />
        <Text allowFontScaling={sizing.allowFontScaling} style={[type.label, { color: ink.red }]}>
          {showing ? t('desk.thinking') : t('composer.listening')}
        </Text>
      </View>
      <View style={styles.wordsBox}>
        {/* One word to a text, so the newest can rise on its own; older lines leave at the top. */}
        <View testID="composer-words" accessible accessibilityLabel={words} style={styles.wordsRow}>
          {all.map((one, i) =>
            i === all.length - 1 ? (
              <Animated.Text
                key={`${i}:${one}`}
                {...(mayMove ? { entering: wordIn } : {})}
                allowFontScaling={sizing.allowFontScaling}
                style={word}
              >
                {one}
              </Animated.Text>
            ) : (
              <Text key={`${i}:${one}`} allowFontScaling={sizing.allowFontScaling} style={word}>
                {one}
              </Text>
            ),
          )}
        </View>
      </View>
      <View style={styles.listenFoot}>
        {showing ? <View /> : <VoiceBars />}
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.hint, { fontSize: sizing.size(12) }]}
        >
          {showing ? '' : t('composer.letGo')}
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
  listening: { paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  listenHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordsBox: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  wordsRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5 },
  words: { color: ink.text, lineHeight: 23 },
  listenFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hint: { color: ink.muted },
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
