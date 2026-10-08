import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';

import { useMusicWhenSilent } from '../../effects/sound-mode';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { developerToolsAllowed } from '../../screens/registry/support/developer-tools';
import { useDataTools, useDispatch, useToday } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';
import { useTogether } from '../../state/together-context';
import { goBack } from '../../ui/motion/go-back';
import { useHomePager, usePageShown } from '../home-pager/home-pager-context';
import { accountThen, friendInviteLink } from '../table/table-rules';

import { useAppIcon } from '../look/use-app-icon';

import { FinishWithPage } from './finish-with-page';
import { SettingsPage } from './settings-page';

const PAGES = {
  'finish-with': '/finish-with',
  privacy: '/privacy',
  helplines: '/helplines',
  // The manage page: what this phone has, and the quiet way to the sheet from there.
  plus: '/plus/manage',
  tables: '/table-settings',
  'developer-tools': '/developer-tools',
  icon: '/look/icon',
  studio: '/studio',
  wallpaper: '/look/wallpaper',
} as const satisfies Record<string, string>;

/**
 * Settings on the real phone: every change is one store event, written at once. Beside home it is
 * a page kept ready out of sight, and closes by sliding home.
 */
export function SettingsContainer() {
  const { settings } = useToday();
  const { chosen, choose, language } = useLanguage();
  const { backup } = useDataTools();
  const dispatch = useDispatch();
  const router = useRouter();
  const [backupOff, setBackupOff] = useState(false);
  const [musicWhenSilent, setMusicWhenSilent] = useMusicWhenSilent();
  const { api } = useTogether();
  const t = useT();
  const appIcon = useAppIcon();
  const pager = useHomePager();
  // In view: on the screen, and with no other screen pushed over it.
  const inView = usePageShown();
  const focused = useIsFocused() && inView;
  const [tableName, setTableName] = useState<string | null>(null);

  // Read again whenever Settings comes back into view: the tables page can sign in or out.
  useEffect(() => {
    if (!focused) return undefined;
    let current = true;
    void api
      .me()
      .catch(() => null)
      .then((account) => {
        if (current) setTableName(account?.displayName ?? null);
      });
    return () => {
      current = false;
    };
  }, [api, focused]);

  // A friend link needs an account: without one, the friends page asks for it first.
  const invite = () =>
    void api
      .friendInvite()
      .then(({ code }) =>
        Share.share({ message: t('friends.invite.message', { link: friendInviteLink(code) }) }),
      )
      .catch(() => router.push(accountThen('/friends')));

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
      musicWhenSilent={musicWhenSilent}
      onMusicWhenSilent={setMusicWhenSilent}
      tableName={tableName}
      look={{ icon: appIcon.icon, finish: appIcon.finish }}
      onInvite={invite}
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
      onClose={() => (pager ? pager.show('home') : goBack(router, '/'))}
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
      onClose={() => goBack(router, '/settings')}
    />
  );
}
