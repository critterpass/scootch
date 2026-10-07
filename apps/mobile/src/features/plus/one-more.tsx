import { Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Lock } from './ui/parts';

export interface OneMoreProps {
  readonly plus: boolean;
  /** Starts still open today under the daily limit. */
  readonly left: number;
  /** The locked control was tapped: the sheet opens, and only then. */
  readonly onLocked: () => void;
  readonly onMore: () => void;
}

/**
 * "One more", under the world row on a finished day. While a start is left under the daily limit
 * it simply starts another thing, free or Plus. At the limit, a free phone gets a quiet locked
 * control that says plainly the day's starts are done and opens the sheet; Plus gets a spent
 * control that says the same and does nothing.
 */
export function OneMore({ plus, left, onLocked, onMore }: OneMoreProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  if (left > 0) {
    return (
      <CapsuleButton
        label={t('plus.oneMore.left', { count: left })}
        hint={t('plus.oneMore.hint')}
        onPress={onMore}
        testID="one-more"
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }
  if (plus) {
    return (
      <CapsuleButton
        label={t('plus.oneMore.cap')}
        hint={t('plus.oneMore.hint')}
        tone="quiet"
        disabled
        testID="one-more-cap"
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        testID="one-more-free-done"
        allowFontScaling={allowFontScaling}
        style={{ color: palette.muted, fontFamily: fonts.body, fontSize: size(15) }}
      >
        {t('plus.oneMore.freeDone')}
      </Text>
      <CapsuleButton
        label={t('plus.oneMore')}
        hint={t('keep.plusOnly.hint')}
        tone="quiet"
        icon={<Lock color={palette.muted} />}
        onPress={onLocked}
        testID="one-more-locked"
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}
