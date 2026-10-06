import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '../i18n/i18n-provider';
import { CapsuleButton } from '../ui/buttons';
import { useScreenStyle } from '../ui/use-screen-style';

/** A directory of free, confidential helplines by country. */
const HELPLINE_DIRECTORY = 'https://findahelpline.com';

/**
 * Where a crisis day lands: every task is hidden, there is no critter and no joke, and real help
 * comes first. Plain words from the catalogue only. No country-specific number is shown here,
 * because none has been verified for the app; the directory lists them by country.
 */
export default function CareRoute() {
  const t = useT();
  const { palette, allowFontScaling } = useScreenStyle();
  const [sitting, setSitting] = useState(false);
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]} testID="care-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[styles.title, { color: palette.ink }]}
        >
          {sitting ? t('care.crisis.here') : t('care.crisis.title')}
        </Text>
        {sitting ? null : (
          <Text allowFontScaling={allowFontScaling} style={[styles.body, { color: palette.ink }]}>
            {t('care.crisis.body')}
          </Text>
        )}
        <View style={styles.actions}>
          <CapsuleButton
            label={t('care.crisis.findHelpline')}
            hint={t('care.crisis.findHelpline.hint')}
            onPress={() => open(HELPLINE_DIRECTORY)}
            testID="care-find-helpline"
          />
          <CapsuleButton
            label={t('care.crisis.trusted')}
            hint={t('care.crisis.trusted.hint')}
            tone="quiet"
            onPress={() => open('sms:')}
            testID="care-text-someone"
          />
          {sitting ? null : (
            <CapsuleButton
              label={t('care.crisis.sit')}
              hint={t('care.crisis.sit.hint')}
              tone="quiet"
              onPress={() => setSitting(true)}
              testID="care-sit"
            />
          )}
        </View>
        <Text allowFontScaling={allowFontScaling} style={[styles.note, { color: palette.muted }]}>
          {t('care.crisis.note')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 20 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  body: { fontSize: 19, lineHeight: 27 },
  actions: { gap: 12, marginTop: 8 },
  note: { fontSize: 14, lineHeight: 20, marginTop: 8 },
});
