import { AudioModule, setAudioModeAsync, type AudioStreamBuffer } from 'expo-audio';

import type { SocketLike } from '../../api/table-socket';
import { systemTimers } from '../../effects/native-adapters';
import { soundMode } from '../../effects/sound-mode';

import { levelFromPcm16, openScribe, scribeTakes, type ScribeSession } from './scribe-session';
import type { SpeechTokens } from './speech-tokens';

export interface CloudSpeechHandlers {
  /** Everything heard so far in this recording. */
  onHeard(transcript: string): void;
  /** How loud the voice is right now, from 0 to 1. */
  onLevel(level: number): void;
  onEnd(transcript: string): void;
  /** Nothing could be heard this way, and nothing was. The phone itself may still listen. */
  onFail(): void;
}

/** Speech turned into text by ElevenLabs, live, in whatever language is spoken. */
export interface CloudSpeech {
  /** Gets ready ahead of time, so the next recording starts sooner. */
  warm(): void;
  start(handlers: CloudSpeechHandlers): void;
  /** Ends the recording and delivers its words through `onEnd`. */
  stop(): void;
  /** Ends the recording and throws its words away. */
  abort(): void;
}

export interface CloudSpeechOptions {
  readonly tokens: SpeechTokens;
  /** Whether the recording plays alongside other apps' sound instead of stopping it. */
  readonly mixes?: boolean;
}

/** The rate asked of the microphone: all that speech needs, and the least to send. */
const SAMPLE_RATE = 16000;

/**
 * The microphone streamed to ElevenLabs. The sound goes from this phone straight to ElevenLabs
 * and is never written to a file here. It runs only in a native build.
 */
export function cloudSpeech({ tokens, mixes = false }: CloudSpeechOptions): CloudSpeech {
  let stopRecording: ((deliver: boolean) => void) | null = null;

  return {
    warm: () => tokens.warm(),
    start(handlers) {
      stopRecording?.(false);
      let over = false;
      let session: ScribeSession | null = null;
      const token = tokens.take();
      // Whatever becomes of this recording, a failed pass is answered where the session reads it.
      token.catch(() => undefined);
      const stream = new AudioModule.AudioStream({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        encoding: 'int16',
      });
      const quiet = () => {
        try {
          stream.stop();
        } catch {
          // Never started.
        }
      };

      /** Lets go of the microphone and puts the app's audio session back on its rule. */
      const release = (): Promise<void> => {
        over = true;
        stopRecording = null;
        listener.remove();
        quiet();
        stream.release();
        soundMode.restore();
        return setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      };
      const fail = (heard: string) => {
        if (over) return;
        // The phone may listen next, so it is told only once the microphone is free again.
        // Words that did arrive are the person's: they are delivered, not asked for again.
        void release().then(() => (heard === '' ? handlers.onFail() : handlers.onEnd(heard)));
      };

      const listener = stream.addListener('audioStreamBuffer', (buffer: AudioStreamBuffer) => {
        if (over) return;
        if (session === null) {
          // The microphone says what it really delivers only with its first sound.
          if (buffer.channels !== 1 || !scribeTakes(buffer.sampleRate)) return fail('');
          session = openScribe({
            token,
            sampleRate: buffer.sampleRate,
            open: (url) => new WebSocket(url) as unknown as SocketLike,
            timers: systemTimers,
            handlers: {
              onHeard: (transcript) => handlers.onHeard(transcript),
              onEnd: (transcript) => {
                void release();
                tokens.warm();
                handlers.onEnd(transcript);
              },
              onFail: fail,
            },
          });
        }
        handlers.onLevel(levelFromPcm16(buffer.data));
        session.push(buffer.data);
      });

      stopRecording = (deliver) => {
        if (over) return;
        if (!deliver) {
          session?.abort();
          void release();
          return;
        }
        quiet();
        if (session === null) fail('');
        else session.finish();
      };

      void setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: mixes ? 'mixWithOthers' : 'doNotMix',
      })
        .then(() => (over ? undefined : stream.start()))
        .catch(() => fail(''));
    },
    stop: () => stopRecording?.(true),
    abort: () => stopRecording?.(false),
  };
}
