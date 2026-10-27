import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@phusclass/tokens';

import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { FeelProvider } from '../../ui/motion/use-feel';
import { PageHeader } from '../../ui/page-header';
import { useScreenStyle } from '../../ui/use-screen-style';

import { HelplineCards } from './helpline-cards';
import { PhuFace } from './phu-face';

/** The Crisis board's page: a quiet grey, warmer than the classroom's. */
const CRISIS_PAGE = '#EFEDE8';
/** The heading grows only so far, so the helplines stay near the top at every text size. */
const TITLE_MAX_SCALE = 1.5;
const CRISIS_TITLE = 30;

export interface CrisisScreenProps {
  readonly region: string | null;
  readonly now: number;
  /** Closing asks nothing. Settings' helplines have the system's way back instead. */
  readonly onClose?: () => void;
  /** `crisis` is the screen a crisis opens; `helplines` is the same page opened from Settings. */
  readonly kind: 'crisis' | 'helplines';
}

/**
 * Helplines first. On a crisis day every task is hidden and this is the whole app until it is
 * closed; nothing moves, nothing is sold and nothing is asked. His face sits quietly at the foot,
 * with no words of his own.
 */
export function CrisisScreen({ region, now, onClose, kind }: CrisisScreenProps) {
  const t = useT();
  const crisis = kind === 'crisis';
  const insets = useSafeAreaInsets();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const page = palette.ink === '#1C1A17' ? CRISIS_PAGE : palette.page;
  // At the largest sizes the numbers come straight after the heading, and the words after them.
  const intro = (
    <Text
      allowFontScaling={allowFontScaling}
      style={[styles.body, { color: palette.muted, fontSize: size(16) }]}
    >
      {crisis ? t('care.crisis.body') : t('care.helplines.intro')}
    </Text>
  );
  return (
    <FeelProvider motion="calm" care="crisis" haptics={false}>
      <ScrollView
        testID={crisis ? 'care-crisis' : 'care-helplines'}
        style={{ backgroundColor: page }}
        // The helplines page has the system's bar, which keeps the page clear of the edges itself.
        contentInsetAdjustmentBehavior={crisis ? 'never' : 'automatic'}
        contentContainerStyle={[
          styles.content,
          crisis
            ? { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }
            : styles.underBar,
        ]}
      >
        {crisis ? (
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={TITLE_MAX_SCALE}
            style={[
              styles.title,
              {
                color: palette.ink,
                fontSize: Math.min(size(CRISIS_TITLE), CRISIS_TITLE * TITLE_MAX_SCALE),
              },
            ]}
          >
            {t('care.crisis.title')}
          </Text>
        ) : null}
        {largeText ? null : intro}
        <HelplineCards region={region} now={now} />
        {largeText ? intro : null}

        {crisis ? (
          <View style={styles.foot}>
            <PhuFace
              mood="serious"
              size={64}
              figureWidth={82}
              background={palette.surface}
              label={t('care.phu.serious')}
            />
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.putAway, { color: palette.ink, fontSize: size(16) }]}
            >
              {t('care.crisis.putAway')}
            </Text>
          </View>
        ) : null}

        {crisis ? (
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('care.crisis.close')}
            accessibilityHint={t('care.crisis.close.hint')}
            onPress={() => onClose?.()}
            testID="care-crisis-close"
            style={styles.close}
          >
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.closeText, { color: palette.ink, fontSize: size(16) }]}
            >
              {t('care.crisis.close')}
            </Text>
          </PressSpring>
        ) : null}
      </ScrollView>
      {crisis ? null : <PageHeader title={t('settings.helplines')} />}
    </FeelProvider>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14, flexGrow: 1 },
  underBar: { paddingTop: 4, paddingBottom: 24 },
  title: { marginHorizontal: 4, fontWeight: '800', letterSpacing: -0.5 },
  body: { marginHorizontal: 4 },
  foot: {
    marginTop: 'auto',
    paddingTop: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  putAway: { flex: 1, marginBottom: 6, fontFamily: fonts.heading, fontWeight: '800' },
  close: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontWeight: '600' },
});
