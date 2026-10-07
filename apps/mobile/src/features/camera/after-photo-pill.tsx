import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';

import { getReading } from '../../../modules/scootch-reading';
import { useT } from '../../i18n/i18n-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { usePlusRuntime } from '../../state/plus-context';
import { GlassPill } from '../../ui/buttons';
import { CameraIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { afterOffer, beforeFromStored, beforeIsStale, type BeforePhoto } from './before-photo';
import { discardPhoto } from './photo-files';

const AFTER = '/camera-after' as Href;

/**
 * On home, after a session that began with a photo was caught: the one tap that takes the second
 * photo. It is not there before the catch, after a task that was not finished, or for a serious
 * one. A first photo a day old is deleted here without a word.
 */
export function AfterPhotoPill() {
  const router = useRouter();
  const t = useT();
  const { palette } = useScreenStyle();
  const { memory, now } = usePlusRuntime();
  const [before, setBefore] = useState<BeforePhoto | null>(null);
  const [seen, setSeen] = useState(0);
  // Read again each time home comes back: after the camera, a session, or the second photo.
  useFocusEffect(
    useCallback(() => {
      let current = true;
      if (getReading() === null) return undefined;
      void memory
        .read('cameraBefore')
        .then((stored) => {
          if (!current) return;
          const kept = beforeFromStored(stored);
          if (kept !== null && beforeIsStale(kept, now())) {
            discardPhoto(kept.uri);
            void memory.write('cameraBefore', null).catch(() => undefined);
            setBefore(null);
          } else {
            setBefore(kept);
          }
          setSeen((count) => count + 1);
        })
        .catch(() => undefined);
      return () => {
        current = false;
      };
    }, [memory, now]),
  );
  const { keepsakes } = useKeepsakes(seen);
  if (afterOffer(before, keepsakes, now()) === null) return null;
  return (
    <GlassPill
      label={t('camera.after.pill')}
      hint={t('camera.after.pill.hint')}
      onPress={() => router.push(AFTER)}
      testID="camera-after-pill"
    >
      <CameraIcon color={palette.ink} />
      <SessionText face="pill" color={palette.ink}>
        {t('camera.after.pill')}
      </SessionText>
    </GlassPill>
  );
}
