import type { Stereo } from '@phusclass/sound';

/** Plays finished audio. `key` names the sound, so one already rendered is not rendered again. */
export interface PcmPlayer {
  play(key: string, render: () => Stereo): void;
  stop(): void;
}
