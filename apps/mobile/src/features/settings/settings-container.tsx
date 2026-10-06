import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';
import { developerToolsAllowed } from '../../screens/registry/support/developer-tools';
import { useDataTools, useDispatch, useToday } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';

import { FinishWithPage } from './finish-with-page';
import { SettingsPage } from './settings-page';

const PAGES = {
  'finish-with': '/finish-with',
  privacy: '/privacy',
  helplines: '/helplines',
  // The manage page: what this phone has, and the quiet way to the sheet from there.
  plus: '/plus/manage',
  'developer-tools': '/developer-tools',
} as const satisfies Record<string, string>;

/** Settings on the real phone: every change is one store event, written at once. */
export function SettingsContainer() {
  const { settings } = useToday();
  const { chosen, choose, language } = useLanguage();
  const { backup } = useDataTools();
  const dispatch = useDispatch();
  const router = useRouter();
  const [backupOff, setBackupOff] = useState(false);

  useEffect(() => {
    let current = true;
    void backup
      .bothStoresOff()
      .then((off) => {
        if (current) setBackupOff(off);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [backup]);

  return (
    <SettingsPage
      settings={settings}
      chosenLanguage={chosen}
      // Scootch's own words, from the offline pack: with both stores off there is no spare copy.
      backupLine={
        backupOff ? lineWithNoTask('backupOff', { language, attitude: settings.attitude }) : null
      }
      developerTools={developerToolsAllowed()}
      onChange={(changes) =>
        void dispatch({ type: 'settings_changed', changes }).catch(() => undefined)
      }
      onLanguage={(next) =>
        // The language is one stored key; the store reads its settings again once it is written.
        void choose(next)
          .then(() => dispatch({ type: 'settings_changed', changes: {} }))
          .catch(() => undefined)
      }
      onOpen={(page) => router.push(PAGES[page])}
      onClose={() => router.replace('/')}
    />
  );
}

/** "Finish with", wired to the setting the session reads. */
export function FinishWithContainer() {
  const { settings } = useToday();
  const dispatch = useDispatch();
  const router = useRouter();
  return (
    <FinishWithPage
      finishWith={settings.finishWith}
      onChoose={(finishWith) =>
        void dispatch({ type: 'settings_changed', changes: { finishWith } }).catch(() => undefined)
      }
      onClose={() => router.replace('/settings')}
    />
  );
}
