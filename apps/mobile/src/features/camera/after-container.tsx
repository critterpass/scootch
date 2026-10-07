import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { readDesk } from '@scootch/domain';
import { noTaskLine } from '@scootch/voice';

import { getReading } from '../../../modules/scootch-reading';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { usePlusRuntime } from '../../state/plus-context';
import { nativeShareDevice } from '../share/native-share-device';

import { renderAfterCard } from './after-card-image';
import { AfterScreen, type AfterShown } from './after-screen';
import { afterFigures, afterOffer, beforeFromStored, type BeforePhoto } from './before-photo';
import { discardPhoto } from './photo-files';

const SITE = 'scootch.app';

/**
 * The second photo, on the real phone. It is read on the phone like the first, only to count what
 * is in it. Both photos are deleted when this closes; what the person keeps is the one picture
 * made from them, saved to their own photos or handed to the share sheet. Nothing is uploaded.
 */
export function AfterContainer() {
  const router = useRouter();
  const t = useT();
  const { language } = useLanguage();
  const { settings } = useToday();
  const { memory, now } = usePlusRuntime();
  const { keepsakes } = useKeepsakes();
  const [permission, requestPermission] = useCameraPermissions();
  const lens = useRef<CameraView>(null);
  const [before, setBefore] = useState<BeforePhoto | null | undefined>(undefined);
  const [shown, setShown] = useState<AfterShown>({ kind: 'asking' });
  const taken = useRef<string | null>(null);
  const first = useRef<string | null>(null);
  const reading = getReading();

  useEffect(() => {
    let current = true;
    void memory
      .read('cameraBefore')
      .then((stored) => {
        if (current) setBefore(beforeFromStored(stored));
      })
      .catch(() => {
        if (current) setBefore(null);
      });
    return () => {
      current = false;
    };
  }, [memory]);
  first.current = before?.uri ?? null;

  // Closing this always deletes the second photo. The first goes with it once it has been used
  // or turned down ("Skip", or the card was made); closed before either, it waits for another go.
  const settled = useRef(false);
  useEffect(
    () => () => {
      discardPhoto(taken.current);
      if (!settled.current) return;
      discardPhoto(first.current);
      void memory.write('cameraBefore', null).catch(() => undefined);
    },
    [memory],
  );

  // Nothing to compare with (no first photo, or no reader on this phone): there is no page here.
  const offer = before && keepsakes ? afterOffer(before, keepsakes, now()) : null;
  const nothingToDo =
    reading === null || before === null || (keepsakes !== null && before && !offer);
  useEffect(() => {
    if (nothingToDo) router.back();
  }, [nothingToDo, router]);
  // The camera was allowed for the first photo; if that was since taken back, it is asked again.
  const granted = permission?.granted === true;
  useEffect(() => {
    if (permission !== null && !granted && permission.canAskAgain) {
      void requestPermission().catch(() => undefined);
    }
  }, [permission, granted, requestPermission]);
  if (nothingToDo || reading === null || !before || !offer) return null;

  const day = new Intl.DateTimeFormat(language, { weekday: 'long' }).format(before.takenAt);
  const title = t(before.mode === 'desk' ? 'camera.after.title.desk' : 'camera.after.title.room', {
    day,
  });

  const shutter = async () => {
    if (lens.current === null) return;
    setShown({ kind: 'reading' });
    try {
      const photo = await lens.current.takePictureAsync({ quality: 0.85 });
      taken.current = photo.uri;
      const seen = await reading.findThings(photo.uri);
      const things = seen.things.map(({ id, box, labels }) => ({ id, box, labels }));
      const desk = readDesk(things);
      // Counted the way the first photo was: on a desk, only what could be moved.
      const thingsNow =
        before.mode === 'room' ? things.length : desk.kind === 'step' ? desk.others.length + 1 : 0;
      settled.current = true;
      setShown({
        kind: 'card',
        beforeUri: before.uri,
        afterUri: photo.uri,
        title,
        ...afterFigures(before, thingsNow, offer.minutes),
        notice: null,
      });
    } catch {
      setShown({ kind: 'asking' });
    }
  };

  const card = async (): Promise<string | null> => {
    if (shown.kind !== 'card') return null;
    return renderAfterCard(shown.beforeUri, shown.afterUri, {
      title,
      before: t('camera.after.before'),
      after:
        shown.minutes === null
          ? t('camera.after.afterPlain')
          : t('camera.after.after', { count: shown.minutes }),
      site: SITE,
    });
  };
  const say = (notice: string) =>
    setShown((current) => (current.kind === 'card' ? { ...current, notice } : current));
  const keep = async () => {
    try {
      const uri = await card();
      if (uri === null) return;
      const outcome = await nativeShareDevice.saveToPhotos(uri);
      say(t(outcome === 'saved' ? 'camera.after.kept' : 'camera.after.refused'));
    } catch {
      say(t('camera.after.failed'));
    }
  };
  const share = async () => {
    try {
      const uri = await card();
      if (uri !== null) await nativeShareDevice.openShareSheet(uri, 'image/png');
    } catch {
      say(t('camera.after.failed'));
    }
  };

  return (
    <AfterScreen
      shown={shown}
      attitude={settings.attitude}
      viewfinder={
        granted ? <CameraView ref={lens} facing="back" style={StyleSheet.absoluteFill} /> : null
      }
      askLine={noTaskLine(language, settings.attitude, 'cameraAfterAsk')}
      cardLine={noTaskLine(language, settings.attitude, 'cameraAfter')}
      onShutter={() => void shutter()}
      onSkip={() => {
        settled.current = true;
        router.back();
      }}
      onKeep={() => void keep()}
      onShare={() => void share()}
      onDone={() => router.back()}
    />
  );
}
