import { StyleSheet, Text, View } from 'react-native';

import { fonts, shadows } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { onInkOf } from '../../../ui/buttons';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';

export interface ShareTargetsProps {
  readonly onShare: () => void;
  readonly onSave: () => void;
  /** Copies the link to the catch's page. Unset where there is no page to link to. */
  readonly onLink?: () => void;
  /** Sends the week's clip as a sound file. Unset for anything but a week's song. */
  readonly onSound?: () => void;
}

/**
 * Where the picture goes, side by side: the share sheet (the one filled action), Photos, and a
 * link to copy. At the large text sizes they stack.
 */
export function ShareTargets({ onShare, onSave, onLink, onSound }: ShareTargetsProps) {
  const t = useT();
  const { palette, largeText, allowFontScaling, size } = useScreenStyle();
  const target = (
    label: string,
    hint: string,
    testID: string,
    onPress: () => void,
    filled: boolean,
  ) => (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      feedback={filled ? 'primary' : 'choice'}
      testID={testID}
      style={[
        styles.target,
        largeText ? null : filled ? styles.wide : styles.grow,
        filled
          ? [styles.filled, { backgroundColor: palette.ink }]
          : [styles.plain, { backgroundColor: palette.surface }],
      ]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.5}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[
          styles.label,
          { color: filled ? onInkOf(palette) : palette.ink, fontSize: size(15) },
        ]}
      >
        {label}
      </Text>
    </PressSpring>
  );
  return (
    <View style={largeText ? styles.stack : styles.row}>
      {target(t('share.share'), t('share.share.hint'), 'share-send', onShare, true)}
      {target(t('share.save'), t('share.save.hint'), 'share-save', onSave, false)}
      {onLink ? target(t('share.link'), t('share.link.hint'), 'share-link', onLink, false) : null}
      {onSound
        ? target(t('share.sound'), t('share.sound.hint'), 'share-sound', onSound, false)
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  stack: { gap: 8 },
  target: {
    minHeight: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  grow: { flex: 1 },
  wide: { flex: 1.4 },
  filled: { boxShadow: shadows.inkButton },
  plain: { boxShadow: '0 0 0 0.5px rgba(28,26,23,0.14)' },
  label: { fontFamily: fonts.body, fontWeight: '600' },
});
