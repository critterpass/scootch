import { getLocales } from 'expo-localization';
import { Linking, StyleSheet, Text, View } from 'react-native';

import {
  dialLink,
  helplineDetail,
  helplinesFor,
  HELPLINE_DIRECTORY,
  orderedAt,
  textLink,
  type Helpline,
} from '@phusclass/i18n';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The care boards' green: calm, never the act's red. */
export const CARE_GREEN = '#2F6B56';

/** The phone's region, which decides the helplines shown. */
export function phoneRegion(): string | null {
  return getLocales()[0]?.regionCode ?? null;
}

function open(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

function Action({
  label,
  spoken,
  filled,
  onPress,
  testID,
}: {
  readonly label: string;
  readonly spoken: string;
  readonly filled: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}) {
  const { allowFontScaling, size } = useScreenStyle();
  return (
    <PressSpring
      accessibilityRole="link"
      accessibilityLabel={spoken}
      onPress={onPress}
      testID={testID}
      style={[styles.action, { backgroundColor: filled ? CARE_GREEN : `${CARE_GREEN}1A` }]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.actionText, { fontSize: size(16), color: filled ? '#FFFFFF' : CARE_GREEN }]}
      >
        {label}
      </Text>
    </PressSpring>
  );
}

function LineCard({ line, isOpen, index }: { line: Helpline; isOpen: boolean; index: number }) {
  const t = useT();
  const { language } = useLanguage();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const name = line.reach === 'emergency' ? t('care.helplines.emergency') : line.name;
  const sms =
    textLink(line) ??
    (line.reach === 'call_or_text' ? `sms:${line.number.replace(/\D/g, '')}` : null);
  const spokenNumber = line.number.split('').join(' ');
  return (
    <View style={[styles.card, { backgroundColor: palette.surface }]}>
      {index === 0 ? (
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.label, { color: palette.muted, fontSize: size(12) }]}
        >
          {t('care.helplines.near')}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[styles.name, { color: palette.ink, fontSize: size(17) }]}
      >
        {name} · {line.number}
      </Text>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.detail, { color: palette.muted, fontSize: size(14) }]}
      >
        {helplineDetail(language, line, isOpen)}
      </Text>
      <View style={[styles.actions, largeText && styles.actionsStacked]}>
        <Action
          label={t('care.helplines.call')}
          spoken={t('care.helplines.call.label', { name, number: spokenNumber })}
          filled
          onPress={() => open(dialLink(line))}
          testID={`helpline-call-${index}`}
        />
        {sms === null ? null : (
          <Action
            label={t('care.helplines.message')}
            spoken={t('care.helplines.message.label', { name, number: spokenNumber })}
            filled={false}
            onPress={() => open(sms)}
            testID={`helpline-message-${index}`}
          />
        )}
      </View>
    </View>
  );
}

/**
 * The helplines for the phone's region, the emergency number first, then the lines open now,
 * then the closed ones with their hours; and always the directory for anywhere else. A region
 * with no verified line gets the directory alone.
 */
export function HelplineCards({
  region,
  now,
}: {
  readonly region: string | null;
  readonly now: number;
}) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const lines = orderedAt(helplinesFor(region), now);
  return (
    <View style={styles.list} testID="helpline-cards">
      {lines.map(({ line, open: isOpen }, index) => (
        <LineCard key={`${line.number}-${line.name}`} line={line} isOpen={isOpen} index={index} />
      ))}
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.label, { color: palette.muted, fontSize: size(12) }]}
        >
          {t('care.helplines.elsewhere')}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.body, { color: palette.ink, fontSize: size(16) }]}
        >
          {t('care.helplines.directory')}
        </Text>
        <Action
          label={t('care.helplines.directory.open')}
          spoken={t('care.helplines.directory.open')}
          filled={lines.length === 0}
          onPress={() => open(HELPLINE_DIRECTORY)}
          testID="helpline-directory"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  card: {
    borderRadius: 22,
    padding: 16,
    gap: 10,
    boxShadow: '0 1px 2px rgba(40,36,30,0.05)',
  },
  label: { fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  name: { fontWeight: '700' },
  detail: {},
  body: {},
  actions: { flexDirection: 'row', gap: 8 },
  actionsStacked: { flexDirection: 'column' },
  action: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontWeight: '700', textAlign: 'center' },
});
