import { useRouter } from 'expo-router';

import type { Language } from '@scootch/i18n';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDispatch } from '../../state/day-store-provider';
import { FittedSheet, SheetHeading } from '../../ui/fitted-sheet';
import { goBack } from '../../ui/motion/go-back';
import { Words } from '../table/words';

import { Row, Section } from './rows';

const LANGUAGES: readonly (Language | null)[] = [null, 'en', 'vi'];
/** A language is named in itself, whatever the app is written in. */
export const LANGUAGE_LABELS = { en: 'English', vi: 'Tiếng Việt' } as const;

export interface LanguageSheetProps {
  /** The person's own choice of language, or `null` while the phone's language decides. */
  readonly chosen: Language | null;
  readonly onChoose: (language: Language | null) => void;
  readonly onClose: () => void;
}

/**
 * The languages, on a sheet as tall as the three of them: follow the phone, or one of the two
 * the app is written in. A choice is made with one tap, and the sheet goes.
 */
export function LanguageSheet({ chosen, onChoose, onClose }: LanguageSheetProps) {
  const t = useT();
  return (
    <FittedSheet
      testID="language"
      close={{
        label: t('settings.close'),
        hint: t('settings.close.hint'),
        onPress: onClose,
        testID: 'language-close',
      }}
    >
      <SheetHeading>
        <Words kind="title">{t('settings.language')}</Words>
      </SheetHeading>
      <Section>
        {LANGUAGES.map((language, index) => (
          <Row
            key={language ?? 'phone'}
            first={index === 0}
            kind="choice"
            selected={language === chosen}
            label={language === null ? t('settings.language.phone') : LANGUAGE_LABELS[language]}
            hint={t('settings.language.choose.hint')}
            onPress={() => onChoose(language)}
            testID={`settings-language-${language ?? 'phone'}`}
          />
        ))}
      </Section>
    </FittedSheet>
  );
}

/** The language sheet on the real phone: the choice is one stored key, and the sheet closes. */
export function LanguageSheetContainer() {
  const router = useRouter();
  const { chosen, choose } = useLanguage();
  const dispatch = useDispatch();
  const close = () => goBack(router, '/settings');
  return (
    <LanguageSheet
      chosen={chosen}
      onClose={close}
      onChoose={(next) => {
        // The store reads its settings again once the key is written.
        void choose(next)
          .then(() => dispatch({ type: 'settings_changed', changes: {} }))
          .catch(() => undefined);
        close();
      }}
    />
  );
}
