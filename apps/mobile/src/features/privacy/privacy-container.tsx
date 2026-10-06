import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDataTools, useDispatch, useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';

import { DeleteSheet, PrivacyPage } from './privacy-page';

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
  const [notice, setNotice] = useState<'privacy.export.failed' | 'privacy.delete.failed' | null>(
    null,
  );

  // The question names the newest catch. On a crisis day nothing here is playful.
  const caught = (keepsakes?.monsters ?? [])
    .filter((monster) => monster.number !== null)
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0];
  const monsterName = today.kind === 'crisis' ? null : (caught?.name.split(',')[0] ?? null);

  const exportData = () => {
    setNotice(null);
    void tools.exportMyData().catch(() => setNotice('privacy.export.failed'));
  };
  const deleteAll = async () => {
    setAsking(false);
    try {
      await tools.deleteEverything();
      await choose(null);
      await dispatch({ type: 'storage_replaced' });
      router.replace('/');
    } catch {
      setNotice('privacy.delete.failed');
    }
  };

  return (
    <>
      <PrivacyPage
        keepTranscripts={settings.keepTranscripts}
        notice={notice === null ? null : t(notice)}
        onKeepTranscripts={(keepTranscripts) =>
          void dispatch({ type: 'settings_changed', changes: { keepTranscripts } }).catch(
            () => undefined,
          )
        }
        onExport={exportData}
        onAskDelete={() => setAsking(true)}
        onClose={() => router.replace('/settings')}
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
