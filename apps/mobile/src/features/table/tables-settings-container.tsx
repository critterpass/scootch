import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useTogether } from '../../state/together-context';
import { goBack } from '../../ui/motion/go-back';

import { FRIENDS, accountThen } from './table-rules';
import { useTablePrefs } from './table-prefs';
import { TablesSettingsPage, type TablesSettingsPageProps } from './tables-settings-page';

/** Settings › Tables on the real phone. */
export function TablesSettingsContainer() {
  const { api, signOut } = useTogether();
  const router = useRouter();
  const focused = useIsFocused();
  const [prefs, changePref] = useTablePrefs();
  const [account, setAccount] = useState<TablesSettingsPageProps['account']>(undefined);
  const [notice, setNotice] = useState<'sign_out_failed' | null>(null);

  // Read again whenever the page comes back into view: signing in and the friends page change it.
  useEffect(() => {
    if (!focused) return undefined;
    let current = true;
    void Promise.all([api.me().catch(() => null), api.friends().catch(() => [])]).then(
      ([me, friends]) => {
        if (!current) return;
        setAccount(me === null ? null : { name: me.displayName, friends: friends.length });
      },
    );
    return () => {
      current = false;
    };
  }, [api, focused]);

  return (
    <TablesSettingsPage
      account={account}
      prefs={prefs}
      notice={notice}
      onPref={changePref}
      onSignIn={() => router.push(accountThen('/table-settings'))}
      onFriends={() => router.push(FRIENDS)}
      onSignOut={() => {
        setNotice(null);
        void signOut()
          .then(() => setAccount(null))
          .catch(() => setNotice('sign_out_failed'));
      }}
      onClose={() => goBack(router, '/settings')}
    />
  );
}
