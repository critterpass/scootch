import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Words } from '../table/words';

import type { NameProblem } from './account-flow';

export interface SignInPageProps {
  readonly busy: boolean;
  readonly failed: boolean;
  readonly onSignIn: () => void;
  readonly onClose: () => void;
}

/** The one place an account is asked for: the first time a table is opened or joined. */
export function SignInPage({ busy, failed, onSignIn, onClose }: SignInPageProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  return (
    <Page onClose={onClose} testID="account-sign-in">
      {largeText ? null : (
        <View
          style={styles.figure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Scootch mood="waiting" reducedMotion size={140} />
        </View>
      )}
      <Words kind="title">{t('account.title')}</Words>
      <Words kind="quiet">{t('account.why')}</Words>
      <CapsuleButton
        label={t('account.apple')}
        hint={t('account.apple.hint')}
        disabled={busy}
        onPress={onSignIn}
        testID="account-apple"
      />
      {failed ? (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="account-failed">
          {t('account.apple.failed')}
        </Words>
      ) : null}
    </Page>
  );
}

export interface NamePageProps {
  readonly busy: boolean;
  /** Why the last name was not kept, said plainly under the field. */
  readonly problem: NameProblem | null;
  readonly onSave: (name: string) => void;
  readonly onClose: () => void;
}

const PROBLEMS = {
  length: 'account.name.length',
  refused: 'account.name.refused',
  unchecked: 'account.name.unchecked',
} as const;

/** Choosing the name a seat shows. The server screens it; its refusal is shown as it is. */
export function NamePage({ busy, problem, onSave, onClose }: NamePageProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const [name, setName] = useState('');
  return (
    <Page onClose={onClose} testID="account-name">
      <Words kind="title">{t('account.name.title')}</Words>
      <Words kind="quiet">{t('account.name.sub')}</Words>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => onSave(name)}
        placeholder={t('account.name.placeholder')}
        placeholderTextColor={palette.muted}
        accessibilityLabel={t('account.name.title')}
        allowFontScaling={allowFontScaling}
        testID="account-name-field"
        style={[
          styles.field,
          { color: palette.ink, backgroundColor: palette.surface, fontSize: size(20) },
        ]}
      />
      {problem === null ? null : (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="account-name-problem">
          {t(PROBLEMS[problem])}
        </Words>
      )}
      <CapsuleButton
        label={t('account.name.save')}
        hint={t('account.name.save.hint')}
        disabled={busy}
        onPress={() => onSave(name)}
        testID="account-name-save"
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  figure: { alignItems: 'center' },
  field: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
  },
});
