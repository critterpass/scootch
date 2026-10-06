import type { SessionEvent } from '@scootch/domain';

/** Hears a spoken "done" while the finish is on show. */
export interface VoiceFinishTrigger {
  /** Starts listening. `onSaidDone` is called once, when "done" is heard. Returns the way to stop. */
  listen(onSaidDone: () => void): () => void;
}

/** The session event a heard "done" dispatches. It reaches the same finish as every other method. */
export const SAID_DONE: SessionEvent = { type: 'said_done' };

/**
 * The seam for saying "done". No listener is wired to the speech library yet, so this is `null`
 * and nothing pretends to listen: a person who chose to say "done" finishes with the tap-twice
 * control, which the system's Voice Control can press by its name. A listener goes here.
 */
export const voiceFinishTrigger: VoiceFinishTrigger | null = null;
