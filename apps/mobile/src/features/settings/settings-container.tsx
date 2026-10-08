import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Share } from 'react-native';

import { useMusicWhenSilent } from '../../effects/sound-mode';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { developerToolsAllowed } from '../../screens/registry/support/developer-tools';
import { useDataTools, useDispatch, useToday } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';
import { usePlusState } from '../../state/plus-context';
import { showsSelling } from '../../state/shows-comedy';
import { useTogether } from '../../state/together-context';
import { goBack } from '../../ui/motion/go-back';
import { useHomePager, usePageShown } from '../home-pager/home-pager-context';
import { STUDIO_ROUTE } from '../plus/routes';
import { accountThen, friendInviteLink } from '../table/table-rules';

import { useAppIcon } from '../look/use-app-icon';

import { FinishWithPage } from './finish-with-page';
import { SettingsPage } from './settings-page';

const PAGES = {
  'finish-with': '/finish-with',
  privacy: '/privacy',
  helplines: '/helplines',
  // Your card: what this phone has, and the quiet way to the sheet from there.
  plus: '/plus/manage',
  tables: '/table-settings',
  'developer-tools': '/developer-tools',
  icon: '/look/icon',
  wallpaper: '/look/wallpaper',
  language: '/language',
  'quiet-hours': '/quiet-hours',
} as const satisfies Record<string, string>;

/**
 * Settings on the real phone: every change is one store event, written at once. Beside home it is
 * a page kept ready out of sight, and closes by sliding home.
 */
export function SettingsContainer() {
  const day = useToday();
  const { settings } = day;
  const { chosen, language } = useLanguage();
  const { backup } = useDataTools();
  const dispatch = useDispatch();
  const router = useRouter();
  const [backupOff, setBackupOff] = useState(false);
  const [musicWhenSilent, setMusicWhenSilent] = useMusicWhenSilent();
  const { api } = useTogether();
  const t = useT();
  const appIcon = useAppIcon();
  const { customer, member } = usePlusState();
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

  // The studio sells: on a day with something heavy in it, its row rests.
  const studioDoor = {
    openStudio: () => router.push(STUDIO_ROUTE),
  };
  const studio: { readonly openStudio?: () => void } = showsSelling(day) ? studioDoor : {};
  return (
    <SettingsPage
      settings={settings}
      onStudio={studio.openStudio}
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
      card={{ plan: customer.activePlan, number: member.number, finish: appIcon.finish }}
      onInvite={invite}
      onChange={(changes) =>
        void dispatch({ type: 'settings_changed', changes }).catch(() => undefined)
      }
      onOpen={(page) =>
        // Back Tap, the Action button and automations are set up in Shortcuts, not here.
        page === 'shortcuts'
          ? void Linking.openURL('shortcuts://').catch(() => undefined)
          : router.push(PAGES[page])
      }
      onClose={() => (pager ? pager.show('home') : goBack(router, '/'))}
    />
  );
}

/** "Catch with", wired to the setting the session reads. */
export function FinishWithContainer() {
  const { settings, monster } = useToday();
  const dispatch = useDispatch();
  const router = useRouter();
  return (
    <FinishWithPage
      catchWith={settings.catchWith}
      monster={monster}
      onChoose={(catchWith) =>
        void dispatch({ type: 'settings_changed', changes: { catchWith } }).catch(() => undefined)
      }
      onClose={() => goBack(router, '/settings')}
    />
  );
}
