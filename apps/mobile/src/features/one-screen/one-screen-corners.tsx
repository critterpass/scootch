import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { RoundButton } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { MoreIcon, WorldIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

const PILL_SIZE = 14;

export interface CornersProps {
  readonly offline: boolean;
  /** Opens the world. Unset, the button is drawn and does nothing. */
  readonly onWorld?: () => void;
  /** Opens the developer tools in the developer app. Unset, the more button does nothing yet. */
  readonly onDeveloperTools?: () => void;
}

/** The quiet button in each top corner of the one screen, and the offline pill between them. */
export function Corners({ offline, onWorld, onDeveloperTools }: CornersProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <View style={styles.corners}>
      <RoundButton
        label={t('oneScreen.world')}
        hint={onWorld ? t('oneScreen.world.hint') : t('oneScreen.notOpenYet')}
        inert={onWorld === undefined}
        testID="world-button"
        {...(onWorld ? { onPress: onWorld } : {})}
      >
        <WorldIcon color={palette.ink} accent={palette.tomato} ground={palette.risoBlob} />
      </RoundButton>
      {offline ? (
        <GlassSurface style={styles.pill}>
          <View style={styles.pillRow}>
            <View style={[styles.pillDot, { backgroundColor: palette.muted }]} />
            <Text
              testID="offline"
              allowFontScaling={allowFontScaling}
              style={[styles.pillText, { color: palette.ink, fontSize: size(PILL_SIZE) }]}
            >
              {t('oneScreen.offline')}
            </Text>
          </View>
        </GlassSurface>
      ) : null}
      <RoundButton
        label={t('oneScreen.more')}
        hint={t('oneScreen.notOpenYet')}
        inert={onDeveloperTools === undefined}
        testID={onDeveloperTools === undefined ? 'more-button' : 'developer-tools'}
        {...(onDeveloperTools ? { onPress: onDeveloperTools } : {})}
      >
        <MoreIcon color={palette.ink} />
      </RoundButton>
    </View>
  );
}

const styles = StyleSheet.create({
  corners: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  pill: {
    flexShrink: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  pillRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontFamily: fonts.body,
    fontWeight: '600',
    flexShrink: 1,
  },
});
