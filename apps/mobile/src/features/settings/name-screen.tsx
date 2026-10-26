import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { goBack } from '../../ui/motion/go-back';
import { useForcedVariant } from '../../screens/registry/support/forced-variant';
import { useScreenStyle } from '../../ui/use-screen-style';
import { saveFullName, tidyName, useFirstDay } from '../first-day/student';

import { TITLE_MAX_SCALE, titleSize, usePage } from './settings-parts';

/** Roll call again, from the student card: the full name he shouts at the top of the pressure. */
export function NameScreen({ typedName }: { readonly typedName?: string }) {
  const t = useT();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const page = usePage();
  const { fullName } = useFirstDay();
  const [name, setName] = useState(typedName ?? fullName ?? '');
  const keyboardShown = useForcedVariant()?.condition === 'keyboard-open';

  const save = () => {
    if (tidyName(name) === '') return;
    void saveFullName(db, name).then(() => goBack(router, '/settings'));
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, { backgroundColor: page }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        testID="settings-name"
      >
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={TITLE_MAX_SCALE}
          style={[styles.title, { color: palette.ink, fontSize: titleSize(size, 28) }]}
        >
          {t('firstDay.name.heading')}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={{ color: palette.muted, fontSize: size(13) }}
        >
          {t('firstDay.name.note')}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          accessibilityLabel={t('firstDay.name.heading')}
          allowFontScaling={allowFontScaling}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          autoCorrect={false}
          returnKeyType="done"
          autoFocus={keyboardShown}
          testID="settings-name-input"
          style={[
            styles.input,
            { color: palette.ink, fontSize: size(18), backgroundColor: `${palette.ink}0F` },
          ]}
        />
        <CapsuleButton
          label={t('settings.name.save')}
          hint={t('settings.back.hint')}
          onPress={save}
          disabled={tidyName(name) === ''}
          testID="settings-name-save"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 12 },
  title: { fontWeight: '800', letterSpacing: -0.5 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontWeight: '600',
  },
});
