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
 * "One more", under the world row on a finished day. Without Plus it is a quiet locked control
 * that opens the sheet when tapped; with Plus it starts another thing until the day's cap.
 */
export function OneMore({ plus, left, onLocked, onMore }: OneMoreProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  if (!plus) {
    return (
      <CapsuleButton
        label={t('plus.oneMore')}
        hint={t('keep.plusOnly.hint')}
        tone="quiet"
        icon={<Lock color={palette.muted} />}
        onPress={onLocked}
        testID="one-more-locked"
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }
  if (left <= 0) {
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
    <CapsuleButton
      label={t('plus.oneMore.left', { count: left })}
      hint={t('plus.oneMore.hint')}
      onPress={onMore}
      testID="one-more"
      style={{ alignSelf: 'flex-start' }}
    />
  );
}
