import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { encodeWav } from '@scootch/sound';

import type { PcmPlayer } from './pcm-player';

/**
 * Plays a bar or a week the way the cue player plays a cue: the audio is rendered to PCM once,
 * written to the cache folder as a WAV file and played through expo-audio. It runs only in a
 * native build; the unit tests use a fake.
 */
export function nativePcmPlayer(): PcmPlayer {
  let playing: AudioPlayer | null = null;
  const stop = () => {
    try {
      playing?.pause();
      playing?.remove();
    } catch {
      // Nothing was playing.
    }
    playing = null;
  };
  return {
    play(key, render) {
      stop();
      try {
        const file = new File(Paths.cache, `record-${key}.wav`);
        if (!file.exists) {
          file.create();
          file.writeSync(encodeWav(render()));
        }
        playing = createAudioPlayer(file.uri);
        playing.play();
      } catch {
        // A record that cannot play is silence, never a broken screen.
      }
    },
    stop,
  };
}
