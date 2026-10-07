import type { Instant, ParkedThought, SessionLine } from '@scootch/domain';
import type { HapticTap } from '@scootch/sound';

/** The current instant. Nothing in the runner or the store reads the system clock directly. */
export interface Clock {
  now(): Instant;
}

/** One-shot timers. `set` returns the function that cancels it. */
export interface Timers {
  set(delayMs: number, fire: () => void): () => void;
}

export interface CuePlayer {
  play(cue: string): void;
  stop(cue: string): void;
}

export interface HapticsPlayer {
  /** Plays the taps at their own times, under the name of the pattern they belong to. */
  play(taps: readonly HapticTap[], name?: string): void;
  /** Takes back every tap of that pattern not yet played. */
  stop(name: string): void;
}

export interface LocalNotification {
  readonly id: string;
  readonly at: Instant;
  readonly text: string;
}

export interface NotificationScheduler {
  /** The ids of everything still waiting to be delivered. */
  scheduledIds(): Promise<string[]>;
  schedule(notification: LocalNotification): Promise<void>;
  cancel(id: string): Promise<void>;
}

/** The session's Live Activity. Every method does nothing where there are no Live Activities. */
export interface LiveActivityPort {
  /** `taskId` finds the task's monster and words on the Lock Screen; without one it shows a plain session. */
  start(activity: {
    title: string;
    taskId?: string | undefined;
    endsAt: Instant;
    line: string;
  }): Promise<void>;
  update(activity: { endsAt: Instant; line: string }): Promise<void>;
  /** Time is up and the session goes on: the activity stays, counting up. */
  overtime(): Promise<void>;
  /** `caught` leaves the caught card on the Lock Screen; otherwise the activity goes at once. */
  end(caught?: boolean): Promise<void>;
}

/** What the runner hands to the screen layer as state. */
export interface ScreenSink {
  showLine(slot: SessionLine, text: string): void;
  showBurst(burst: 'start' | 'confetti'): void;
  handOverTreat(treat: string): void;
  showParkedThoughts(thoughts: readonly ParkedThought[]): void;
}

/** The person's switches, read each time an effect runs. */
export interface EffectSwitches {
  /** Sound effects. */
  readonly effects: boolean;
  readonly haptics: boolean;
  /** The system's Reduce Motion, or the app's own calm motion. */
  readonly reducedMotion: boolean;
}

/** What the runner needs to know about the task a session is for. */
export interface SessionContext {
  /** The Live Activity's title. */
  readonly title: string;
  /** The task the session is for. */
  readonly taskId?: string;
  /** The line the Live Activity opens with. */
  readonly liveLine: string;
  /** The words for a line slot, or `null` when there is nothing to say. */
  lineFor(slot: SessionLine): string | null;
}
