import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, fontSizes, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { CapsuleButton, RoundButton } from '../../ui/buttons';
import { MoreIcon } from '../../ui/icons';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { Row } from '../settings/rows';

import { helplineDetail, helplineLabel, orderedAt, textLabel, type Helpline } from './helplines';

const BODY_SIZE = 17;
const NOTE_SIZE = 14;
const SCOOTCH_SIZE = 200;
const SCOOTCH_SIZE_LARGE_TEXT = 96;

export interface CrisisViewProps {
  /** The helplines for the person's region; empty when the region is unknown. */
  readonly helplines: readonly Helpline[];
  /** The time right now, from the clock. Decides which lines are open and their order. */
  readonly now: number;
  /** "Just sit with me" was chosen: the one sentence changes and nothing is asked. */
  readonly sitting: boolean;
  readonly onCall: (line: Helpline) => void;
  /** Texts a line's own text number. */
  readonly onTextLine: (line: Helpline) => void;
  readonly onDirectory: () => void;
  readonly onText: () => void;
  readonly onSit: () => void;
  /** Opens Settings, where the helplines page and everything else about the app live. */
  readonly onMore?: () => void;
}

/**
 * A crisis day. Every task is hidden, nothing is funny, and real help comes first: the helplines
 * of the person's region, then the directory, then someone they trust. The emergency number comes
 * first, then the lines that are open, then the closed ones, which say so and can still be called.
 * Scootch is here, still and quiet, and says nothing: the words on this screen are plain ones from
 * the catalogue.
 */
export function CrisisView({
  helplines,
  now,
  sitting,
  onCall,
  onTextLine,
  onDirectory,
  onText,
  onSit,
  onMore,
}: CrisisViewProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const { language } = useLanguage();
  return (
    <SafeFrame style={[styles.screen, { backgroundColor: palette.page }]} testID="care-screen">
      {onMore ? (
        <View style={styles.corner}>
          <RoundButton
            label={t('oneScreen.more')}
            hint={t('oneScreen.more.hint')}
            onPress={onMore}
            testID="care-more"
          >
            <MoreIcon color={palette.ink} />
          </RoundButton>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={styles.figure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Scootch
            mood="serious"
            attitude="soft"
            reducedMotion
            size={largeText ? SCOOTCH_SIZE_LARGE_TEXT : SCOOTCH_SIZE}
          />
        </View>
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[styles.title, { color: palette.ink, fontSize: size(fontSizes.sentence) }]}
        >
          {sitting ? t('care.crisis.here') : t('care.crisis.title')}
        </Text>
        {sitting ? null : (
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.body, { color: palette.muted, fontSize: size(BODY_SIZE) }]}
          >
            {t('care.crisis.body')}
          </Text>
        )}
        <View style={styles.actions}>
          {orderedAt(helplines, now).map(({ line, open }) => {
            const digits = line.number.replaceAll(' ', '');
            const text = textLabel(t, line);
            return (
              <View key={`${line.number}-${line.name}`} style={styles.line}>
                <CapsuleButton
                  label={helplineLabel(t, line)}
                  hint={t('care.helpline.hint')}
                  tone={open ? 'ink' : 'quiet'}
                  onPress={() => onCall(line)}
                  testID={`care-helpline-${digits}`}
                />
                {text === null ? null : (
                  <CapsuleButton
                    label={text}
                    hint={t('care.helpline.text.hint')}
                    tone="quiet"
                    onPress={() => onTextLine(line)}
                    testID={`care-helpline-text-${digits}`}
                  />
                )}
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.note, { color: palette.muted, fontSize: size(NOTE_SIZE) }]}
                  testID={`care-helpline-detail-${digits}`}
                >
                  {helplineDetail(language, line, open)}
                </Text>
              </View>
            );
          })}
          <View style={[styles.group, { backgroundColor: palette.surface }]}>
            <Row
              first
              label={t('care.crisis.findHelpline')}
              hint={t('care.crisis.findHelpline.hint')}
              onPress={onDirectory}
              testID="care-find-helpline"
            />
            <Row
              label={t('care.crisis.trusted')}
              hint={t('care.crisis.trusted.hint')}
              onPress={onText}
              testID="care-text-someone"
            />
          </View>
        </View>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.note, { color: palette.muted, fontSize: size(NOTE_SIZE) }]}
        >
          {t('care.crisis.note')}
        </Text>
        {sitting ? null : (
          <View style={styles.sit}>
            <QuietLink
              label={t('care.crisis.sit')}
              hint={t('care.crisis.sit.hint')}
              onPress={onSit}
              testID="care-sit"
            />
          </View>
        )}
      </ScrollView>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  corner: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  figure: { alignItems: 'center' },
  title: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontFamily: fonts.body },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  line: { gap: spacing.xs },
  group: { borderRadius: 22, overflow: 'hidden' },
  note: { fontFamily: fonts.body },
  sit: { alignItems: 'center' },
});
