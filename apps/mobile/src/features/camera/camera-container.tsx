import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import { useNetworkState } from 'expo-network';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, StyleSheet } from 'react-native';

import {
  asksBeforeReading,
  cameraAccess,
  CAMERA_MODES,
  consentAfter,
  isSentMode,
  NO_CAMERA_TRIES,
  triesAfter,
  type CameraAccess,
  type CameraConsent,
  type CameraMode,
  type CameraTries,
} from '@scootch/domain';
import { noTaskLine, offlinePacks } from '@scootch/voice';

import { getReading } from '../../../modules/scootch-reading';
import { appHttp } from '../../api/app-http';
import { createCameraApi } from '../../api/camera-api';
import { useLanguage } from '../../i18n/i18n-provider';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { usePlusRuntime, usePlusState } from '../../state/plus-context';
import { showsSelling } from '../../state/shows-comedy';
import { purchaseStateOf } from '../plus/entitlement';
import { PLUS_SHEET } from '../plus/routes';

import { loadCameraMemory } from './camera-memory';
import { gaveStep, nextRoomZone, readPhoto, type CameraPorts } from './camera-read';
import { CameraScreen, type CameraShown } from './camera-screen';
import { ConsentSheet } from './consent-sheet';

const HELPLINES = '/helplines' as Href;

/** A photo is the camera's for as long as it is on the screen, and gone after. */
function discard(uri: string | null): void {
  if (uri === null) return;
  try {
    new File(uri).delete();
  } catch {
    // Already gone, or never written: either way nothing is kept.
  }
}

/**
 * The camera on the real phone: one photo, read on the phone, and one place to start. The photo
 * is a temporary file that is deleted on a retake and when the camera closes. Paper and Screen
 * ask before the first words leave, and count their one free try only when a read gave a step.
 */
export function CameraContainer() {
  const router = useRouter();
  const day = useToday();
  const { language } = useLanguage();
  const dispatch = useDispatch();
  const network = useNetworkState();
  const { memory } = usePlusRuntime();
  const purchase = purchaseStateOf(usePlusState().customer);
  const [permission, requestPermission] = useCameraPermissions();
  const lens = useRef<CameraView>(null);

  const [mode, setMode] = useState<CameraMode>('desk');
  const [tries, setTries] = useState<CameraTries>(NO_CAMERA_TRIES);
  const [consent, setConsent] = useState<CameraConsent>('not_given');
  const [photo, setPhoto] = useState<string | null>(null);
  const [shown, setShown] = useState<CameraShown>({ kind: 'looking' });
  const [asking, setAsking] = useState(false);
  const [moreShown, setMoreShown] = useState(false);
  const [copied, setCopied] = useState(false);
  // Each read has a number; an answer for a photo that was since thrown away is ignored.
  const reads = useRef(0);
  const held = useRef<string | null>(null);
  held.current = photo;

  const speaker = useMemo(
    () => ({ language, attitude: day.settings.attitude }),
    [language, day.settings.attitude],
  );
  const online = (network.isInternetReachable ?? network.isConnected) !== false;
  const onlineNow = useRef(online);
  onlineNow.current = online;
  const ports = useMemo((): CameraPorts | null => {
    const reading = getReading();
    if (reading === null) return null;
    return {
      reading,
      api: createCameraApi(appHttp(() => language)),
      online: () => onlineNow.current,
    };
  }, [language]);

  useEffect(() => {
    let current = true;
    void loadCameraMemory(memory).then((stored) => {
      if (!current) return;
      setTries(stored.tries);
      setConsent(stored.consent);
    });
    return () => {
      current = false;
    };
  }, [memory]);

  // Closing the camera, however it closes, leaves no photo behind.
  useEffect(() => () => discard(held.current), []);

  // A phone that cannot read a photo has no camera button; reached some other way, it goes back.
  useEffect(() => {
    if (ports === null) router.back();
  }, [ports, router]);
  if (ports === null) return null;

  const access = Object.fromEntries(
    CAMERA_MODES.map((each) => [each, cameraAccess(each, purchase, tries)]),
  ) as Record<CameraMode, CameraAccess>;

  const look = () => {
    reads.current += 1;
    discard(photo);
    setPhoto(null);
    setAsking(false);
    setMoreShown(false);
    setCopied(false);
    setShown({ kind: 'looking' });
    // The free try is spent: the viewfinder goes back to a mode that is open.
    if (access[mode] === 'locked') setMode('desk');
  };

  const read = async (uri: string, as: CameraMode) => {
    const mine = (reads.current += 1);
    setShown({ kind: 'reading' });
    const result = await readPhoto(ports, speaker, as, uri);
    if (mine !== reads.current) return;
    setShown({ kind: 'read', read: result });
    const after = triesAfter(tries, as, purchase, gaveStep(result) ? 'step' : 'failed');
    if (after !== tries) {
      setTries(after);
      void memory.write('cameraTries', after).catch(() => undefined);
    }
  };

  const shutter = async () => {
    if (lens.current === null || access[mode] === 'locked') return;
    setShown({ kind: 'reading' });
    try {
      const taken = await lens.current.takePictureAsync({ quality: 0.85 });
      setPhoto(taken.uri);
      if (asksBeforeReading(mode, consent)) setAsking(true);
      else await read(taken.uri, mode);
    } catch {
      setShown({ kind: 'read', read: { kind: 'failed' } });
    }
  };

  const answerConsent = (event: 'read_it' | 'not_now') => {
    const after = consentAfter(consent, event);
    if (after !== consent) {
      setConsent(after);
      void memory.write('cameraConsent', after).catch(() => undefined);
    }
    setAsking(false);
    if (event === 'read_it' && photo !== null) void read(photo, mode);
    else look();
  };

  const chooseMode = (next: CameraMode) => {
    if (access[next] === 'locked') {
      // The quiet lock leads to the sheet only on a day with nothing heavy in it.
      if (showsSelling(day)) router.push(PLUS_SHEET);
      return;
    }
    setMode(next);
  };

  const granted = permission?.granted === true;
  const visible: CameraShown =
    permission !== null && !granted
      ? { kind: 'permission', canAsk: permission.canAskAgain }
      : shown;

  return (
    <>
      <CameraScreen
        mode={mode}
        access={access}
        shown={visible}
        attitude={speaker.attitude}
        picture={
          photo !== null ? (
            <Image source={{ uri: photo }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          ) : granted ? (
            <CameraView ref={lens} facing="back" style={StyleSheet.absoluteFill} />
          ) : null
        }
        plainLine={offlinePacks[language].plain.acknowledge}
        openingLine={noTaskLine(language, speaker.attitude, 'cameraOpen')}
        moreShown={moreShown}
        copied={copied}
        onMode={chooseMode}
        onClose={() => router.back()}
        onShutter={() => void shutter()}
        onRetake={look}
        onStep={(task) => {
          void dispatch({ type: 'camera_step_chosen', text: task }).catch(() => undefined);
          router.back();
        }}
        onBigger={() => {
          if (shown.kind !== 'read' || shown.read.kind !== 'room') return;
          const mine = reads.current;
          void nextRoomZone(ports, speaker, shown.read).then((next) => {
            if (next !== null && mine === reads.current) setShown({ kind: 'read', read: next });
          });
        }}
        onAllow={() => void requestPermission().catch(() => undefined)}
        onSettings={() => void Linking.openSettings().catch(() => undefined)}
        onMore={() => setMoreShown(true)}
        onCopy={(line) => {
          void Clipboard.setStringAsync(line)
            .then(() => setCopied(true))
            .catch(() => undefined);
        }}
        onHelplines={() => router.push(HELPLINES)}
      />
      {isSentMode(mode) ? (
        <ConsentSheet
          open={asking}
          mode={mode}
          onReadIt={() => answerConsent('read_it')}
          onNotNow={() => answerConsent('not_now')}
        />
      ) : null}
    </>
  );
}
