import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { buttonText, curves, ink, shapes, type } from '../desk/class-style';

import {
  gradeExcuse,
  PICKED_EXCUSES,
  type Excuse,
  type Graded,
  type PickedExcuse,
} from './slip-model';

const EXCUSE_WORDS: Record<
  PickedExcuse,
  'slip.tooTired' | 'slip.afterLunch' | 'slip.needFirst' | 'slip.realReason'
> = {
  'too tired': 'slip.tooTired',
  'after lunch': 'slip.afterLunch',
  'need first': 'slip.needFirst',
  'real reason': 'slip.realReason',
};

/** A drag down this far, or a flick, puts the slip away. */
const CLOSES_AT = 110;

export interface SlipSheetProps {
  readonly taskTitle: string;
  readonly taskId: string;
  /** For a capture: the excuse already picked. */
  readonly initial?: Excuse | null;
  readonly onHandIn: (excuse: string, graded: Graded) => void;
  readonly onStart: () => void;
  readonly onClose: () => void;
}

/**
 * The late slip: snoozing is allowed and costs an excuse, picked, or written in the user's own
 * words. He grades it in red the moment it is on the slip; a real reason gets "Accepted." and no
 * grade. Drag it down or tap outside to put it away; "Fine, I'll start" starts the period instead.
 */
export function SlipSheet({
  taskTitle,
  taskId,
  initial = null,
  onHandIn,
  onStart,
  onClose,
}: SlipSheetProps) {
  const t = useT();
  const { language } = useLanguage();
  const sizing = useTextSizing();
  const mayMove = useMayMove();
  const insets = useSafeAreaInsets();
  const [excuse, setExcuse] = useState<Excuse | null>(initial);
  const [draft, setDraft] = useState(initial?.kind === 'written' ? initial.words : '');

  const graded = excuse === null ? null : gradeExcuse(language, excuse, taskId);
  const excuseText =
    excuse === null
      ? null
      : excuse.kind === 'picked'
        ? t(EXCUSE_WORDS[excuse.which])
        : excuse.words;

  const drag = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((event) => {
      drag.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > CLOSES_AT || event.velocityY > 800) scheduleOnRN(onClose);
      else drag.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));

  return (
    <View style={StyleSheet.absoluteFill} testID="slip">
      <Animated.View
        entering={FadeIn.duration(360)}
        exiting={FadeOut.duration(240)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('slip.close')}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: ink.scrim }]}
        />
      </Animated.View>
      <Animated.View
        entering={mayMove ? SlideInDown.duration(540).easing(curves.ui) : FadeIn.duration(200)}
        exiting={mayMove ? SlideOutDown.duration(360).easing(curves.ui) : FadeOut.duration(200)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 20 }, dragStyle]}
        accessibilityViewIsModal
      >
        <GestureDetector gesture={pan}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('slip.close')}
            onPress={onClose}
            style={styles.grabberZone}
          >
            <View style={shapes.grabber} />
          </Pressable>
        </GestureDetector>
        <Text
          accessibilityRole="header"
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.title, { fontSize: sizing.size(22) }]}
        >
          {t('slip.title')}
        </Text>
        <View style={styles.paper}>
          <View style={styles.margin} />
          <Text
            allowFontScaling={sizing.allowFontScaling}
            numberOfLines={2}
            style={[styles.forLine, { fontSize: sizing.size(13) }]}
          >
            {t('slip.for')} <Text style={styles.forTask}>{taskTitle}</Text>
          </Text>
          <Text
            testID="slip-excuse"
            allowFontScaling={sizing.allowFontScaling}
            numberOfLines={2}
            style={[
              type.hand,
              styles.excuse,
              {
                fontSize: sizing.size(26),
                color: excuseText ? ink.purple : 'rgba(106,69,184,0.35)',
              },
            ]}
          >
            {excuseText ?? t('slip.yourExcuse')}
          </Text>
          <View style={styles.commentRow}>
            {graded !== null ? (
              <Animated.Text
                key={graded.comment}
                entering={FadeIn.duration(500)}
                testID="slip-comment"
                allowFontScaling={sizing.allowFontScaling}
                style={[type.hand, styles.comment, { fontSize: sizing.size(22) }]}
              >
                {graded.comment}
              </Animated.Text>
            ) : null}
          </View>
          {graded?.grade ? (
            <Animated.View
              key={graded.grade}
              entering={
                mayMove ? ZoomIn.duration(400).easing(curves.character) : FadeIn.duration(200)
              }
              style={styles.stamp}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('slip.grade', { grade: graded.grade })}
            >
              <Text style={[type.hand, styles.grade]}>{graded.grade}</Text>
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.excuses}>
          {PICKED_EXCUSES.map((which) => {
            const on = excuse?.kind === 'picked' && excuse.which === which;
            return (
              <Pressable
                key={which}
                testID={`slip-pick-${which.replace(' ', '-')}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setDraft('');
                  setExcuse({ kind: 'picked', which });
                }}
                style={[styles.chip, { backgroundColor: on ? ink.text : ink.soft }]}
              >
                <Text
                  allowFontScaling={sizing.allowFontScaling}
                  style={[
                    styles.chipText,
                    { color: on ? ink.white : ink.text, fontSize: sizing.size(15) },
                  ]}
                >
                  {t(EXCUSE_WORDS[which])}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          testID="slip-write"
          value={draft}
          onChangeText={(words) => {
            setDraft(words);
            setExcuse(words.trim() === '' ? null : { kind: 'written', words });
          }}
          placeholder={t('slip.write')}
          placeholderTextColor={ink.muted}
          allowFontScaling={sizing.allowFontScaling}
          returnKeyType="done"
          style={[styles.write, { fontSize: sizing.size(16) }]}
        />
        <View style={styles.buttons}>
          <Pressable
            testID="slip-hand-in"
            accessibilityRole="button"
            accessibilityState={{ disabled: graded === null }}
            disabled={graded === null || excuseText === null}
            onPress={() => {
              if (graded !== null && excuseText !== null) onHandIn(excuseText, graded);
            }}
            style={[shapes.button, shapes.ink, { opacity: graded === null ? 0.35 : 1 }]}
          >
            <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
              {t('slip.handIn')}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onStart} style={styles.startInstead}>
            <Text
              allowFontScaling={sizing.allowFontScaling}
              style={[buttonText.red, { color: ink.red }]}
            >
              {t('slip.start')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ink.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 20,
    gap: 16,
    boxShadow: '0 -10px 40px rgba(40,28,16,0.18)',
  },
  grabberZone: { paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  title: { fontWeight: '700', color: ink.text, letterSpacing: -0.3 },
  paper: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingLeft: 52,
    paddingRight: 16,
    backgroundColor: '#FFF9E3',
    gap: 2,
    boxShadow: 'inset 0 0 0 1px rgba(150,120,40,0.08)',
  },
  margin: {
    position: 'absolute',
    left: 39,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(226,69,62,0.35)',
  },
  forLine: { color: ink.muted, minHeight: 30, textAlignVertical: 'bottom', paddingTop: 12 },
  forTask: { color: ink.text, fontWeight: '600' },
  excuse: { minHeight: 36 },
  commentRow: { minHeight: 36, paddingRight: 70, justifyContent: 'flex-end' },
  comment: { color: ink.red },
  stamp: {
    position: 'absolute',
    right: 14,
    top: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: ink.red,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  grade: { color: ink.red, fontSize: 30 },
  excuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center' },
  chipText: { fontWeight: '600' },
  write: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: ink.soft,
    color: ink.text,
  },
  buttons: { gap: 2, marginTop: 6 },
  startInstead: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
