import type { CloudSpeech } from './cloud-speech';
import type { VoiceStatus } from './composer-machine';
import type { SpeechPort } from './speech';

export interface AppSpeechOptions {
  /** ElevenLabs, for while the phone is online. */
  readonly cloud: CloudSpeech;
  /** The phone's own recognition, for while it is not. */
  readonly onDevice: SpeechPort;
  /** Whether the person has allowed the microphone and speech recognition. Never prompts. */
  readonly permission: () => Promise<VoiceStatus>;
  readonly online: () => boolean;
}

/**
 * The app's speech: ElevenLabs while the phone is online, which is quick, accurate and hears
 * whichever language is spoken; and the phone's own recognition when it is offline, or when
 * ElevenLabs cannot be reached as a recording starts.
 *
 * Being allowed is all `status` reports. A phone that is offline and cannot transcribe a language
 * by itself can listen again the moment it is online, so that is answered per recording (as
 * nothing heard) and never turns the microphone off.
 */
export function appSpeech({ cloud, onDevice, permission, online }: AppSpeechOptions): SpeechPort {
  let stopCurrent: (() => void) | null = null;
  let abortCurrent: (() => void) | null = null;

  const status = async (): Promise<VoiceStatus> => {
    try {
      const allowed = await permission();
      if (allowed === 'ready' && online()) cloud.warm();
      return allowed;
    } catch {
      return 'unavailable';
    }
  };

  return {
    status,
    ask: async (language) => {
      const answer = await onDevice.ask(language);
      return answer === 'unavailable' ? status() : answer;
    },
    start(language, handlers) {
      abortCurrent?.();
      // False once this recording was thrown away: nothing it still reports is passed on.
      let live = true;
      let letGo = false;
      const onPhone = () => {
        stopCurrent = () => onDevice.stop();
        abortCurrent = () => {
          live = false;
          onDevice.abort();
        };
        onDevice.start(language, {
          ...handlers,
          onFail: (reason) => handlers.onFail(reason === 'unavailable' ? 'nothing' : reason),
        });
      };
      if (!online()) return onPhone();

      stopCurrent = () => {
        letGo = true;
        cloud.stop();
      };
      abortCurrent = () => {
        live = false;
        cloud.abort();
      };
      cloud.start({
        onHeard: (transcript) => live && handlers.onHeard(transcript),
        onLevel: (level) => live && handlers.onLevel(level),
        onEnd: (transcript) => live && handlers.onEnd(transcript),
        onFail: () => {
          if (!live) return;
          // While the person is still talking, the phone takes over; after they let go, it cannot.
          if (letGo) handlers.onFail('nothing');
          else onPhone();
        },
      });
    },
    stop: () => stopCurrent?.(),
    abort: () => abortCurrent?.(),
  };
}
