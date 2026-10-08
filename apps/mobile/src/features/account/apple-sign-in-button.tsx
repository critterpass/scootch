import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';

export interface AppleSignInButtonProps {
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly testID?: string;
  readonly style?: ViewProps['style'];
}

/** True for a page dark enough that Apple's white button is the one to stand on it. */
function isDark(hex: string): boolean {
  const value = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(value)) return false;
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/**
 * Sign in with Apple, as Apple draws it: the system's own button, with Apple's logo and words in
 * the phone's language, black on a light page and white on a dark one, as a capsule the height of
 * every other control. Off iOS, where the system button does not exist, it is a plain capsule.
 */
export function AppleSignInButton({
  onPress,
  disabled = false,
  testID,
  style,
}: AppleSignInButtonProps) {
  const { palette } = useScreenStyle();
  const t = useT();
  if (Platform.OS !== 'ios') {
    return (
      <View style={style}>
        <CapsuleButton
          label={t('account.apple')}
          hint={t('account.apple.hint')}
          disabled={disabled}
          onPress={onPress}
          {...(testID === undefined ? {} : { testID })}
        />
      </View>
    );
  }
  return (
    <View
      // The system button has no disabled state of its own: while Apple's sheet is up it is dimmed
      // and takes no touches.
      pointerEvents={disabled ? 'none' : 'auto'}
      accessibilityState={{ disabled }}
      style={[styles.frame, disabled && styles.dimmed, style]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          isDark(palette.page)
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={CONTROL_HEIGHT / 2}
        onPress={onPress}
        style={styles.button}
        {...(testID === undefined ? {} : { testID })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: CONTROL_HEIGHT },
  dimmed: { opacity: 0.45 },
  button: { flex: 1 },
});
