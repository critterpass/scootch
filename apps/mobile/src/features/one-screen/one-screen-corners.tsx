import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { RoundButton } from '../../ui/buttons';
import { CornerBar } from '../../ui/corner-bar';
import { GlassSurface } from '../../ui/glass-surface';
import { MoreIcon, WorldIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

const PILL_SIZE = 14;

export interface CornersProps {
  readonly offline: boolean;
  /** Opens the world. Unset, the button is drawn and does nothing. */
  readonly onWorld?: () => void;
  /** Opens Settings. Unset (a registry capture), the button is drawn and does nothing. */
  readonly onMore?: () => void;
}

/** The quiet button in each top corner of the one screen, and the offline pill between them. */
export function Corners({ offline, onWorld, onMore }: CornersProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  return (
    <CornerBar
      leading={
        <RoundButton
          label={t('oneScreen.world')}
          hint={onWorld ? t('oneScreen.world.hint') : t('oneScreen.notOpenYet')}
          inert={onWorld === undefined}
          zoomTo="/world"
          testID="world-button"
          {...(onWorld ? { onPress: onWorld } : {})}
        >
          <WorldIcon color={palette.ink} accent={palette.tomato} ground={palette.risoBlob} />
        </RoundButton>
      }
      trailing={
        <RoundButton
          label={t('oneScreen.more')}
          hint={onMore ? t('oneScreen.more.hint') : t('oneScreen.notOpenYet')}
          inert={onMore === undefined}
          testID="more-button"
          {...(onMore ? { onPress: onMore } : {})}
        >
          <MoreIcon color={palette.ink} />
        </RoundButton>
      }
    >
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
    </CornerBar>
  );
}

const styles = StyleSheet.create({
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
