import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { GlassSurface } from '../../ui/glass-surface';

import { ink, shapes } from './class-style';

/**
 * "Still yours?" over the desk sheet, asked once about a task untouched for two weeks: the task,
 * then Keep it and Let it go.
 */
export function StillYoursPanel({
  title,
  bottom,
  onAnswer,
}: {
  readonly title: string;
  /** How far above the screen's foot it sits: just over the desk sheet. */
  readonly bottom: number;
  readonly onAnswer: (answer: 'yes' | 'no') => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  return (
    <GlassSurface style={[styles.panel, { bottom }]} testID="desk-still-yours">
      <Text
        allowFontScaling={sizing.allowFontScaling}
        numberOfLines={2}
        style={[styles.text, { fontSize: sizing.size(14) }]}
      >
        <Text style={styles.ask}>{t('desk.stillYours')} </Text>
        {title}
      </Text>
      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAnswer('yes')}
          style={[styles.button, shapes.soft]}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={styles.buttonText}>
            {t('desk.stillYoursKeep')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAnswer('no')}
          style={[styles.button, shapes.soft]}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={styles.buttonText}>
            {t('desk.stillYoursDrop')}
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 22,
    padding: 12,
    gap: 10,
  },
  text: { color: ink.text, lineHeight: 19 },
  ask: { fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { minHeight: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
  buttonText: { color: ink.text, fontWeight: '600', fontSize: 15 },
});
