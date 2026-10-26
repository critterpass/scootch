import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClassIcon } from '../features/desk/class-icons';
import { buttonText, ink, shapes, type } from '../features/desk/class-style';
import { useT } from '../i18n/i18n-provider';
import { useTextSizing } from '../screens/registry/support/forced-variant';

/**
 * The desk sheet swiped up: the timetable. It is part of tuition; until that lane builds the
 * timetable, the sheet shows its quiet locked state and nothing else.
 */
export default function Timetable() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sizing = useTextSizing();
  return (
    <View
      style={[styles.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      testID="timetable"
    >
      <Text
        accessibilityRole="header"
        allowFontScaling={sizing.allowFontScaling}
        style={[type.title, { fontSize: sizing.size(25) }]}
      >
        {t('timetable.title')}
      </Text>
      <View style={styles.lock}>
        <ClassIcon name="lock" color={ink.muted} size={28} />
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[type.hand, styles.locked, { fontSize: sizing.size(30) }]}
        >
          {t('timetable.locked')}
        </Text>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.hint, { fontSize: sizing.size(15) }]}
        >
          {t('timetable.lockedHint')}
        </Text>
      </View>
      <Pressable
        testID="timetable-close"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={[shapes.button, shapes.soft]}
      >
        <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.soft}>
          {t('timetable.close')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: ink.paper, paddingHorizontal: 20, gap: 24 },
  lock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  locked: { color: ink.red },
  hint: { color: ink.muted, textAlign: 'center' },
});
