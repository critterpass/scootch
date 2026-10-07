import { ExpoSpeechRecognitionModule as Recognizer } from 'expo-speech-recognition';

import type { Language } from '@scootch/i18n';

import type { VoiceStatus } from './composer-machine';

export interface SpeechHandlers {
  /** Everything heard so far in this recording. */
  onHeard(transcript: string): void;
  /** How loud the voice is right now, from 0 to 1. */
  onLevel(level: number): void;
  onEnd(transcript: string): void;
  onFail(reason: 'refused' | 'unavailable' | 'nothing'): void;
}

/** The phone's own speech recognition, as the composer needs it. */
export interface SpeechPort {
  /** Whether the phone may and can listen in this language. Never shows a prompt. */
  status(language: Language): Promise<VoiceStatus>;
  /** Shows the system's microphone and speech prompts, then answers as `status` does. */
  ask(language: Language): Promise<VoiceStatus>;
  start(language: Language, handlers: SpeechHandlers): void;
  /** Ends the recording and delivers its words through `onEnd`. */
  stop(): void;
  /** Ends the recording and throws its words away. */
  abort(): void;
}

/** The locale each app language is recognised in. */
export const SPEECH_LOCALES: Readonly<Record<Language, string>> = { en: 'en-US', vi: 'vi-VN' };

/** The recogniser reports loudness from about -2 (silence) to 10. */
export function levelFromVolume(volume: number): number {
  return Math.max(0, Math.min(1, (volume + 2) / 12));
}

async function ableToTranscribe(language: Language): Promise<boolean> {
  if (!Recognizer.isRecognitionAvailable() || !Recognizer.supportsOnDeviceRecognition()) {
    return false;
  }
  const { installedLocales } = await Recognizer.getSupportedLocales({});
  // An empty list means the phone cannot say; starting then answers for it.
  if (installedLocales.length === 0) return true;
  return installedLocales.some((locale) => locale.toLowerCase().startsWith(language));
}

export interface NativeSpeechOptions {
  /**
   * The audio session the recogniser records in. Left out, the library's own is used, which stops
   * other apps' sound; a caller that listens while music may be playing passes one that mixes.
   */
  readonly iosCategory?: Parameters<typeof Recognizer.start>[0]['iosCategory'];
}

/**
 * Speech recognition on the phone itself. The recording is asked to stay on the device
 * (`requiresOnDeviceRecognition`), so the audio is never sent anywhere, and no recording option is
 * set, so no audio file is ever written. It runs only in a native build.
 */
export function nativeSpeech(options: NativeSpeechOptions = {}): SpeechPort {
  let subscriptions: { remove(): void }[] = [];
  const release = () => {
    for (const subscription of subscriptions) subscription.remove();
    subscriptions = [];
  };

  const status = async (language: Language): Promise<VoiceStatus> => {
    try {
      if (!(await ableToTranscribe(language))) return 'unavailable';
      const permission = await Recognizer.getPermissionsAsync();
      if (permission.granted) return 'ready';
      return permission.canAskAgain ? 'unasked' : 'refused';
    } catch {
      return 'unavailable';
    }
  };

  return {
    status,
    ask: async (language) => {
      try {
        const permission = await Recognizer.requestPermissionsAsync();
        if (!permission.granted) return 'refused';
      } catch {
        return 'unavailable';
      }
      return status(language);
    },
    start(language, handlers) {
      release();
      const finals: string[] = [];
      let interim = '';
      let over = false;
      const heard = () => [...finals, interim].filter((part) => part !== '').join(' ');
      subscriptions = [
        Recognizer.addListener('result', (event) => {
          const transcript = event.results[0]?.transcript.trim() ?? '';
          if (event.isFinal) {
            if (transcript !== '') finals.push(transcript);
            interim = '';
          } else interim = transcript;
          handlers.onHeard(heard());
        }),
        Recognizer.addListener('volumechange', (event) => {
          handlers.onLevel(levelFromVolume(event.value));
        }),
        Recognizer.addListener('error', (event) => {
          if (over || event.error === 'aborted') return;
          over = true;
          if (event.error === 'not-allowed') handlers.onFail('refused');
          else if (
            event.error === 'language-not-supported' ||
            event.error === 'service-not-allowed'
          ) {
            handlers.onFail('unavailable');
          } else handlers.onFail('nothing');
        }),
        Recognizer.addListener('end', () => {
          release();
          if (over) return;
          over = true;
          handlers.onEnd(heard());
        }),
      ];
      try {
        Recognizer.start({
          lang: SPEECH_LOCALES[language],
          interimResults: true,
          continuous: true,
          requiresOnDeviceRecognition: true,
          addsPunctuation: true,
          volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
          ...(options.iosCategory ? { iosCategory: options.iosCategory } : {}),
        });
      } catch {
        over = true;
        release();
        handlers.onFail('unavailable');
      }
    },
    stop: () => Recognizer.stop(),
    abort: () => {
      release();
      Recognizer.abort();
    },
  };
}
