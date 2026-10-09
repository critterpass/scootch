import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useTogether } from '../../state/together-context';
import { goBack } from '../../ui/motion/go-back';
import { accountStep, signIn } from '../account/account-flow';
import { nativeApple } from '../account/apple-port';

import { FRIENDS, TABLE_QUIETED, nameThen, renameThen } from './table-rules';
import { useTablePrefs } from './table-prefs';
import {
  TablesSettingsPage,
  type TablesAccount,
  type TablesSettingsPageProps,
} from './tables-settings-page';

const HERE = '/table-settings';

/** Settings › Tables on the real phone. */
export function TablesSettingsContainer() {
  const { api, signOut, deleteAccount } = useTogether();
  const router = useRouter();
  const focused = useIsFocused();
  const [prefs, changePref] = useTablePrefs();
  const [account, setAccount] = useState<TablesAccount | null | undefined>(undefined);
  const [notice, setNotice] = useState<TablesSettingsPageProps['notice']>(null);
  const [asking, setAsking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  // Counts sign-ins on this page, so the account is read again after one.
  const [signedIn, setSignedIn] = useState(0);

  // Read again whenever the page comes back into view: signing in, the name step, the friends
  // page and the muted and blocked page all change what it shows.
  useEffect(() => {
    if (!focused) return undefined;
    let current = true;
    void Promise.all([
      api.me().catch(() => null),
      api.friends().catch(() => []),
      api.quieted().catch(() => ({ muted: [], blocked: [] })),
    ]).then(([me, friends, quieted]) => {
      if (!current) return;
      setAccount(
        me === null
          ? null
          : {
              name: me.displayName,
              whoCanSit: me.whoCanSit,
              friends: friends.length,
              quieted: quieted.muted.length + quieted.blocked.length,
            },
      );
    });
    return () => {
      current = false;
    };
  }, [api, focused, signedIn]);

  // Apple's sheet opens straight from here. A new account goes on to choose its seat's name, with
  // Apple's first name offered; one that has a name is simply read again. Closing the sheet
  // changes nothing.
  const onSignIn = () => {
    setNotice(null);
    setSigningIn(true);
    void signIn(api, nativeApple)
      .then((done) => {
        if (done === null) return;
        if (accountStep(done.account) === 'name') router.push(nameThen(HERE, done.suggestedName));
        else setSignedIn((count) => count + 1);
      })
      .catch(() => setNotice('sign_in_failed'))
      .finally(() => setSigningIn(false));
  };

  // The account goes from this phone in one of two ways; either leaves the page signed out.
  const leave = (work: () => Promise<void>, failed: 'sign_out_failed' | 'delete_failed') => {
    setNotice(null);
    setAsking(false);
    void work()
      .then(() => setAccount(null))
      .catch(() => setNotice(failed));
  };

  return (
    <TablesSettingsPage
      account={account}
      prefs={prefs}
      notice={notice}
      signingIn={signingIn}
      asking={asking}
      onPref={changePref}
      onWhoCanSit={(whoCanSit) => {
        if (!account) return;
        const before = account;
        // Shown at once; put back if the server did not take it.
        setNotice(null);
        setAccount({ ...account, whoCanSit });
        void api.setWhoCanSit(whoCanSit).catch(() => {
          setAccount(before);
          setNotice('failed');
        });
      }}
      onSignIn={onSignIn}
      onRename={() => router.push(renameThen(HERE))}
      onFriends={() => router.push(FRIENDS)}
      onQuieted={() => router.push(TABLE_QUIETED)}
      onSignOut={() => leave(signOut, 'sign_out_failed')}
      onAskDelete={() => setAsking(true)}
      onKeep={() => setAsking(false)}
      onDelete={() => leave(deleteAccount, 'delete_failed')}
      onClose={() => goBack(router, '/settings')}
    />
  );
}
