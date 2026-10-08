import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';

// The sheet is a dark page in both appearances, so its inks are its own.
const PRINT = 'rgba(255,255,255,0.66)';
const LINK = 'rgba(255,255,255,0.85)';
/** The small print keeps room for this many lines, so choosing another plan moves nothing. */
const PRINT_ROWS = 3;

export interface SheetLegalProps {
  /** Exactly what is charged, when it renews and how to stop it; `null` while no plan is offered. */
  readonly print: string | null;
  readonly onTerms: () => void;
  readonly onPrivacy: () => void;
  readonly onRestore: () => void;
}

/**
 * The foot of the sheet: the small print of the chosen plan, then Terms, Privacy and Restore. The
 * links are small on the page, as the board sets them, and each is still a full touch target.
 */
export function SheetLegal({ print, onTerms, onPrivacy, onRestore }: SheetLegalProps) {
  const t = useT();
  const { largeText, allowFontScaling, size } = useScreenStyle();
  const link = (label: string, hint: string, testID: string, onPress: () => void) => (
    <PressSpring
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      hitSlop={spacing.sm}
      style={styles.link}
    >
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.8}
        style={[styles.linkLabel, { fontSize: size(12.5) }]}
      >
        {label}
      </Text>
    </PressSpring>
  );
  return (
    <>
      {print === null ? null : (
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={2}
          style={[
            styles.print,
            {
              fontSize: size(11.5),
              lineHeight: size(11.5) * 1.38,
              minHeight: size(11.5) * 1.38 * PRINT_ROWS,
            },
          ]}
          testID="plus-sheet-print"
        >
          {print}
        </Text>
      )}
      <View style={[styles.links, largeText ? styles.stacked : null]}>
        {link(t('plus.terms'), t('plus.terms.hint'), 'plus-sheet-terms', onTerms)}
        {link(t('plus.privacy'), t('plus.privacy.hint'), 'plus-sheet-privacy', onPrivacy)}
        {link(t('plus.restore'), t('plus.restore.hint'), 'plus-sheet-restore', onRestore)}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  print: { marginTop: 6, color: PRINT, fontFamily: fonts.body, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  link: { minHeight: 28, justifyContent: 'center' },
  linkLabel: {
    color: LINK,
    fontFamily: fonts.body,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
