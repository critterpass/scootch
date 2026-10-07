import { describe, expect, it } from '@jest/globals';

import { audioModeFor, createSoundModeControl, type AudioMode } from './sound-mode-control';

describe('the ringer switch', () => {
  it('silences every short effect, whatever the person chose for music', () => {
    for (const musicWhenSilent of [false, true]) {
      expect(audioModeFor({ musicPlaying: false, musicWhenSilent }).playsInSilentMode).toBe(false);
    }
  });

  it('silences music too, until the person chooses otherwise in Settings', () => {
    expect(audioModeFor({ musicPlaying: true, musicWhenSilent: false }).playsInSilentMode).toBe(
      false,
    );
    expect(audioModeFor({ musicPlaying: true, musicWhenSilent: true }).playsInSilentMode).toBe(
      true,
    );
  });

  it('always mixes with the music the person already has on', () => {
    expect(audioModeFor({ musicPlaying: true, musicWhenSilent: true }).interruptionMode).toBe(
      'mixWithOthers',
    );
  });

  it('plays through a silenced phone only while chosen music is playing, then respects it again', () => {
    const applied: AudioMode[] = [];
    const control = createSoundModeControl((mode) => applied.push(mode));
    const silentModes = () => applied.map((mode) => mode.playsInSilentMode);
    // The session starts respecting the switch.
    expect(silentModes()).toEqual([false]);

    control.musicStarted();
    control.musicStopped();
    expect(silentModes()).toEqual([false]);

    control.setMusicWhenSilent(true);
    expect(silentModes()).toEqual([false]);
    control.musicStarted();
    expect(silentModes()).toEqual([false, true]);
    control.musicStopped();
    expect(silentModes()).toEqual([false, true, false]);
  });
});
