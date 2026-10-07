import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { GlassSurface } from '../../ui/glass-surface';
import { Chevron } from '../../ui/icons';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { ComposerHintsProps } from './composer-hints';
import { useFollow } from './use-follow';

const HINT_SIZE = 14;

type Hint = { readonly text: string; readonly mark: 'slide' | 'dot' | null };

/**
 * The passing hint in its small glass pill: it rises 10 points and fades in, and leaves the same
 * way. It does not place itself: `ComposerHintLayer` holds it above the dock, inside bounds that
 * contain it, so its "Cancel" always takes a touch. With "Cancel" in it the pill is 44 points high.
 */
export function ComposerHintPill({
  state,
  thinking,
  notUnderstood,
  screenReader,
  onCancelThinking,
}: ComposerHintsProps) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const t = useT();

  const hint = ((): Hint | null => {
    if (state.phase === 'listening') {
      // A screen reader has its own cancel button, and nothing to slide.
      return state.armed || screenReader
        ? null
        : { text: t('composer.slideToCancel'), mark: 'slide' };
    }
    if (thinking || state.phase !== 'idle') return { text: t('composer.thinking'), mark: 'dot' };
    if (state.notice === 'cancelled') return { text: t('composer.cancelled'), mark: null };
    if (state.notice === 'too_short') return { text: t('composer.tooShort'), mark: null };
    if (state.notice === 'empty') return { text: t('composer.empty'), mark: null };
    if (notUnderstood) return { text: t('composer.sayItAnotherWay'), mark: null };
    return null;
  })();

  // The last hint stays in the pill while it fades out.
  const [last, setLast] = useState<Hint | null>(hint);
  if (hint !== null && (last === null || last.text !== hint.text || last.mark !== hint.mark)) {
    setLast(hint);
  }
  const on = hint === null ? 0 : 1;
  const fade = useFollow(on, reducedMotion ? CROSSFADE_MS : 300);
  const pose = useFollow(on, reducedMotion ? 0 : 500, SPRING_CURVE);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: 10 * (1 - pose.value) }, { scale: 0.96 + 0.04 * pose.value }],
  }));

  const shown = hint ?? last;
  const canCancel = hint !== null && thinking && onCancelThinking !== undefined;
  if (shown === null) return null;
  return (
    <Animated.View pointerEvents={hint === null ? 'none' : 'auto'} style={[styles.holder, style]}>
      <GlassSurface style={styles.pill}>
        <View
          accessibilityLiveRegion="polite"
          style={[styles.row, canCancel && styles.rowWithCancel]}
        >
          {shown.mark === 'slide' ? <Chevron color={palette.ink} direction="left" /> : null}
          {shown.mark === 'dot' ? (
            <View style={[styles.dot, { backgroundColor: palette.tomato }]} />
          ) : null}
          <Text
            testID={hint === null ? undefined : 'composer-hint'}
            allowFontScaling={allowFontScaling}
            style={[styles.text, { color: palette.ink, fontSize: size(HINT_SIZE) }]}
          >
            {shown.text}
          </Text>
          {canCancel && onCancelThinking ? (
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={t('composer.cancelThinking')}
              accessibilityHint={t('composer.cancelThinking.hint')}
              onPress={onCancelThinking}
              testID="composer-cancel-thinking"
              hitSlop={spacing.sm}
              style={styles.cancel}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.cancelLabel, { color: palette.ink, fontSize: size(HINT_SIZE) }]}
              >
                {t('composer.cancelThinking')}
              </Text>
            </PressSpring>
          ) : null}
        </View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  holder: {
    maxWidth: '100%',
  },
  rowWithCancel: {
    minHeight: 44,
  },
  pill: {
    borderRadius: 18,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  row: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontFamily: fonts.body,
    fontWeight: '500',
    flexShrink: 1,
  },
  cancel: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: fonts.body,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
