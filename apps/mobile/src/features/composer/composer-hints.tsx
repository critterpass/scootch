import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { GlassSurface } from '../../ui/glass-surface';
import { Chevron } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { ComposerState } from './composer-machine';

const HINT_SIZE = 14;
const STATUS_SIZE = 15;

export interface ComposerHintsProps {
  readonly state: ComposerState;
  /** The day store is working on what was sent. */
  readonly thinking: boolean;
  /** The last text could not be understood. */
  readonly notUnderstood: boolean;
  readonly screenReader: boolean;
  readonly onOpenSettings: () => void;
}

type Hint = { readonly text: string; readonly mark: 'slide' | 'dot' | null };

/**
 * What sits just above the dock: the passing hint in its small glass pill, and the one plain line
 * that says why the composer is typing only, with the way to Settings when a refusal is the cause.
 */
export function ComposerHints({
  state,
  thinking,
  notUnderstood,
  screenReader,
  onOpenSettings,
}: ComposerHintsProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { language } = useLanguage();
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

  const status =
    state.voice === 'refused'
      ? t('composer.micRefused')
      : state.voice === 'unavailable'
        ? t('composer.voiceUnavailable', { language: t(`language.${language}`) })
        : null;

  return (
    <>
      {status === null ? null : (
        <View style={styles.status}>
          <Text
            testID="composer-status"
            allowFontScaling={allowFontScaling}
            style={[styles.statusText, { color: palette.muted, fontSize: size(STATUS_SIZE) }]}
          >
            {status}
          </Text>
          {state.voice === 'refused' ? (
            <Pressable
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
            </Pressable>
          ) : null}
        </View>
      )}
      {hint === null ? null : (
        <GlassSurface style={styles.pill}>
          <View accessibilityLiveRegion="polite" style={styles.pillRow}>
            {hint.mark === 'slide' ? <Chevron color={palette.ink} direction="left" /> : null}
            {hint.mark === 'dot' ? (
              <View style={[styles.dot, { backgroundColor: palette.tomato }]} />
            ) : null}
            <Text
              testID="composer-hint"
              allowFontScaling={allowFontScaling}
              style={[styles.pillText, { color: palette.ink, fontSize: size(HINT_SIZE) }]}
            >
              {hint.text}
            </Text>
          </View>
        </GlassSurface>
      )}
    </>
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
  pill: {
    borderRadius: 18,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  pillRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    fontFamily: fonts.body,
    fontWeight: '500',
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
