import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, fontSizes, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT, type Translate } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { Row } from '../settings/rows';

import type { Helpline } from './helplines';

const BODY_SIZE = 17;
const NOTE_SIZE = 14;
const SCOOTCH_SIZE = 200;
const SCOOTCH_SIZE_LARGE_TEXT = 96;

/** The words on a helpline's button: what to do, the number, and whose line it is. */
export function helplineLabel(t: Translate, line: Helpline): string {
  if (line.reach === 'emergency') return t('care.helpline.emergency', { number: line.number });
  const key = line.reach === 'call_or_text' ? 'care.helpline.callOrText' : 'care.helpline.call';
  return t(key, { number: line.number, name: line.name });
}

export interface CrisisViewProps {
  /** The helplines for the person's region; empty when the region is unknown. */
  readonly helplines: readonly Helpline[];
  /** "Just sit with me" was chosen: the one sentence changes and nothing is asked. */
  readonly sitting: boolean;
  readonly onCall: (line: Helpline) => void;
  readonly onDirectory: () => void;
  readonly onText: () => void;
  readonly onSit: () => void;
}

/**
 * A crisis day. Every task is hidden, nothing is funny, and real help comes first: the helplines
 * of the person's region, then the directory, then someone they trust. Scootch is here, still and
 * quiet, and says nothing: the words on this screen are plain ones from the catalogue.
 */
export function CrisisView({
  helplines,
  sitting,
  onCall,
  onDirectory,
  onText,
  onSit,
}: CrisisViewProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]} testID="care-screen">
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
          {helplines.map((line) => (
            <CapsuleButton
              key={`${line.number}-${line.name}`}
              label={helplineLabel(t, line)}
              hint={t('care.helpline.hint')}
              onPress={() => onCall(line)}
              testID={`care-helpline-${line.number.replaceAll(' ', '')}`}
            />
          ))}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  figure: { alignItems: 'center' },
  title: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontFamily: fonts.body },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  group: { borderRadius: 22, overflow: 'hidden' },
  note: { fontFamily: fonts.body },
  sit: { alignItems: 'center' },
});
