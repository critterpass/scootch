import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { Quieted } from '../../api/together-api';
import { useTogether } from '../../state/together-context';
import { goBack } from '../../ui/motion/go-back';

import { QuietedPage } from './quieted-page';

/** Settings › Tables › Muted and blocked, on the real phone. */
export function QuietedContainer() {
  const { api } = useTogether();
  const router = useRouter();
  const [lists, setLists] = useState<{ muted: Quieted[]; blocked: Quieted[] } | undefined>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    void api
      .quieted()
      .then(setLists)
      .catch(() => setFailed(true));
  }, [api]);
  useEffect(load, [load]);

  const undo = (work: Promise<void>) => {
    setFailed(false);
    void work.then(load).catch(() => setFailed(true));
  };

  return (
    <QuietedPage
      muted={lists?.muted}
      blocked={lists?.blocked}
      failed={failed}
      onUnmute={(accountId) => undo(api.mute(accountId, false))}
      onUnblock={(accountId) => undo(api.block(accountId, false))}
      onClose={() => goBack(router, '/table-settings')}
    />
  );
}
