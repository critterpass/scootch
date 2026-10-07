import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { ComposerState } from './composer-machine';
import { PressSpring } from '../../ui/motion/press-spring';

const STATUS_SIZE = 15;

export interface ComposerHintsProps {
  readonly state: ComposerState;
  /** The day store is working on what was sent. */
  readonly thinking: boolean;
  /** The last text could not be understood. */
  readonly notUnderstood: boolean;
  readonly screenReader: boolean;
  readonly onOpenSettings: () => void;
  /** Stops waiting for Scootch and takes the words back. Unset, the wait has no way out. */
  readonly onCancelThinking?: () => void;
}

/**
 * The one plain line that says why the composer is typing only, with the way to Settings when a
 * refusal is the cause. The passing hints are the pill's, above the dock.
 */
export function ComposerHints({ state, onOpenSettings }: ComposerHintsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { language } = useLanguage();
  const t = useT();

  const status =
    state.voice === 'refused'
      ? t('composer.micRefused')
      : state.voice === 'unavailable'
        ? t('composer.voiceUnavailable', { language: t(`language.${language}`) })
        : null;
  if (status === null) return null;

  return (
    <View style={styles.status}>
      <Text
        testID="composer-status"
        allowFontScaling={allowFontScaling}
        style={[styles.statusText, { color: palette.muted, fontSize: size(STATUS_SIZE) }]}
      >
        {status}
      </Text>
      {state.voice === 'refused' ? (
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={t('composer.openSettings')}
          accessibilityHint={t('composer.openSettings.hint')}
          onPress={onOpenSettings}
          testID="composer-open-settings"
          hitSlop={spacing.sm}
          style={styles.settings}
        >
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.settingsLabel, { color: palette.ink, fontSize: size(STATUS_SIZE) }]}
          >
            {t('composer.openSettings')}
          </Text>
        </PressSpring>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  statusText: {
    fontFamily: fonts.body,
  },
  settings: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  settingsLabel: {
    fontFamily: fonts.body,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
