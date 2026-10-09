import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';

export interface AppleSignInButtonProps {
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly testID?: string;
  readonly style?: ViewProps['style'];
}

/**
 * The height the system button is drawn at. Apple sizes the button's words by its height, so at a
 * full control's height they stand larger than every other label; drawn shorter inside a capsule of
 * its own colour, they read at the size of the labels beside it.
 */
const WORDS_HEIGHT = 38;

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
  const white = isDark(palette.page);
  return (
    <View style={style}>
      <Pressable
        // The capsule around the system button is part of it: a touch anywhere on it signs in.
        // Only the system button is read out. It has no disabled state of its own: while Apple's
        // sheet is up the whole capsule is dimmed and takes no touches.
        accessible={false}
        onPress={onPress}
        pointerEvents={disabled ? 'none' : 'auto'}
        style={[
          styles.frame,
          { backgroundColor: white ? '#FFFFFF' : '#000000' },
          disabled && styles.dimmed,
        ]}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            white
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={0}
          onPress={onPress}
          style={styles.button}
          {...(testID === undefined ? {} : { testID })}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    paddingHorizontal: CONTROL_HEIGHT / 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dimmed: { opacity: 0.45 },
  button: { height: WORDS_HEIGHT },
});
