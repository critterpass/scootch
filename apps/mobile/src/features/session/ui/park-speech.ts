import { AVAudioSessionCategory, AVAudioSessionCategoryOptions } from 'expo-speech-recognition';

import type { Language } from '@scootch/i18n';

import { soundMode } from '../../../effects/sound-mode';
import { phoneSpeech } from '../../composer/phone-speech';
import { nativeSpeech, type SpeechPort } from '../../composer/speech';

/**
 * The microphone inside a session. The person may have music on, and the session's own sounds
 * follow the ringer switch: so the recording mixes with whatever is playing instead of stopping
 * it, and when it ends, however it ends, the app's audio session is put back on its rule.
 */
export function parkSpeech(language: () => Language): SpeechPort {
  const speech = phoneSpeech({
    language,
    mixes: true,
    onDevice: nativeSpeech({
      iosCategory: {
        category: AVAudioSessionCategory.playAndRecord,
        categoryOptions: [
          AVAudioSessionCategoryOptions.mixWithOthers,
          AVAudioSessionCategoryOptions.defaultToSpeaker,
          AVAudioSessionCategoryOptions.allowBluetooth,
        ],
      },
    }),
  });
  let recording = false;
  const over = () => {
    if (!recording) return;
    recording = false;
    soundMode.restore();
  };
  return {
    status: (language) => speech.status(language),
    ask: (language) => speech.ask(language),
    start(language, handlers) {
      recording = true;
      speech.start(language, {
        onHeard: (transcript) => handlers.onHeard(transcript),
        onLevel: (level) => handlers.onLevel(level),
        onEnd: (transcript) => {
          over();
          handlers.onEnd(transcript);
        },
        onFail: (reason) => {
          over();
          handlers.onFail(reason);
        },
      });
    },
    stop: () => speech.stop(),
    abort: () => {
      speech.abort();
      over();
    },
  };
}
