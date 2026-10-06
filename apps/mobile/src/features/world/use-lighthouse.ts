import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { localDateTime } from '@scootch/domain';

import { openRepositories } from '../../data/repositories';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { purchaseStateOf } from '../plus/entitlement';

import { landLighthouse } from './landmarks';

/**
 * Makes sure the world of someone who owns lifetime has its lighthouse. `owned` says whether they
 * do; `landed` counts up when the piece was added just now, so a screen can read the world again.
 */
export function useLighthouse(): { readonly owned: boolean; readonly landed: number } {
  const db = useSQLiteContext();
  const runtime = usePlusRuntime();
  const owned = purchaseStateOf(usePlusState().customer) === 'lifetime';
  const [landed, setLanded] = useState(0);
  useEffect(() => {
    if (!owned) return undefined;
    let current = true;
    const today = localDateTime(runtime.now(), runtime.timeZone()).date;
    void landLighthouse(openRepositories(db).worldPieces, today)
      .then((added) => {
        if (added && current) setLanded((count) => count + 1);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [owned, db, runtime]);
  return { owned, landed };
}
