import type { ReactNode } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { fonts, shadows } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../ui/buttons';
import { SendIcon } from '../../ui/icons';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { ComposerEvent } from './composer-machine';
import { PressSpring } from '../../ui/motion/press-spring';

import { useArrive, useFollow } from './use-follow';

const TEXT_SIZE = 17;

interface SendProps {
  /** Absent, not just invisible, while there is nothing to send. */
  readonly gone?: boolean;
}

interface FieldProps {
  readonly text: string;
  /** Something is being sent, so the field waits. */
  readonly busy: boolean;
  readonly onEvent: (event: ComposerEvent) => void;
}

/**
 * The capsule as a text field. The keyboard's send key sends, as the send button does; putting
 * the keyboard away with nothing typed gives the capsule back.
 */
export function ComposerField({ text, busy, onEvent }: FieldProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <TextInput
      value={text}
      onChangeText={(next) => onEvent({ type: 'text_changed', text: next })}
      onSubmitEditing={() => onEvent({ type: 'send_tapped' })}
      // The keyboard put away: with nothing typed, the capsule is hold-to-talk again.
      onBlur={() => onEvent({ type: 'keyboard_dismissed' })}
      placeholder={t('composer.placeholder')}
      placeholderTextColor={palette.muted}
      accessibilityLabel={t('composer.placeholder')}
      allowFontScaling={allowFontScaling}
      autoFocus
      editable={!busy}
      multiline={largeText}
      returnKeyType="send"
      submitBehavior="submit"
      testID="composer-input"
      style={[styles.input, { color: palette.ink, fontSize: size(TEXT_SIZE) }]}
    />
  );
}

/**
 * The send button. It keeps its place beside the field, so the field never changes width, and
 * grows in from nothing once there is something to send. With `gone` (the stacked dock for large
 * text) it is simply absent until then.
 */
export function ComposerSend({ text, busy, onEvent, gone = false }: FieldProps & SendProps) {
  const { palette, reducedMotion } = useScreenStyle();
  const t = useT();
  const on = text.trim() !== '';
  const grown = useFollow(on ? 1 : 0, reducedMotion ? 0 : 450, SPRING_CURVE);
  const fade = useFollow(on ? 1 : 0, 200);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: grown.value }],
  }));
  if (gone && !on) return null;
  return (
    <Animated.View
      pointerEvents={on ? 'auto' : 'none'}
      accessibilityElementsHidden={!on}
      importantForAccessibility={on ? 'auto' : 'no-hide-descendants'}
      style={[styles.sendSlot, style]}
    >
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={t('composer.send')}
        accessibilityHint={t('composer.send.hint')}
        disabled={busy || !on}
        onPress={() => onEvent({ type: 'send_tapped' })}
        testID="composer-send"
        style={[styles.send, { backgroundColor: palette.ink }]}
      >
        <SendIcon color={palette.page} />
      </PressSpring>
    </Animated.View>
  );
}

/** The field as it takes the capsule's place: it fades in, growing from 0.96. */
export function FieldArrives({ children }: { readonly children: ReactNode }) {
  const { reducedMotion } = useScreenStyle();
  const fade = useArrive(reducedMotion ? CROSSFADE_MS : 300);
  const pose = useArrive(reducedMotion ? 0 : 500, SPRING_CURVE);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: 0.96 + 0.04 * pose.value }],
  }));
  return <Animated.View style={[styles.arrives, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: CONTROL_HEIGHT,
    paddingHorizontal: 6,
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  sendSlot: {
    alignSelf: 'flex-end',
  },
  send: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.inkButton,
  },
  arrives: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'row',
  },
});
