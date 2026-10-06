import { useLocales } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  defaultLanguage,
  pickLanguage,
  t,
  type Language,
  type ParamsOf,
  type StringKey,
} from '@scootch/i18n';

import { readStoredLanguage, storeLanguage } from './language-store';

interface LanguageState {
  /** The language the interface is written in right now. */
  readonly language: Language;
  /** The person's own choice, or null while the phone's language decides. */
  readonly chosen: Language | null;
  /** Keeps a choice on this phone; null goes back to the phone's language. */
  readonly choose: (language: Language | null) => Promise<void>;
}

const LanguageContext = createContext<LanguageState>({
  language: defaultLanguage,
  chosen: null,
  choose: () => Promise.resolve(),
});

/**
 * Picks the interface language: the person's stored choice when there is one, otherwise the
 * phone's language. Nothing renders until the stored choice has been read, so no screen appears
 * in one language and then changes to another.
 */
export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const db = useSQLiteContext();
  const locales = useLocales();
  const [stored, setStored] = useState<{ readonly chosen: Language | null }>();

  useEffect(() => {
    let current = true;
    readStoredLanguage(db)
      .catch(() => null)
      .then((chosen) => {
        if (current) setStored({ chosen });
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [db]);

  const choose = useCallback(
    async (language: Language | null) => {
      setStored({ chosen: language });
      await storeLanguage(db, language);
    },
    [db],
  );

  const chosen = stored?.chosen ?? null;
  const language = pickLanguage(
    locales.map((locale) => locale.languageTag),
    chosen,
  );
  const state = useMemo(() => ({ language, chosen, choose }), [language, chosen, choose]);

  if (stored === undefined) return null;
  return <LanguageContext.Provider value={state}>{children}</LanguageContext.Provider>;
}

/** Shows its children in one language whatever the phone or the person chose (registry captures). */
export function ForcedLanguage({ language, children }: ForcedLanguageProps) {
  const outer = useContext(LanguageContext);
  const state = useMemo(() => ({ ...outer, language }), [outer, language]);
  return <LanguageContext.Provider value={state}>{children}</LanguageContext.Provider>;
}

interface ForcedLanguageProps {
  readonly language: Language;
  readonly children: ReactNode;
}

export function useLanguage(): LanguageState {
  return useContext(LanguageContext);
}

/** Keys without placeholders take no second argument; the others require their parameters. */
export type Translate = <Key extends StringKey>(
  key: Key,
  ...params: [keyof ParamsOf<Key>] extends [never] ? [] : [params: ParamsOf<Key>]
) => string;

/** The interface string for a key, in the current language: `const t = useT(); t('session.start')`. */
export function useT(): Translate {
  const { language } = useContext(LanguageContext);
  return useMemo<Translate>(
    () =>
      (key, ...params) =>
        t(language, key, ...params),
    [language],
  );
}
