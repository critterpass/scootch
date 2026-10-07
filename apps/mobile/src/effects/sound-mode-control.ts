/** How the phone's audio session is set: what the ringer switch silences. */
export interface AudioMode {
  readonly playsInSilentMode: boolean;
  readonly interruptionMode: 'mixWithOthers';
}

export interface SoundFacts {
  /** The week's record or the day's bar is playing right now. */
  readonly musicPlaying: boolean;
  /** The person chose, in Settings, to hear music with the ringer switch off. */
  readonly musicWhenSilent: boolean;
}

/**
 * The rule for the ringer switch. Short effects always respect it: an app for attention never
 * makes a sound in a meeting. Music (the record, the day's bar) plays through a silenced phone
 * only when the person has said so in Settings, and only for as long as it is playing. Haptics
 * are not sound and are not decided here: they follow the Haptics switch alone. Everything mixes
 * with the person's own music.
 */
export function audioModeFor(facts: SoundFacts): AudioMode {
  return {
    playsInSilentMode: facts.musicPlaying && facts.musicWhenSilent,
    interruptionMode: 'mixWithOthers',
  };
}

export interface SoundModeControl {
  /** The Settings choice, as stored or as just changed. */
  setMusicWhenSilent(on: boolean): void;
  musicStarted(): void;
  musicStopped(): void;
  /**
   * Puts the audio session back on the rule after something else changed it (the microphone, for
   * a spoken thought), whether or not the rule's answer is the one last applied.
   */
  restore(): void;
}

/** Keeps the audio session on the rule, calling `apply` only when the answer changes. */
export function createSoundModeControl(apply: (mode: AudioMode) => void): SoundModeControl {
  let facts: SoundFacts = { musicPlaying: false, musicWhenSilent: false };
  let applied: boolean | null = null;
  const update = (changes: Partial<SoundFacts>) => {
    facts = { ...facts, ...changes };
    const mode = audioModeFor(facts);
    if (mode.playsInSilentMode === applied) return;
    applied = mode.playsInSilentMode;
    apply(mode);
  };
  // The session starts on the rule, before anything has asked.
  update({});
  return {
    setMusicWhenSilent: (on) => update({ musicWhenSilent: on }),
    musicStarted: () => update({ musicPlaying: true }),
    musicStopped: () => update({ musicPlaying: false }),
    restore: () => {
      const mode = audioModeFor(facts);
      applied = mode.playsInSilentMode;
      apply(mode);
    },
  };
}
