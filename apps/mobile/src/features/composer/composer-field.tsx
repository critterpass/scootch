import { Pressable, StyleSheet, TextInput } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../ui/buttons';
import { SendIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { ComposerEvent } from './composer-machine';

const TEXT_SIZE = 17;

interface FieldProps {
  readonly text: string;
  /** Something is being sent, so the field waits. */
  readonly busy: boolean;
  readonly onEvent: (event: ComposerEvent) => void;
}

/** The capsule as a text field. The keyboard's send key sends, as the send button does. */
export function ComposerField({ text, busy, onEvent }: FieldProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <TextInput
      value={text}
      onChangeText={(next) => onEvent({ type: 'text_changed', text: next })}
      onSubmitEditing={() => onEvent({ type: 'send_tapped' })}
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

/** The send button, which is only there once there is something to send. */
export function ComposerSend({ text, busy, onEvent }: FieldProps) {
  const { palette } = useScreenStyle();
  const t = useT();
  if (text.trim() === '') return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('composer.send')}
      accessibilityHint={t('composer.send.hint')}
      disabled={busy}
      onPress={() => onEvent({ type: 'send_tapped' })}
      testID="composer-send"
      style={[styles.send, { backgroundColor: palette.ink }]}
    >
      <SendIcon color={palette.page} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: CONTROL_HEIGHT,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  send: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});
