import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { useT } from '../../i18n/i18n-provider';

import { Mark } from './marks';
import { paper, Sized } from './receipt-parts';

const TUITION = '/tuition' as Href;

/**
 * The quiet lock where a paid thing lives (the timetable, the report card, the big widgets): what
 * it is part of, that the desk and board stay free, and one way to the receipt. It never opens by
 * itself and never interrupts.
 */
export function LockedPanel({
  style,
  testID = 'locked',
}: {
  readonly style?: ViewProps['style'];
  readonly testID?: string;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <View style={[styles.panel, style]} testID={testID}>
      <View style={styles.lock}>
        <Mark name="lock" color={paper.ink} size={18} weight={2.2} />
      </View>
      <Sized size={18} role="header" style={styles.title}>
        {t('locked.title')}
      </Sized>
      <Sized size={14} style={styles.body}>
        {t('locked.body')}
      </Sized>
      <Pressable
        testID={`${testID}-receipt`}
        accessibilityRole="button"
        onPress={() => router.push(TUITION)}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <Sized size={14.5} style={styles.buttonText}>
          {t('locked.see')}
        </Sized>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,253,248,0.92)',
    boxShadow: '0 12px 30px rgba(60,40,20,0.14)',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  lock: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3EADC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', color: paper.ink, textAlign: 'center' },
  body: { color: '#6B655E', textAlign: 'center' },
  button: {
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: paper.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: paper.white, fontWeight: '700', textAlign: 'center' },
  pressed: { transform: [{ scale: 0.97 }] },
});
