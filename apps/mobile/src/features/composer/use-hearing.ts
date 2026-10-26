import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import type { Language } from '@phusclass/i18n';

import { soundMode } from '../../effects/sound-mode';

import type { Permission } from './composer-machine';

/** The phone's hearing locale for each app language. */
const LOCALES: Record<Language, string> = { en: 'en-US', vi: 'vi-VN' };

export interface HearingEvents {
  readonly onWords: (words: string) => void;
  readonly onEnded: () => void;
  readonly onUnavailable: () => void;
}

export interface Hearing {
  permission(): Promise<Permission>;
  ask(): Promise<boolean>;
  start(language: Language): Promise<void>;
  stop(): void;
  abort(): void;
}

/** Errors that only mean hearing stopped, with whatever words came. */
const QUIET_ENDS = new Set(['aborted', 'no-speech', 'speech-timeout']);

/**
 * Apple's speech recognition on the phone itself, in the app's language: audio never leaves the
 * phone and nothing waits on a connection. A phone with no on-device model for the language says
 * so through `onUnavailable`, and the composer opens typing.
 */
export function useHearing(events: HearingEvents): Hearing {
  const latest = useRef(events);
  latest.current = events;
  const active = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    const words = event.results[0]?.transcript ?? '';
    latest.current.onWords(words);
  });
  useSpeechRecognitionEvent('end', () => {
    if (!active.current) return;
    active.current = false;
    soundMode.restore();
    latest.current.onEnded();
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (QUIET_ENDS.has(event.error)) return;
    active.current = false;
    soundMode.restore();
    latest.current.onUnavailable();
  });

  const permission = useCallback(async (): Promise<Permission> => {
    try {
      const answer = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (answer.granted) return 'granted';
      return answer.canAskAgain ? 'unknown' : 'denied';
    } catch {
      return 'unknown';
    }
  }, []);

  const ask = useCallback(async (): Promise<boolean> => {
    try {
      return (await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
    } catch {
      return false;
    }
  }, []);

  const start = useCallback(async (language: Language) => {
    const lang = LOCALES[language];
    try {
      if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
        latest.current.onUnavailable();
        return;
      }
      if (Platform.OS === 'ios') {
        const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
        if (installedLocales.length > 0 && !installedLocales.includes(lang)) {
          latest.current.onUnavailable();
          return;
        }
      }
      active.current = true;
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: true,
        addsPunctuation: true,
      });
    } catch {
      active.current = false;
      latest.current.onUnavailable();
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      active.current = false;
      latest.current.onEnded();
    }
  }, []);

  const abort = useCallback(() => {
    active.current = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Nothing was running.
    }
    soundMode.restore();
  }, []);

  return useMemo(
    () => ({ permission, ask, start, stop, abort }),
    [permission, ask, start, stop, abort],
  );
}
