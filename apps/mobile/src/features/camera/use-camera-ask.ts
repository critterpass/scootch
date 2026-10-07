import { useEffect, useState } from 'react';

import { consentAfter, type CameraConsent } from '@scootch/domain';

import { getReading } from '../../../modules/scootch-reading';
import { usePlusRuntime } from '../../state/plus-context';

import { consentFromStored } from './camera-memory';

/**
 * The switch in Privacy and data: whether Scootch asks before the words on a Paper or Screen
 * photo are sent. It is the same stored answer the consent sheet writes, so switching it on takes
 * the yes away and the sheet comes back. `undefined` on a phone with no camera.
 */
export function useCameraAsk():
  { readonly asks: boolean; readonly onAsks: (asks: boolean) => void } | undefined {
  const { memory } = usePlusRuntime();
  const [consent, setConsent] = useState<CameraConsent>('not_given');
  useEffect(() => {
    let current = true;
    void memory
      .read('cameraConsent')
      .then((stored) => {
        if (current) setConsent(consentFromStored(stored));
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [memory]);

  if (getReading() === null) return undefined;
  return {
    asks: consent !== 'given',
    onAsks: (asks) => {
      const after = consentAfter(consent, asks ? 'switched_off' : 'switched_on');
      setConsent(after);
      void memory.write('cameraConsent', after).catch(() => undefined);
    },
  };
}
