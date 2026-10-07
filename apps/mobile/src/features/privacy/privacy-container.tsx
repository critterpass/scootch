import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDataTools, useDispatch, useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { useTogether } from '../../state/together-context';
import { goBack } from '../../ui/motion/go-back';

import { DeleteSheet, PrivacyPage } from './privacy-page';
import { goHome } from '../navigation/go-home';

/**
 * Privacy and data on the real phone. Export writes one file and opens the share sheet. Delete
 * erases every local table, tells the server, and starts the app over as a new phone would.
 */
export function PrivacyContainer() {
  const { settings, today } = useToday();
  const { keepsakes } = useKeepsakes();
  const tools = useDataTools();
  const dispatch = useDispatch();
  const { choose } = useLanguage();
  const router = useRouter();
  const t = useT();
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<
    'privacy.export.failed' | 'privacy.delete.failed' | 'account.signOut.failed' | null
  >(null);

  // Shown only on a phone that signed in for tables; deleting everything deletes the account too.
  const { api, signOut } = useTogether();
  const [accountName, setAccountName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    void api
      .me()
      .then((account) => {
        if (current && account !== null) setAccountName(account.displayName);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [api]);

  const [backupTooLarge, setBackupTooLarge] = useState(false);
  const { backup } = tools;
  useEffect(() => {
    let current = true;
    void backup
      .tooLarge()
      .then((tooLarge) => {
        if (current) setBackupTooLarge(tooLarge);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [backup]);

  // The question names the newest catch. On a crisis day nothing here is playful.
  const caught = (keepsakes?.monsters ?? [])
    .filter((monster) => monster.number !== null)
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0];
  const monsterName = today.kind === 'crisis' ? null : (caught?.name.split(',')[0] ?? null);

  const exportData = () => {
    setNotice(null);
    void tools.exportMyData().catch(() => setNotice('privacy.export.failed'));
  };
  // Only the account goes from this phone: the day, the world and the drawer stay as they are.
  const leaveAccount = () => {
    setNotice(null);
    void signOut()
      .then(() => setAccountName(undefined))
      .catch(() => setNotice('account.signOut.failed'));
  };
  const deleteAll = async () => {
    setAsking(false);
    try {
      await tools.deleteEverything();
      await choose(null);
      await dispatch({ type: 'storage_replaced' });
      goHome(router);
    } catch {
      setNotice('privacy.delete.failed');
    }
  };

  return (
    <>
      <PrivacyPage
        keepTranscripts={settings.keepTranscripts}
        notice={notice === null ? null : t(notice)}
        backupTooLarge={backupTooLarge}
        {...(accountName === undefined ? {} : { accountName })}
        onKeepTranscripts={(keepTranscripts) =>
          void dispatch({ type: 'settings_changed', changes: { keepTranscripts } }).catch(
            () => undefined,
          )
        }
        onExport={exportData}
        onAskDelete={() => setAsking(true)}
        onSignOut={leaveAccount}
        onClose={() => goBack(router, '/settings')}
      />
      <DeleteSheet
        open={asking}
        monsterName={monsterName}
        attitude={settings.attitude}
        onKeep={() => setAsking(false)}
        onDelete={() => void deleteAll()}
      />
    </>
  );
}
