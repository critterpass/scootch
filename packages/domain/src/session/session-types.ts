import type { FinishMethod, Id } from '../contracts';
import type { Instant } from '../day';

/** `quiet` is the path of a serious task: the same steps, with no burst, confetti or comedy. */
export type SessionTone = 'full' | 'quiet';

/** How much is being asked. Minutes only go down and `shrinkCount` only goes up. */
export interface Ask {
  readonly minutes: number;
  readonly shrinkCount: number;
}

export interface ParkedThought {
  readonly text: string;
  readonly parkedAt: Instant;
}

export type TimedPhase = 'running' | 'stuck' | 'holding';
export type SessionPhase =
  | 'set'
  | TimedPhase
  | 'time_up'
  | 'not_finished'
  | 'finished'
  | 'left_early'
  | 'carried_over'
  | 'made_smaller';

/**
 * A session from "task set" to its end. It is plain data, so storing it and reading it back after
 * the app was killed gives the same session: the timer is `endsAt`, never a ticking count.
 */
export interface LiveSession {
  readonly phase: SessionPhase;
  readonly taskId: Id;
  readonly tone: SessionTone;
  readonly ask: Ask;
  /** The treat named before starting. */
  readonly treat: string | null;
  readonly startedAt: Instant | null;
  readonly endsAt: Instant | null;
  readonly endedAt: Instant | null;
  /** The two-minutes-left moment has passed. */
  readonly warned: boolean;
  /** Stuck help has been offered or asked for, so the timed check-in stays away. */
  readonly checkedIn: boolean;
  /** False while the app is in the background or not running. The timer does not stop. */
  readonly inForeground: boolean;
  /** Where a hold started, so letting go early returns there. */
  readonly heldFrom: 'running' | 'stuck' | 'time_up' | null;
  /** How many times "Smaller" was tapped on the tiny next step. */
  readonly stepShrinks: number;
  /** Hidden until the end: read them through `visibleThoughts`. */
  readonly thoughts: readonly ParkedThought[];
}

/** A task the user let go leaves a session with nothing in it. */
export interface LetGoSession {
  readonly phase: 'let_go';
}

export type SessionState = LiveSession | LetGoSession;

export type SessionEvent =
  /** An excuse was met with a shorter counter-offer. A longer one is ignored. */
  | { readonly type: 'bargained'; readonly minutes: number }
  | { readonly type: 'too_big' }
  | { readonly type: 'started' }
  /** A timer or scheduled moment fired; the reducer reads the time from `now`. */
  | { readonly type: 'clock' }
  | { readonly type: 'backgrounded' }
  | { readonly type: 'foregrounded' }
  | { readonly type: 'killed' }
  | { readonly type: 'relaunched' }
  | { readonly type: 'thought_parked'; readonly text: string }
  | { readonly type: 'stuck_tapped' }
  | { readonly type: 'step_smaller' }
  | { readonly type: 'step_accepted' }
  | { readonly type: 'hold_started' }
  | { readonly type: 'hold_released' }
  | { readonly type: 'hold_completed' }
  | { readonly type: 'double_tapped' }
  /** The task's monster was caught by hand. It took the hold's place and is stored as one. */
  | { readonly type: 'caught' }
  | { readonly type: 'said_done' }
  /** The plain finish button of a serious task. */
  | { readonly type: 'finish_tapped' }
  | { readonly type: 'not_finished' }
  /** "Changed my mind", before any of the three choices: back to the session as it was. */
  | { readonly type: 'mind_changed' }
  | { readonly type: 'chose_carry_on' }
  | { readonly type: 'chose_make_smaller' }
  | { readonly type: 'chose_let_go' }
  | { readonly type: 'left' };

/** Line slots. The pack keys of the task call, plus two the offline pack supplies. */
export type SessionLine =
  | 'start'
  | 'acknowledge'
  | 'checkIn'
  | 'tinyNextStep'
  | 'twoMinutesLeft'
  | 'timeUp'
  | 'caught'
  | 'done'
  | 'notFinished'
  | 'thoughtParked'
  | 'releasedEarly';

/** Cue names from the sound package; a cue's haptic pattern carries the same name. */
export type SessionCue =
  | 'start-burst'
  | 'park-a-thought'
  | 'nudge'
  | 'shrink'
  | 'two-minutes-left'
  | 'hold-rising'
  | 'finish'
  | 'quiet-finish';

/** Instructions for the app. This package performs none of them. */
export type SessionEffect =
  | { readonly kind: 'start_timer'; readonly until: Instant }
  | { readonly kind: 'cancel_timer' }
  | { readonly kind: 'schedule_warning'; readonly at: Instant }
  | { readonly kind: 'schedule_check_in'; readonly at: Instant }
  | { readonly kind: 'show_line'; readonly line: SessionLine }
  | { readonly kind: 'play_cue'; readonly cue: SessionCue }
  | { readonly kind: 'stop_cue'; readonly cue: SessionCue }
  | { readonly kind: 'haptic'; readonly pattern: SessionCue }
  | { readonly kind: 'show_burst'; readonly burst: 'start' | 'confetti' }
  | { readonly kind: 'start_live_activity'; readonly until: Instant }
  | { readonly kind: 'end_live_activity' }
  | { readonly kind: 'grant_start_reward'; readonly taskId: Id; readonly tone: SessionTone }
  | { readonly kind: 'grant_finish_reward'; readonly taskId: Id; readonly tone: SessionTone }
  | { readonly kind: 'hand_over_treat'; readonly treat: string }
  | { readonly kind: 'save_parked_thought'; readonly thought: ParkedThought }
  | { readonly kind: 'show_parked_thoughts'; readonly thoughts: readonly ParkedThought[] }
  | {
      readonly kind: 'record_session_end';
      readonly outcome: 'finished' | 'not_finished' | 'left_early';
      readonly finishMethod: FinishMethod | null;
      readonly notFinishedChoice: 'carry_on' | 'make_smaller' | null;
      readonly endedAt: Instant;
    }
  | { readonly kind: 'shrink_task'; readonly taskId: Id }
  | { readonly kind: 'carry_task_to_tomorrow'; readonly taskId: Id }
  /** Delete the task, its monster and its sessions. Nothing about it is kept. */
  | { readonly kind: 'forget_task'; readonly taskId: Id };

export interface SessionStep {
  readonly state: SessionState;
  readonly effects: readonly SessionEffect[];
}
